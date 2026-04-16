import { getToken, setToken, setRefreshToken, getRefreshToken } from "./auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

async function doRefresh(): Promise<string | null> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;
    try {
        const res = await fetch(`${BASE_URL}/user/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!res.ok) return null;
        const data = await res.json() as { jwt: string; refresh_token: string };
        setToken(data.jwt);
        setRefreshToken(data.refresh_token);
        return data.jwt;
    } catch {
        return null;
    }
}

async function apiFetch<T>(path: string, init?: RequestInit, _retry = true): Promise<T> {
    const token = getToken();
    const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: token } : {}),
        ...init?.headers,
    };

    const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

    if (res.status === 401 && _retry) {
        // Token expired — try to refresh once
        let newToken: string | null;
        if (isRefreshing) {
            newToken = await new Promise<string | null>(resolve => { refreshQueue.push(resolve); });
        } else {
            isRefreshing = true;
            newToken = await doRefresh();
            refreshQueue.forEach(fn => fn(newToken));
            refreshQueue = [];
            isRefreshing = false;
        }
        if (newToken) return apiFetch<T>(path, init, false);
    }

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? `Request failed: ${res.status}`);
    }

    return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type WebsiteStatus = "Up" | "Down" | "Unknown" | "keyword_failed";

export type Tick = {
    id: string;
    status: WebsiteStatus;
    response_time_ms: number;
    region_id: string;
    createdAt: string;
};

export type Website = {
    id: string;
    url: string;
    display_name: string | null;
    time_added: string;
    check_interval_sec: number;
    ssl_monitor_enabled: boolean;
    ssl_expires_at: string | null;
    public_slug: string | null;
    keyword_monitor: string | null;
    latestTick: Tick | null;
};

export type Incident = {
    id: string;
    website_id: string;
    started_at: string;
    resolved_at: string | null;
    cause: string | null;
};

export type MaintenanceWindow = {
    id: string;
    website_id: string;
    starts_at: string;
    ends_at: string;
    label: string | null;
};

export type AlertSetting = {
    id: string;
    website_id: string;
    email_enabled: boolean;
    webhook_url: string | null;
    alert_on_down: boolean;
    alert_on_recovery: boolean;
};

export type UserProfile = {
    id: string;
    username: string;
    email: string | null;
};

export type ImportResult = {
    imported: number;
    skipped: number;
};

// ─── API calls ────────────────────────────────────────────────────────────────

export const api = {
    // Auth
    signup(username: string, password: string) {
        return apiFetch<{ id: string }>("/user/signup", {
            method: "POST",
            body: JSON.stringify({ username, password }),
        });
    },

    signin(username: string, password: string) {
        return apiFetch<{ jwt: string; refresh_token: string }>("/user/signin", {
            method: "POST",
            body: JSON.stringify({ username, password }),
        });
    },

    // User profile
    getMe() {
        return apiFetch<UserProfile>("/user/me");
    },

    updateEmail(email: string) {
        return apiFetch<UserProfile>("/user/me", {
            method: "PATCH",
            body: JSON.stringify({ email }),
        });
    },

    // Websites
    listWebsites() {
        return apiFetch<Website[]>("/websites");
    },

    addWebsite(url: string) {
        return apiFetch<{ id: string }>("/website", {
            method: "POST",
            body: JSON.stringify({ url }),
        });
    },

    updateWebsite(id: string, data: {
        display_name?: string | null;
        check_interval_sec?: number;
        keyword_monitor?: string | null;
        ssl_monitor_enabled?: boolean;
    }) {
        return apiFetch<Website>(`/website/${id}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        });
    },

    deleteWebsite(id: string) {
        return apiFetch<{ message: string }>(`/website/${id}`, {
            method: "DELETE",
        });
    },

    getWebsiteHistory(websiteId: string) {
        return apiFetch<Tick[]>(`/status/${websiteId}/history`);
    },

    getWebsite(websiteId: string) {
        return apiFetch<Website>(`/status/${websiteId}`);
    },

    // Incidents
    getIncidents(websiteId: string) {
        return apiFetch<Incident[]>(`/website/${websiteId}/incidents`);
    },

    // Alert settings
    getAlertSetting(websiteId: string) {
        return apiFetch<AlertSetting | null>(`/website/${websiteId}/alerts`);
    },

    saveAlertSetting(websiteId: string, data: Partial<AlertSetting>) {
        return apiFetch<AlertSetting>(`/website/${websiteId}/alerts`, {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    // Maintenance windows
    getMaintenanceWindows(websiteId: string) {
        return apiFetch<MaintenanceWindow[]>(`/website/${websiteId}/maintenance`);
    },

    addMaintenanceWindow(websiteId: string, data: { starts_at: string; ends_at: string; label?: string }) {
        return apiFetch<MaintenanceWindow>(`/website/${websiteId}/maintenance`, {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    deleteMaintenanceWindow(windowId: string) {
        return apiFetch<{ message: string }>(`/maintenance/${windowId}`, {
            method: "DELETE",
        });
    },

    // Public status page
    enableStatusPage(websiteId: string) {
        return apiFetch<{ id: string; public_slug: string }>(`/website/${websiteId}/status-page`, {
            method: "POST",
        });
    },

    disableStatusPage(websiteId: string) {
        return apiFetch<{ message: string }>(`/website/${websiteId}/status-page`, {
            method: "DELETE",
        });
    },

    // Import
    importCsv(rows: Array<{ url: string; display_name?: string; check_interval_sec?: number }>) {
        return apiFetch<ImportResult>("/import/csv", {
            method: "POST",
            body: JSON.stringify({ rows }),
        });
    },

    importUptimeRobot(api_key: string) {
        return apiFetch<ImportResult>("/import/uptimerobot", {
            method: "POST",
            body: JSON.stringify({ api_key }),
        });
    },
};
