import "dotenv/config";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import express from "express";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { prismaClient } from "store/client";
import { AuthInput } from "./types";
import { authMiddleware } from "./middleware";

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET env var is required");

const app = express();
app.use(express.json());

const ALLOWED_ORIGINS = new Set(
    (process.env.CORS_ORIGIN ?? "http://localhost:3000").split(",").map(o => o.trim())
);
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.has(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Vary", "Origin");
    if (req.method === "OPTIONS") {
        res.sendStatus(204);
        return;
    }
    next();
});

function normalizeUrl(raw: string): string {
    const trimmed = raw.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
}

const AddWebsiteInput = z.object({ url: z.string().url() });

app.post("/website", authMiddleware, async (req, res) => {
    const parsed = AddWebsiteInput.safeParse({
        url: typeof req.body.url === "string" ? normalizeUrl(req.body.url) : req.body.url,
    });
    if (!parsed.success) {
        res.status(400).json({ message: "A valid URL is required" });
        return;
    }

    const website = await prismaClient.website.create({
        data: {
            url: parsed.data.url,
            time_added: new Date(),
            user_id: req.userId!
        }
    });

    res.json({ id: website.id });
});

app.get("/websites", authMiddleware, async (req, res) => {
    const websites = await prismaClient.website.findMany({
        where: { user_id: req.userId! },
        include: {
            ticks: {
                orderBy: { createdAt: "desc" },
                take: 1
            }
        }
    });

    res.json(websites.map(w => ({
        id: w.id,
        url: w.url,
        display_name: w.display_name,
        check_interval_sec: w.check_interval_sec,
        ssl_monitor_enabled: w.ssl_monitor_enabled,
        ssl_expires_at: w.ssl_expires_at,
        public_slug: w.public_slug,
        keyword_monitor: w.keyword_monitor,
        time_added: w.time_added,
        latestTick: w.ticks[0] ?? null
    })));
});

app.delete("/website/:id", authMiddleware, async (req, res) => {
    const website = await prismaClient.website.findFirst({
        where: { id: req.params.id, user_id: req.userId! }
    });

    if (!website) {
        res.status(404).json({ message: "Not found" });
        return;
    }

    await prismaClient.$transaction([
        prismaClient.website_tick.deleteMany({ where: { website_id: req.params.id } }),
        prismaClient.incident.deleteMany({ where: { website_id: req.params.id } }),
        prismaClient.maintenance_window.deleteMany({ where: { website_id: req.params.id } }),
        prismaClient.alert_setting.deleteMany({ where: { website_id: req.params.id } }),
        prismaClient.website.delete({ where: { id: req.params.id } }),
    ]);

    res.json({ message: "Deleted" });
});

app.get("/status/:websiteId", authMiddleware, async (req, res) => {
    const website = await prismaClient.website.findFirst({
        where: {
            user_id: req.userId!,
            id: req.params.websiteId,
        },
        include: {
            ticks: {
                orderBy: { createdAt: "desc" },
                take: 1
            }
        }
    });

    if (!website) {
        res.status(404).json({ message: "Not found" });
        return;
    }

    res.json({
        id: website.id,
        url: website.url,
        display_name: website.display_name,
        check_interval_sec: website.check_interval_sec,
        ssl_monitor_enabled: website.ssl_monitor_enabled,
        ssl_expires_at: website.ssl_expires_at,
        public_slug: website.public_slug,
        keyword_monitor: website.keyword_monitor,
        time_added: website.time_added,
        latestTick: website.ticks[0] ?? null
    });
});

app.get("/status/:websiteId/history", authMiddleware, async (req, res) => {
    const website = await prismaClient.website.findFirst({
        where: { id: req.params.websiteId, user_id: req.userId! }
    });

    if (!website) {
        res.status(404).json({ message: "Not found" });
        return;
    }

    const ticks = await prismaClient.website_tick.findMany({
        where: { website_id: req.params.websiteId },
        orderBy: { createdAt: "desc" },
        take: 50
    });

    res.json(ticks);
});

