"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import {
    api,
    type Tick, type Website, type Incident,
    type MaintenanceWindow, type AlertSetting,
} from "../../../lib/api";
import { getToken } from "../../../lib/auth";
import { Navbar } from "../../../components/Navbar";
import { StatusBadge } from "../../../components/StatusBadge";
import { ResponseTimeChart } from "../../../components/ResponseTimeChart";
import { UptimeBars } from "../../../components/UptimeBars";

function uptimePercent(ticks: Tick[]): string {
    if (ticks.length === 0) return "—";
    const up = ticks.filter(t => t.status === "Up").length;
    return ((up / ticks.length) * 100).toFixed(1) + "%";
}

function avgResponseTime(ticks: Tick[]): string {
    const upTicks = ticks.filter(t => t.status === "Up");
    if (upTicks.length === 0) return "—";
    const avg = upTicks.reduce((sum, t) => sum + t.response_time_ms, 0) / upTicks.length;
    return Math.round(avg) + "ms";
}

function responseClass(ms: number): string {
    if (ms < 300) return "text-emerald-400";
    if (ms < 800) return "text-yellow-400";
    return "text-red-400";
}

function formatDuration(start: string, end: string | null): string {
    const ms = (end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime();
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
}

function sslDaysLeft(expiresAt: string | null): number | null {
    if (!expiresAt) return null;
    return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
}

const CHECK_INTERVALS = [
    { value: 30, label: "30 seconds" },
    { value: 60, label: "1 minute" },
    { value: 120, label: "2 minutes" },
    { value: 300, label: "5 minutes" },
    { value: 600, label: "10 minutes" },
];

function StatCard({ label, value, sub, valueClass = "" }: {
    label: string; value: string; sub: string; valueClass?: string;
}) {
    return (
        <div>
            <p className="text-xs text-slate-500 font-medium mb-1">{label}</p>
            <p className={`text-xl font-bold text-white ${valueClass}`}>{value}</p>
            {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
        </div>
    );
}

function SslBadge({ expiresAt }: { expiresAt: string | null }) {
    const days = sslDaysLeft(expiresAt);
    if (days === null) return null;
    const color = days > 30 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
        : days > 7 ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
        : "bg-red-500/15 text-red-400 border-red-500/25";
    return (
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${color}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            SSL {days > 0 ? `${days}d` : "expired"}
        </span>
    );
}

function DisplayNameEditor({ website, onSaved }: { website: Website; onSaved: () => void }) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(website.display_name ?? "");
    const [saving, setSaving] = useState(false);

    async function save() {
        const trimmed = value.trim();
        setSaving(true);
        try {
            await api.updateWebsite(website.id, { display_name: trimmed || null });
            onSaved();
        } finally {
            setSaving(false);
            setEditing(false);
        }
    }

    if (!editing) {
        return (
            <button
                onClick={() => { setValue(website.display_name ?? ""); setEditing(true); }}
                className="group flex items-center gap-1.5 text-left"
            >
                <h1 className="text-base font-semibold text-white truncate">
                    {website.display_name || website.url}
                </h1>
                <svg className="opacity-0 group-hover:opacity-60 transition-opacity text-slate-400 shrink-0" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
            </button>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <input
                autoFocus
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
                placeholder={website.url}
                className="dark-input text-base font-semibold min-w-0 flex-1 py-0.5"
            />
            <button onClick={save} disabled={saving} className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded-lg hover:bg-emerald-500/10 transition">
                {saving ? "…" : "Save"}
            </button>
            <button onClick={() => setEditing(false)} className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 rounded-lg hover:bg-white/[0.06] transition">Cancel</button>
        </div>
    );
}

function AlertSettingsSection({ websiteId }: { websiteId: string }) {
    const { data, mutate } = useSWR<AlertSetting | null>(`alerts-${websiteId}`, () => api.getAlertSetting(websiteId));
    const [emailEnabled, setEmailEnabled] = useState(false);
    const [alertOnDown, setAlertOnDown] = useState(true);
    const [alertOnRecovery, setAlertOnRecovery] = useState(true);
    const [webhookUrl, setWebhookUrl] = useState("");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (data) {
            setEmailEnabled(data.email_enabled);
            setAlertOnDown(data.alert_on_down);
            setAlertOnRecovery(data.alert_on_recovery);
            setWebhookUrl(data.webhook_url ?? "");
        }
    }, [data]);

    async function handleSave() {
        setSaving(true);
        setSaved(false);
        try {
            await api.saveAlertSetting(websiteId, {
                email_enabled: emailEnabled,
                alert_on_down: alertOnDown,
                alert_on_recovery: alertOnRecovery,
                webhook_url: webhookUrl.trim() || null,
            });
            await mutate();
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="glass rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-300">Alert settings</h2>

            <div className="space-y-3">
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <span className="text-sm text-slate-300">Email alerts</span>
                    <button
                        role="switch"
                        aria-checked={emailEnabled}
                        aria-label="Email alerts"
                        onClick={() => setEmailEnabled(v => !v)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${emailEnabled ? "bg-emerald-500" : "bg-white/[0.12]"}`}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${emailEnabled ? "translate-x-6" : "translate-x-0"}`} />
                    </button>
                </label>

                {emailEnabled && (
                    <div className="pl-4 border-l-2 border-white/[0.08] space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-400">
                            <input type="checkbox" checked={alertOnDown} onChange={e => setAlertOnDown(e.target.checked)} className="accent-emerald-500 w-4 h-4 cursor-pointer" />
                            Alert on down
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-400">
                            <input type="checkbox" checked={alertOnRecovery} onChange={e => setAlertOnRecovery(e.target.checked)} className="accent-emerald-500 w-4 h-4 cursor-pointer" />
                            Alert on recovery
                        </label>
                    </div>
                )}

                <div>
                    <label className="block text-sm text-slate-400 mb-1">Webhook URL <span className="text-slate-500 text-xs">(optional, Slack-compatible)</span></label>
                    <input
                        type="url"
                        value={webhookUrl}
                        onChange={e => setWebhookUrl(e.target.value)}
                        placeholder="https://hooks.slack.com/…"
                        className="dark-input font-mono"
                    />
                </div>
            </div>

            <button
                onClick={handleSave}
                disabled={saving}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 disabled:text-emerald-600 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20"
            >
                {saving ? "Saving…" : saved ? "Saved!" : "Save alerts"}
            </button>
        </div>
    );
}

function MaintenanceSection({ websiteId }: { websiteId: string }) {
    const { data: windows, mutate } = useSWR<MaintenanceWindow[]>(`mw-${websiteId}`, () => api.getMaintenanceWindows(websiteId));
    const [startsAt, setStartsAt] = useState("");
    const [endsAt, setEndsAt] = useState("");
    const [label, setLabel] = useState("");
    const [adding, setAdding] = useState(false);
    const [showForm, setShowForm] = useState(false);

    async function handleAdd() {
        if (!startsAt || !endsAt) return;
        setAdding(true);
        try {
            await api.addMaintenanceWindow(websiteId, {
                starts_at: new Date(startsAt).toISOString(),
                ends_at: new Date(endsAt).toISOString(),
                label: label.trim() || undefined,
            });
            await mutate();
            setStartsAt(""); setEndsAt(""); setLabel(""); setShowForm(false);
        } finally {
            setAdding(false);
        }
    }

    async function handleDelete(windowId: string) {
        await api.deleteMaintenanceWindow(windowId);
        await mutate();
    }

    const now = new Date().toISOString().slice(0, 16);

    return (
        <div className="glass rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-300">Maintenance windows</h2>
                <button
                    onClick={() => setShowForm(v => !v)}
                    className="text-xs font-medium text-emerald-400 hover:text-emerald-300 px-2.5 py-1 rounded-lg hover:bg-emerald-500/10 transition"
                >
                    {showForm ? "Cancel" : "+ Add window"}
                </button>
            </div>

            {showForm && (
                <div className="space-y-3 p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-slate-500 font-medium mb-1">Starts at</label>
                            <input type="datetime-local" value={startsAt} min={now} onChange={e => setStartsAt(e.target.value)}
                                className="dark-input" />
                            <p className="text-[10px] text-slate-500 mt-0.5">Your local time</p>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 font-medium mb-1">Ends at</label>
                            <input type="datetime-local" value={endsAt} min={startsAt || now} onChange={e => setEndsAt(e.target.value)}
                                className="dark-input" />
                            <p className="text-[10px] text-slate-500 mt-0.5">Your local time</p>
                        </div>
                    </div>
                    <input
                        type="text"
                        value={label}
                        onChange={e => setLabel(e.target.value)}
                        placeholder="Label (optional)"
                        className="dark-input"
                    />
                    <button
                        onClick={handleAdd}
                        disabled={adding || !startsAt || !endsAt}
                        className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 disabled:text-emerald-600 text-white rounded-lg px-4 py-1.5 text-sm font-semibold transition-all"
                    >
                        {adding ? "Adding…" : "Add window"}
                    </button>
                </div>
            )}

            {windows && windows.length > 0 ? (
                <div className="space-y-2">
                    {windows.map(w => {
                        const isActive = new Date(w.starts_at) <= new Date() && new Date(w.ends_at) >= new Date();
                        const isPast = new Date(w.ends_at) < new Date();
                        return (
                            <div key={w.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                                <div className="text-sm text-slate-300 min-w-0">
                                    {w.label && <p className="font-medium truncate">{w.label}</p>}
                                    <p className="text-xs text-slate-500">
                                        {new Date(w.starts_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                        {" — "}
                                        {new Date(w.ends_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {isActive && <span className="text-xs bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full font-medium">Active</span>}
                                    {isPast && <span className="text-xs bg-white/[0.06] text-slate-400 px-2 py-0.5 rounded-full font-medium">Past</span>}
                                    {!isPast && (
                                        <button
                                            onClick={() => handleDelete(w.id)}
                                            className="text-slate-600 hover:text-red-400 transition-colors p-0.5"
                                            aria-label="Delete maintenance window"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                !showForm && <p className="text-xs text-slate-500">No maintenance windows scheduled.</p>
            )}
        </div>
    );
}

const PAGE_SIZE = 10;

function Paginator({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-center gap-1 px-6 py-3 border-t border-white/[0.06]">
            <button
                onClick={() => onChange(page - 1)}
                disabled={page === 1}
                className="px-2.5 py-1 text-xs rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
                ←
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                    key={p}
                    onClick={() => onChange(p)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
                        p === page
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "text-slate-500 hover:text-white hover:bg-white/[0.06]"
                    }`}
                >
                    {p}
                </button>
            ))}
            <button
                onClick={() => onChange(page + 1)}
                disabled={page === totalPages}
                className="px-2.5 py-1 text-xs rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
                →
            </button>
        </div>
    );
}

function IncidentTimeline({ websiteId }: { websiteId: string }) {
    const { data: incidents } = useSWR<Incident[]>(`incidents-${websiteId}`, () => api.getIncidents(websiteId), { refreshInterval: 600_000 });
    const [page, setPage] = useState(1);

    if (!incidents || incidents.length === 0) return null;

    const open = incidents.filter(i => !i.resolved_at);
    const resolved = incidents.filter(i => i.resolved_at);
    const all = [...open, ...resolved];
    const totalPages = Math.ceil(all.length / PAGE_SIZE);
    const visible = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <div className="glass rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-300">Incident history</h2>
                <span className="text-xs text-slate-500">{all.length} total</span>
            </div>
            <div className="divide-y divide-white/[0.04]">
                {visible.map(i => i.resolved_at ? (
                    <div key={i.id} className="px-6 py-4 flex items-start justify-between gap-4">
                        <div>
                            <p className="text-sm font-medium text-slate-300">{i.cause ?? "Down"}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {new Date(i.started_at).toLocaleDateString()} · resolved after {formatDuration(i.started_at, i.resolved_at)}
                            </p>
                        </div>
                        <span className="text-xs bg-emerald-500/15 text-emerald-400 rounded-full px-2 py-0.5 font-medium whitespace-nowrap shrink-0">Resolved</span>
                    </div>
                ) : (
                    <div key={i.id} className="px-6 py-4 flex items-start justify-between gap-4 bg-red-500/[0.06]">
                        <div>
                            <p className="text-sm font-medium text-red-400">{i.cause ?? "Down"}</p>
                            <p className="text-xs text-red-500/70 mt-0.5">Started {new Date(i.started_at).toLocaleString()} · ongoing {formatDuration(i.started_at, null)}</p>
                        </div>
                        <span className="text-xs bg-red-500/15 text-red-400 rounded-full px-2 py-0.5 font-medium whitespace-nowrap shrink-0">Ongoing</span>
                    </div>
                ))}
            </div>
            <Paginator page={page} totalPages={totalPages} onChange={setPage} />
        </div>
    );
}

function MonitorSettingsSection({ website, onSaved }: { website: Website; onSaved: () => void }) {
    const [interval, setInterval] = useState(website.check_interval_sec);
    const [keyword, setKeyword] = useState(website.keyword_monitor ?? "");
    const [sslEnabled, setSslEnabled] = useState(website.ssl_monitor_enabled);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    async function handleSave() {
        setSaving(true);
        setSaved(false);
        try {
            await api.updateWebsite(website.id, {
                check_interval_sec: interval,
                keyword_monitor: keyword.trim() || null,
                ssl_monitor_enabled: sslEnabled,
            });
            onSaved();
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="glass rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-300">Monitor settings</h2>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Check interval</label>
                    <select
                        value={interval}
                        onChange={e => setInterval(Number(e.target.value))}
                        className="dark-input w-auto"
                    >
                        {CHECK_INTERVALS.map(opt => (
                            <option key={opt.value} value={opt.value} className="bg-[#0d1526]">{opt.label}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Keyword monitor</label>
                    <input
                        type="text"
                        value={keyword}
                        onChange={e => setKeyword(e.target.value)}
                        placeholder="present:healthy  or  absent:error"
                        className="dark-input font-mono"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        Format: <code className="bg-white/[0.06] px-1 rounded text-slate-300">present:keyword</code> (alert if missing) or <code className="bg-white/[0.06] px-1 rounded text-slate-300">absent:keyword</code> (alert if present)
                    </p>
                </div>

                <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <div>
                        <p className="text-sm text-slate-300">SSL certificate monitoring</p>
                        <p className="text-xs text-slate-500">Alert when cert expires within 14 days</p>
                    </div>
                    <button
                        role="switch"
                        aria-checked={sslEnabled}
                        aria-label="SSL certificate monitoring"
                        onClick={() => setSslEnabled(v => !v)}
                        className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${sslEnabled ? "bg-emerald-500" : "bg-white/[0.12]"}`}
                    >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${sslEnabled ? "translate-x-6" : "translate-x-0"}`} />
                    </button>
                </label>
            </div>

            <button
                onClick={handleSave}
                disabled={saving}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 disabled:text-emerald-600 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20"
            >
                {saving ? "Saving…" : saved ? "Saved!" : "Save settings"}
            </button>
        </div>
    );
}

function StatusPageSection({ website, onSaved }: { website: Website; onSaved: () => void }) {
    const [loading, setLoading] = useState(false);
    const slug = website.public_slug;
    const publicUrl = slug ? `${window.location.origin}/status/${slug}` : null;

    async function enable() {
        setLoading(true);
        try {
            await api.enableStatusPage(website.id);
            onSaved();
        } finally {
            setLoading(false);
        }
    }

    async function disable() {
        setLoading(true);
        try {
            await api.disableStatusPage(website.id);
            onSaved();
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="glass rounded-2xl p-5 space-y-3">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h2 className="text-sm font-semibold text-slate-300">Public status page</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Share a public URL showing uptime and incidents — no login required.</p>
                </div>
                {slug ? (
                    <button
                        onClick={disable}
                        disabled={loading}
                        className="text-xs font-medium text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition shrink-0"
                    >
                        {loading ? "…" : "Disable"}
                    </button>
                ) : (
                    <button
                        onClick={enable}
                        disabled={loading}
                        className="text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 text-white px-3 py-1.5 rounded-lg transition shrink-0 shadow-lg shadow-emerald-500/20"
                    >
                        {loading ? "…" : "Enable"}
                    </button>
                )}
            </div>
            {publicUrl && (
                <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2">
                    <a
                        href={publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-mono truncate flex-1"
                    >
                        {publicUrl}
                    </a>
                    <button
                        onClick={() => navigator.clipboard.writeText(publicUrl)}
                        className="text-slate-600 hover:text-slate-300 transition-colors shrink-0"
                        title="Copy link"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
}

function HistoryTable({ ticks }: { ticks: Tick[] }) {
    const [page, setPage] = useState(1);
    const totalPages = Math.ceil(ticks.length / PAGE_SIZE);
    const visible = ticks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <div className="glass rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-300">Check history</h2>
                <span className="text-xs text-slate-500">{ticks.length} checks</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-white/[0.03]">
                        <tr className="text-xs text-slate-500">
                            <th className="text-left px-6 py-3 font-medium">Time</th>
                            <th className="text-left px-6 py-3 font-medium">Status</th>
                            <th className="text-right px-6 py-3 font-medium">Response</th>
                            <th className="text-left px-6 py-3 font-medium">Region</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                        {visible.map(tick => (
                            <tr key={tick.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-6 py-3 text-slate-500 text-xs whitespace-nowrap">
                                    {new Date(tick.createdAt).toLocaleString([], {
                                        month: "short", day: "numeric",
                                        hour: "2-digit", minute: "2-digit"
                                    })}
                                </td>
                                <td className="px-6 py-3">
                                    <StatusBadge status={tick.status} />
                                </td>
                                <td className={`px-6 py-3 font-mono text-xs font-medium text-right ${responseClass(tick.response_time_ms)}`}>
                                    {tick.response_time_ms}ms
                                </td>
                                <td className="px-6 py-3 text-xs text-slate-500 font-mono">
                                    {tick.region_id.slice(0, 8)}…
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Paginator page={page} totalPages={totalPages} onChange={setPage} />
        </div>
    );
}

export default function WebsiteDetail() {
    const params = useParams();
    const router = useRouter();
    const websiteId = params.websiteId as string;
    const [authChecked, setAuthChecked] = useState(false);

    useEffect(() => {
        if (!getToken()) {
            router.push("/signin");
        } else {
            setAuthChecked(true);
        }
    }, [router]);

    const { data: website, isLoading: loadingMeta, mutate: mutateWebsite } = useSWR<Website>(
        `website-${websiteId}`,
        () => api.getWebsite(websiteId),
        { refreshInterval: 600_000 }
    );

    const { data: ticks, isLoading: loadingTicks } = useSWR<Tick[]>(
        `history-${websiteId}`,
        () => api.getWebsiteHistory(websiteId),
        { refreshInterval: 600_000 }
    );

    const loading = loadingMeta || loadingTicks;
    const status = website?.latestTick?.status ?? "Unknown";
    const latestMs = website?.latestTick?.response_time_ms;
    const [activeTab, setActiveTab] = useState<"overview" | "settings">("overview");

    if (!authChecked) return null;

    return (
        <div className="min-h-screen bg-[var(--theme-bg)]">
            <Navbar />

            <main className="mx-auto max-w-4xl px-4 py-8 space-y-5">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors font-medium"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    Dashboard
                </Link>

                {loading && (
                    <div className="space-y-4">
                        <div className="glass rounded-2xl p-6">
                            <div className="skeleton h-5 w-1/2 rounded-full mb-4" />
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-white/[0.06]">
                                {[1,2,3].map(i => <div key={i} className="skeleton h-8 rounded-xl" />)}
                            </div>
                        </div>
                    </div>
                )}

                {!loading && website && (
                    <>
                        <div className="glass rounded-2xl p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mb-1">Monitoring</p>
                                    <DisplayNameEditor website={website} onSaved={() => mutateWebsite()} />
                                    {website.display_name && (
                                        <p className="text-xs text-slate-500 mt-0.5 truncate">{website.url}</p>
                                    )}
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        <SslBadge expiresAt={website.ssl_expires_at} />
                                        {website.keyword_monitor && (
                                            <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25">
                                                keyword
                                            </span>
                                        )}
                                        {website.public_slug && (
                                            <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/25">
                                                public page
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <StatusBadge status={status} />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-px bg-white/[0.06] rounded-xl overflow-hidden">
                            <div className="bg-[var(--theme-bg)] px-4 py-3">
                                <p className="text-[11px] text-slate-500 mb-0.5">Uptime</p>
                                <p className="text-xl font-bold text-white tabular-nums">{ticks ? uptimePercent(ticks) : "—"}</p>
                                <p className="text-[11px] text-slate-500">last 50 checks</p>
                            </div>
                            <div className="bg-[var(--theme-bg)] px-4 py-3">
                                <p className="text-[11px] text-slate-500 mb-0.5">Avg response</p>
                                <p className={`text-xl font-bold tabular-nums ${latestMs ? responseClass(latestMs) : "text-white"}`}>
                                    {ticks ? avgResponseTime(ticks) : "—"}
                                </p>
                                <p className="text-[11px] text-slate-500">when up</p>
                            </div>
                            <div className="bg-[var(--theme-bg)] px-4 py-3">
                                <p className="text-[11px] text-slate-500 mb-0.5">Last check</p>
                                <p className="text-xl font-bold text-white tabular-nums">
                                    {website.latestTick
                                        ? new Date(website.latestTick.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                        : "Never"}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                    {website.latestTick ? new Date(website.latestTick.createdAt).toLocaleDateString() : ""}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-0 border-b border-white/[0.06] -mb-px">
                            {(["overview", "settings"] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2.5 text-sm font-medium capitalize transition-all border-b-2 -mb-px ${
                                        activeTab === tab
                                            ? "border-emerald-400 text-white"
                                            : "border-transparent text-slate-400 hover:text-slate-200 hover:border-white/20"
                                    }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {activeTab === "overview" && (
                            <>
                                {ticks && ticks.length > 0 && (
                                    <>
                                        <div className="glass rounded-2xl px-5 py-4 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-medium text-slate-400">Last 50 checks</span>
                                                <span className="text-xs text-slate-500">{uptimePercent(ticks)} uptime</span>
                                            </div>
                                            <UptimeBars ticks={ticks} />
                                        </div>

                                        <div className="glass rounded-2xl p-5">
                                            <h2 className="text-sm font-medium text-slate-400 mb-4">Response time</h2>
                                            <ResponseTimeChart ticks={ticks} />
                                        </div>
                                    </>
                                )}

                                <IncidentTimeline websiteId={websiteId} />

                                {ticks && ticks.length > 0 && (
                                    <HistoryTable ticks={ticks} />
                                )}

                                {ticks?.length === 0 && (
                                    <div className="glass border-dashed rounded-2xl p-16 text-center">
                                        <p className="text-slate-400 text-sm">No checks recorded yet.</p>
                                        <p className="text-slate-500 text-xs mt-1">The worker will check this site shortly.</p>
                                    </div>
                                )}
                            </>
                        )}

                        {activeTab === "settings" && (
                            <div className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <AlertSettingsSection websiteId={websiteId} />
                                    <MonitorSettingsSection website={website} onSaved={() => mutateWebsite()} />
                                </div>
                                <StatusPageSection website={website} onSaved={() => mutateWebsite()} />
                                <MaintenanceSection websiteId={websiteId} />
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
