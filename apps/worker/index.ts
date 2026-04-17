import "dotenv/config";
import axios from "axios";
import tls from "tls";
import { Resend } from "resend";
import { xAckBulk, xReadGroup, ensureConsumerGroup, kvSet, kvGet } from "redisstream/client";
import { prismaClient } from "store/client";

const REGION_ID = process.env.REGION_ID!;
const WORKER_ID = process.env.WORKER_ID!;

if (!REGION_ID) throw new Error("REGION_ID not provided");
if (!WORKER_ID) throw new Error("WORKER_ID not provided");

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const ALERT_COOLDOWN_SEC = 10 * 60; // 10 minutes

// SSL check cooldown: websiteId → last SSL check timestamp
const sslLastChecked = new Map<string, number>();
const SSL_CHECK_INTERVAL_MS = 20 * 60 * 60 * 1000; // 20 hours

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function isInMaintenanceWindow(websiteId: string): Promise<boolean> {
    const now = new Date();
    const count = await prismaClient.maintenance_window.count({
        where: {
            website_id: websiteId,
            starts_at: { lte: now },
            ends_at: { gte: now },
        }
    });
    return count > 0;
}

async function sendSslExpiryAlert(websiteId: string, websiteUrl: string, displayName: string, daysLeft: number) {
    if (!resend) return;
    const user = await prismaClient.user.findFirst({
        where: { websites: { some: { id: websiteId } } },
        select: { email: true }
    });
    if (!user?.email) return;

    const cooldownKey = `ssl_alert_cooldown:${websiteId}`;
    const coolingDown = await kvGet(cooldownKey);
    if (coolingDown) return;
    await kvSet(cooldownKey, "1", 24 * 60 * 60); // 24h cooldown for SSL alerts

    await resend.emails.send({
        from: process.env.RESEND_FROM ?? "BetterUptime <onboarding@resend.dev>",
        to: user.email,
        subject: `[BetterUptime] SSL certificate for ${displayName} expires in ${daysLeft} days`,
        text: `The SSL certificate for ${displayName} (${websiteUrl}) will expire in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}. Please renew it to avoid browser warnings.`,
    }).catch(err => console.error("SSL alert email failed:", err));
}

async function sendEmailAlert(to: string, websiteUrl: string, displayName: string, status: "Down" | "Up") {
    if (!resend) return;
    const subject = status === "Down"
        ? `[BetterUptime] ${displayName} is DOWN`
        : `[BetterUptime] ${displayName} is back UP`;
    const text = status === "Down"
        ? `Your website ${displayName} (${websiteUrl}) is not responding. We'll notify you when it recovers.`
        : `Your website ${displayName} (${websiteUrl}) has recovered and is now responding normally.`;

    await resend.emails.send({
        from: process.env.RESEND_FROM ?? "BetterUptime <onboarding@resend.dev>",
        to,
        subject,
        text,
    }).catch(err => console.error("Email send failed:", err));
}

async function sendWebhookAlert(webhookUrl: string, payload: object) {
    const body = webhookUrl.includes("hooks.slack.com")
        ? { text: JSON.stringify(payload, null, 2) }
        : payload;

    await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    }).catch(err => console.error("Webhook send failed:", err));
}

async function triggerAlerts(
    websiteId: string,
    websiteUrl: string,
    displayName: string,
    status: "Down" | "Up",
    incidentId?: string,
) {
    if (await isInMaintenanceWindow(websiteId)) return;

    const cooldownKey = `alert_cooldown:${websiteId}`;
    const coolingDown = await kvGet(cooldownKey);
    if (coolingDown) return;

    const setting = await prismaClient.alert_setting.findUnique({ where: { website_id: websiteId } });
    if (!setting) return;

    const shouldAlert = (status === "Down" && setting.alert_on_down) || (status === "Up" && setting.alert_on_recovery);
    if (!shouldAlert) return;

    await kvSet(cooldownKey, "1", ALERT_COOLDOWN_SEC);

    const user = await prismaClient.user.findFirst({
        where: { websites: { some: { id: websiteId } } },
        select: { email: true }
    });

    if (setting.email_enabled && user?.email) {
        await sendEmailAlert(user.email, websiteUrl, displayName, status);
    }

    if (setting.webhook_url) {
        await sendWebhookAlert(setting.webhook_url, {
            website_id: websiteId,
            url: websiteUrl,
            display_name: displayName,
            status,
            timestamp: new Date().toISOString(),
            incident_id: incidentId ?? null,
        });
    }
}