app.get("/user/me", authMiddleware, async (req, res) => {
    const user = await prismaClient.user.findUnique({
        where: { id: req.userId! },
        select: { id: true, username: true, email: true }
    });
    if (!user) { res.status(404).json({ message: "Not found" }); return; }
    res.json(user);
});

const UpdateEmailInput = z.object({ email: z.string().email() });

app.patch("/user/me", authMiddleware, async (req, res) => {
    const parsed = UpdateEmailInput.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ message: "Invalid email" }); return; }
    try {
        const user = await prismaClient.user.update({
            where: { id: req.userId! },
            data: { email: parsed.data.email },
            select: { id: true, username: true, email: true }
        });
        res.json(user);
    } catch {
        res.status(409).json({ message: "Email already in use" });
    }
});

const UpdateWebsiteInput = z.object({
    display_name: z.string().max(100).nullable().optional(),
    check_interval_sec: z.coerce.number().int().refine(
        v => ALLOWED_INTERVALS.includes(v as typeof ALLOWED_INTERVALS[number])
    ).optional(),
    keyword_monitor: z.string().max(200).nullable().optional(),
    ssl_monitor_enabled: z.boolean().optional(),
});

app.patch("/website/:id", authMiddleware, async (req, res) => {
    const parsed = UpdateWebsiteInput.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ message: "Invalid input" }); return; }

    const website = await prismaClient.website.findFirst({
        where: { id: req.params.id, user_id: req.userId! }
    });
    if (!website) { res.status(404).json({ message: "Not found" }); return; }

    const updated = await prismaClient.website.update({
        where: { id: req.params.id },
        data: parsed.data
    });
    res.json(updated);
});

const AlertSettingInput = z.object({
    email_enabled: z.boolean().optional(),
    webhook_url: z.string().url().nullable().optional(),
    alert_on_down: z.boolean().optional(),
    alert_on_recovery: z.boolean().optional(),
});

app.get("/website/:id/alerts", authMiddleware, async (req, res) => {
    const website = await prismaClient.website.findFirst({
        where: { id: req.params.id, user_id: req.userId! }
    });
    if (!website) { res.status(404).json({ message: "Not found" }); return; }

    const setting = await prismaClient.alert_setting.findUnique({
        where: { website_id: req.params.id }
    });
    res.json(setting ?? null);
});

app.post("/website/:id/alerts", authMiddleware, async (req, res) => {
    const parsed = AlertSettingInput.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ message: "Invalid input" }); return; }

    const website = await prismaClient.website.findFirst({
        where: { id: req.params.id, user_id: req.userId! }
    });
    if (!website) { res.status(404).json({ message: "Not found" }); return; }

    const setting = await prismaClient.alert_setting.upsert({
        where: { website_id: req.params.id },
        create: { website_id: req.params.id, ...parsed.data },
        update: parsed.data,
    });
    res.json(setting);
});

app.get("/website/:id/incidents", authMiddleware, async (req, res) => {
    const website = await prismaClient.website.findFirst({
        where: { id: req.params.id, user_id: req.userId! }
    });
    if (!website) { res.status(404).json({ message: "Not found" }); return; }

    const incidents = await prismaClient.incident.findMany({
        where: { website_id: req.params.id },
        orderBy: { started_at: "desc" },
        take: 20,
    });
    res.json(incidents);
});

const ALLOWED_INTERVALS = [30, 60, 120, 300, 600] as const;

const MaintenanceInput = z.object({
    starts_at: z.string().datetime(),
    ends_at: z.string().datetime(),
    label: z.string().max(100).optional(),
}).refine(d => new Date(d.ends_at) > new Date(d.starts_at), {
    message: "ends_at must be after starts_at",
    path: ["ends_at"],
});

app.get("/website/:id/maintenance", authMiddleware, async (req, res) => {
    const website = await prismaClient.website.findFirst({
        where: { id: req.params.id, user_id: req.userId! }
    });
    if (!website) { res.status(404).json({ message: "Not found" }); return; }

    const windows = await prismaClient.maintenance_window.findMany({
        where: { website_id: req.params.id },
        orderBy: { starts_at: "asc" },
    });
    res.json(windows);
});

app.post("/website/:id/maintenance", authMiddleware, async (req, res) => {
    const parsed = MaintenanceInput.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ message: "Invalid input" }); return; }

    const website = await prismaClient.website.findFirst({
        where: { id: req.params.id, user_id: req.userId! }
    });
    if (!website) { res.status(404).json({ message: "Not found" }); return; }

    const window = await prismaClient.maintenance_window.create({
        data: {
            website_id: req.params.id,
            starts_at: new Date(parsed.data.starts_at),
            ends_at: new Date(parsed.data.ends_at),
            label: parsed.data.label,
        }
    });
    res.json(window);
});

app.delete("/maintenance/:windowId", authMiddleware, async (req, res) => {
    const window = await prismaClient.maintenance_window.findUnique({
        where: { id: req.params.windowId },
        include: { website: true }
    });
    if (!window || window.website.user_id !== req.userId!) {
        res.status(404).json({ message: "Not found" }); return;
    }
    await prismaClient.maintenance_window.delete({ where: { id: req.params.windowId } });
    res.json({ message: "Deleted" });
});

const { nanoid } = await import("nanoid");

app.post("/website/:id/status-page", authMiddleware, async (req, res) => {
    const website = await prismaClient.website.findFirst({
        where: { id: req.params.id, user_id: req.userId! }
    });
    if (!website) { res.status(404).json({ message: "Not found" }); return; }

    const slug = nanoid(10);
    const updated = await prismaClient.website.update({
        where: { id: req.params.id },
        data: { public_slug: slug },
        select: { id: true, public_slug: true }
    });
    res.json(updated);
});

app.delete("/website/:id/status-page", authMiddleware, async (req, res) => {
    const website = await prismaClient.website.findFirst({
        where: { id: req.params.id, user_id: req.userId! }
    });
    if (!website) { res.status(404).json({ message: "Not found" }); return; }

    await prismaClient.website.update({
        where: { id: req.params.id },
        data: { public_slug: null }
    });
    res.json({ message: "Status page removed" });
});

app.get("/public/status/:slug", async (req, res) => {
    const website = await prismaClient.website.findUnique({
        where: { public_slug: req.params.slug },
        include: {
            ticks: { orderBy: { createdAt: "desc" }, take: 30 },
            incidents: { orderBy: { started_at: "desc" }, take: 10 },
        }
    });
    if (!website) { res.status(404).json({ message: "Not found" }); return; }

    res.json({
        id: website.id,
        display_name: website.display_name ?? website.url,
        url: website.url,
        ticks: website.ticks,
        incidents: website.incidents,
    });
});

const CsvImportInput = z.object({
    rows: z.array(z.object({
        url: z.string().url(),
        display_name: z.string().max(100).optional(),
        check_interval_sec: z.number().int().refine(
            v => ALLOWED_INTERVALS.includes(v as typeof ALLOWED_INTERVALS[number]),
            { message: "check_interval_sec must be one of 30, 60, 120, 300, 600" }
        ).optional(),
    })).min(1).max(500),
});

app.post("/import/csv", authMiddleware, async (req, res) => {
    const normalized = Array.isArray(req.body?.rows)
        ? { rows: req.body.rows.map((r: { url?: string; [k: string]: unknown }) => ({ ...r, url: typeof r.url === "string" ? normalizeUrl(r.url) : r.url })) }
        : req.body;
    const parsed = CsvImportInput.safeParse(normalized);
    if (!parsed.success) { res.status(400).json({ message: "Invalid rows" }); return; }

    const existing = await prismaClient.website.findMany({
        where: { user_id: req.userId! },
        select: { url: true }
    });
    const existingUrls = new Set(existing.map(w => w.url));

    const toCreate = parsed.data.rows.filter(r => !existingUrls.has(r.url));

    await prismaClient.website.createMany({
        data: toCreate.map(r => ({
            url: r.url,
            display_name: r.display_name,
            check_interval_sec: r.check_interval_sec ?? 60,
            user_id: req.userId!,
            time_added: new Date(),
        }))
    });

    res.json({ imported: toCreate.length, skipped: parsed.data.rows.length - toCreate.length });
});