function checkKeyword(body: string, keywordMonitor: string): boolean {
    // Format: "present:keyword" or "absent:keyword"
    const [mode, ...rest] = keywordMonitor.split(":");
    const keyword = rest.join(":");
    if (mode === "present") return body.includes(keyword);
    if (mode === "absent") return !body.includes(keyword);
    return true;
}

async function getSslExpiry(hostname: string): Promise<Date | null> {
    return new Promise(resolve => {
        const socket = tls.connect({ host: hostname, port: 443, servername: hostname, timeout: 8000 }, () => {
            const cert = socket.getPeerCertificate();
            socket.destroy();
            if (!cert?.valid_to) { resolve(null); return; }
            resolve(new Date(cert.valid_to));
        });
        socket.on("error", () => resolve(null));
        socket.on("timeout", () => { socket.destroy(); resolve(null); });
    });
}

// ─── Main fetch ───────────────────────────────────────────────────────────────

async function fetchWebsite(websiteId: string) {
    const website = await prismaClient.website.findUnique({
        where: { id: websiteId },
        include: { user: { select: { email: true } } }
    });
    if (!website) return;

    const displayName = website.display_name ?? website.url;
    const startTime = Date.now();
    let status: "Up" | "Down" | "keyword_failed" = "Up";
    let responseBody = "";

    try {
        const response = await axios.get(website.url, {
            timeout: 10000,
            maxContentLength: 5 * 1024 * 1024, // 5 MB cap
            maxBodyLength: 5 * 1024 * 1024,
        });
        responseBody = typeof response.data === "string" ? response.data : JSON.stringify(response.data);
    } catch {
        status = "Down";
    }

    // Keyword check (only if HTTP succeeded)
    if (status === "Up" && website.keyword_monitor) {
        const keywordOk = checkKeyword(responseBody, website.keyword_monitor);
        if (!keywordOk) status = "keyword_failed";
    }

    const response_time_ms = Date.now() - startTime;

    // Get previous status
    const lastTick = await prismaClient.website_tick.findFirst({
        where: { website_id: websiteId },
        orderBy: { createdAt: "desc" },
    });
    const prevStatus = lastTick?.status ?? null;

    // Save tick
    await prismaClient.website_tick.create({
        data: { response_time_ms, status, region_id: REGION_ID, website_id: websiteId }
    });

    // Incident + alert logic on status transitions
    const wasUp = prevStatus === "Up" || prevStatus === null;
    const isDown = status === "Down" || status === "keyword_failed";

    if (wasUp && isDown) {
        // Site just went down — open incident
        const incident = await prismaClient.incident.create({
            data: { website_id: websiteId, cause: status === "keyword_failed" ? "Keyword check failed" : "HTTP check failed" }
        });
        await triggerAlerts(websiteId, website.url, displayName, "Down", incident.id);
    } else if ((prevStatus === "Down" || prevStatus === "keyword_failed") && status === "Up") {
        // Site recovered — close open incident
        const openIncident = await prismaClient.incident.findFirst({
            where: { website_id: websiteId, resolved_at: null },
            orderBy: { started_at: "desc" }
        });
        if (openIncident) {
            await prismaClient.incident.update({
                where: { id: openIncident.id },
                data: { resolved_at: new Date() }
            });
        }
        await triggerAlerts(websiteId, website.url, displayName, "Up");
    }

    // SSL check (once per 20h, only for https sites)
    if (website.ssl_monitor_enabled && website.url.startsWith("https://")) {
        const lastSslCheck = sslLastChecked.get(websiteId) ?? 0;
        const shouldCheckSsl = Date.now() - lastSslCheck > SSL_CHECK_INTERVAL_MS;
        if (shouldCheckSsl) {
            sslLastChecked.set(websiteId, Date.now());
            try {
                const hostname = new URL(website.url).hostname;
                const expiry = await getSslExpiry(hostname);
                if (expiry) {
                    await prismaClient.website.update({
                        where: { id: websiteId },
                        data: { ssl_expires_at: expiry }
                    });
                    // Alert if expiring within 14 days
                    const daysUntilExpiry = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    if (daysUntilExpiry < 14) {
                        await sendSslExpiryAlert(websiteId, website.url, displayName, daysUntilExpiry);
                    }
                }
            } catch {
                // Non-fatal — SSL check failure doesn't affect uptime status
            }
        }
    }
}

// ─── Main loop ────────────────────────────────────────────────────────────────

async function main() {
    await ensureConsumerGroup(REGION_ID);

    while (true) {
        const response = await xReadGroup(REGION_ID, WORKER_ID);

        if (!response || response.length === 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
        }

        await Promise.all(response.map(({ message }) => fetchWebsite(message.id)));
        await xAckBulk(REGION_ID, response.map(({ id }) => id));
    }
}

main();