const UptimeRobotImportInput = z.object({ api_key: z.string().min(1) });

app.post("/import/uptimerobot", authMiddleware, async (req, res) => {
    const parsed = UptimeRobotImportInput.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ message: "api_key required" }); return; }

    let monitors: Array<{ url: string; friendly_name: string }> = [];
    try {
        const urRes = await fetch("https://api.uptimerobot.com/v2/getMonitors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ api_key: parsed.data.api_key, format: "json", limit: 50 }),
        });
        const urData = await urRes.json() as { stat: string; monitors?: Array<{ url: string; friendly_name: string }> };
        if (urData.stat !== "ok" || !urData.monitors) {
            res.status(400).json({ message: "UptimeRobot API error — check your API key" }); return;
        }
        monitors = urData.monitors;
    } catch {
        res.status(502).json({ message: "Failed to reach UptimeRobot API" }); return;
    }

    const existing = await prismaClient.website.findMany({
        where: { user_id: req.userId! },
        select: { url: true }
    });
    const existingUrls = new Set(existing.map(w => w.url));
    const toCreate = monitors.filter(m => m.url && !existingUrls.has(m.url));

    await prismaClient.website.createMany({
        data: toCreate.map(m => ({
            url: m.url,
            display_name: m.friendly_name,
            user_id: req.userId!,
            time_added: new Date(),
        }))
    });

    res.json({ imported: toCreate.length, skipped: monitors.length - toCreate.length });
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    message: { message: "Too many attempts, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
});

app.post("/user/signup", authLimiter, async (req, res) => {
    const data = AuthInput.safeParse(req.body);
    if (!data.success) {
        res.status(400).json({ message: "Invalid input" });
        return;
    }

    const hashed = await bcrypt.hash(data.data.password, 10);

    try {
        const user = await prismaClient.user.create({
            data: {
                username: data.data.username,
                password: hashed
            }
        });
        res.json({ id: user.id });
    } catch {
        res.status(409).json({ message: "Username already exists" });
    }
});

app.post("/user/signin", authLimiter, async (req, res) => {
    const data = AuthInput.safeParse(req.body);
    if (!data.success) {
        res.status(400).json({ message: "Invalid input" });
        return;
    }

    const user = await prismaClient.user.findFirst({
        where: { username: data.data.username }
    });

    if (!user) {
        res.status(403).json({ message: "Invalid credentials" });
        return;
    }

    const valid = await bcrypt.compare(data.data.password, user.password);
    if (!valid) {
        res.status(403).json({ message: "Invalid credentials" });
        return;
    }

    const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET!, { expiresIn: "15m" });

    const refreshToken = await prismaClient.refresh_token.create({
        data: {
            user_id: user.id,
            token: crypto.randomUUID(),
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }
    });

    res.json({ jwt: token, refresh_token: refreshToken.token });
});

app.post("/user/refresh", async (req, res) => {
    const { refresh_token: rawToken } = req.body as { refresh_token?: string };
    if (!rawToken) { res.status(400).json({ message: "refresh_token required" }); return; }

    const stored = await prismaClient.refresh_token.findUnique({ where: { token: rawToken } });
    if (!stored || stored.revoked || stored.expires_at < new Date()) {
        res.status(401).json({ message: "Invalid or expired refresh token" });
        return;
    }

    await prismaClient.refresh_token.update({ where: { id: stored.id }, data: { revoked: true } });
    const newRefresh = await prismaClient.refresh_token.create({
        data: {
            user_id: stored.user_id,
            token: crypto.randomUUID(),
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }
    });

    const newJwt = jwt.sign({ sub: stored.user_id }, process.env.JWT_SECRET!, { expiresIn: "15m" });
    res.json({ jwt: newJwt, refresh_token: newRefresh.token });
});

app.listen(process.env.PORT || 3001);
