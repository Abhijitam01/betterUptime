"use client";

import { useState, type FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { api, type Website } from "../../lib/api";

function timeAgo(iso: string): string {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const h = Math.floor(mins / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}
import { getToken } from "../../lib/auth";
import { Navbar } from "../../components/Navbar";
import { WebsiteCard } from "../../components/WebsiteCard";

export default function Dashboard() {
    const router = useRouter();
    const [url, setUrl] = useState("");
    const [addError, setAddError] = useState("");
    const [adding, setAdding] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
    const [authChecked, setAuthChecked] = useState(false);

    useEffect(() => {
        if (!getToken()) {
            router.push("/signin");
        } else {
            setAuthChecked(true);
        }
    }, [router]);

    const { data: websites, error, mutate, isLoading } = useSWR<Website[]>(
        "websites",
        async () => {
            const data = await api.listWebsites();
            setLastRefreshed(new Date());
            return data;
        },
        { refreshInterval: 600_000 }
    );

    async function handleAdd(e: FormEvent) {
        e.preventDefault();
        setAddError("");
        setAdding(true);
        try {
            await api.addWebsite(url);
            setUrl("");
            await mutate();
        } catch (err) {
            setAddError(err instanceof Error ? err.message : "Failed to add website");
        } finally {
            setAdding(false);
        }
    }

    async function handleDelete(id: string) {
        const site = websites?.find(w => w.id === id);
        const name = site?.display_name || site?.url || "this monitor";
        if (!window.confirm(`Remove monitor for ${name}? This cannot be undone.`)) return;
        setDeletingId(id);
        try {
            await api.deleteWebsite(id);
            await mutate();
        } finally {
            setDeletingId(null);
        }
    }

    const upCount   = websites?.filter(w => w.latestTick?.status === "Up").length ?? 0;
    const downCount = websites?.filter(w => w.latestTick?.status === "Down").length ?? 0;
    const total     = websites?.length ?? 0;
    const allUp     = total > 0 && downCount === 0 && upCount === total;

    const tickedSites = websites?.filter(w => w.latestTick !== null) ?? [];
    const avgResponseMs = tickedSites.length > 0
        ? Math.round(tickedSites.reduce((sum, w) => sum + (w.latestTick?.response_time_ms ?? 0), 0) / tickedSites.length)
        : null;
    const overallUptimePct = total > 0
        ? ((upCount / total) * 100).toFixed(0)
        : null;

    const statusOrder: Record<string, number> = { Down: 0, Unknown: 1, Up: 2 };
    const sortedWebsites = [...(websites ?? [])].sort((a, b) =>
        (statusOrder[a.latestTick?.status ?? "Unknown"] ?? 1) - (statusOrder[b.latestTick?.status ?? "Unknown"] ?? 1)
    );

    if (!authChecked) return null;

    return (
        <div className="min-h-screen bg-[var(--theme-bg)]">
            <Navbar />

            <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">

                {/* Summary stats */}
                {total > 0 && (
                    <div className="glass rounded-2xl overflow-hidden">
                        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-white/[0.06]">
                            <div className="px-5 py-4">
                                <p className="text-xs text-slate-500 font-medium mb-1">Monitors</p>
                                <p className="text-2xl font-bold text-white tabular-nums tracking-tight">{total}</p>
                            </div>
                            <div className="px-5 py-4">
                                <p className="text-xs text-slate-500 font-medium mb-1">Status</p>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-2xl font-bold text-emerald-400 tabular-nums tracking-tight">{upCount}</span>
                                    <span className="text-xs text-slate-500">up</span>
                                    {downCount > 0 && (
                                        <>
                                            <span className="text-2xl font-bold text-red-400 tabular-nums tracking-tight">{downCount}</span>
                                            <span className="text-xs text-slate-500">down</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="px-5 py-4">
                                <p className="text-xs text-slate-500 font-medium mb-1">Avg response</p>
                                <p className="text-2xl font-bold text-white tabular-nums tracking-tight font-mono">
                                    {avgResponseMs !== null ? `${avgResponseMs}ms` : "—"}
                                </p>
                            </div>
                            <div className="px-5 py-4">
                                <p className="text-xs text-slate-500 font-medium mb-1">Uptime</p>
                                <p className={`text-2xl font-bold tabular-nums tracking-tight font-mono ${
                                    overallUptimePct === "100" ? "text-emerald-400" : downCount > 0 ? "text-red-400" : "text-white"
                                }`}>
                                    {overallUptimePct !== null ? `${overallUptimePct}%` : "—"}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Status banner */}
                {total > 0 && (
                    <div className={`rounded-2xl px-5 py-4 flex items-center justify-between ${allUp ? "bg-emerald-500/10 border border-emerald-500/25" : downCount > 0 ? "bg-red-500/10 border border-red-500/25" : "bg-white/[0.04] border border-white/[0.08]"}`}>
                        <div className="flex items-center gap-3">
                            <span className="relative flex h-3 w-3">
                                {allUp && <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />}
                                <span className={`relative inline-flex h-3 w-3 rounded-full ${allUp ? "bg-emerald-500" : downCount > 0 ? "bg-red-500" : "bg-slate-500"}`} />
                            </span>
                            <span className={`text-sm font-semibold ${allUp ? "text-emerald-400" : downCount > 0 ? "text-red-400" : "text-slate-300"}`}>
                                {allUp ? "All systems operational" : downCount > 0 ? `${downCount} site${downCount > 1 ? "s" : ""} down` : "Checking…"}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                            <span className="flex items-center gap-1.5 text-emerald-400">
                                <span className="font-bold">{upCount}</span> up
                            </span>
                            {downCount > 0 && (
                                <span className="flex items-center gap-1.5 text-red-400">
                                    <span className="font-bold">{downCount}</span> down
                                </span>
                            )}
                            <span className="text-slate-500">{total} total</span>
                        </div>
                    </div>
                )}

                {/* Add website form */}
                <div>
                    <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            placeholder="example.com or https://example.com"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            required
                            className="dark-input flex-1"
                        />
                        <button
                            type="submit"
                            disabled={adding}
                            className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 disabled:text-emerald-600 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-all whitespace-nowrap shadow-lg shadow-emerald-500/20 w-full sm:w-auto"
                        >
                            {adding ? "Adding…" : "Add monitor"}
                        </button>
                    </form>
                    {addError && (
                        <p className="text-xs text-red-400 mt-2">{addError}</p>
                    )}
                </div>

                {/* Website list */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-slate-400">{total > 0 ? `${total} monitor${total !== 1 ? "s" : ""}` : "No monitors yet"}</span>
                        {total > 0 && (
                            <span className="text-xs text-slate-500">
                                {lastRefreshed ? `Updated ${timeAgo(lastRefreshed.toISOString())}` : "Auto-refreshes every 10m"}
                            </span>
                        )}
                    </div>

                    {isLoading && (
                        <div className="space-y-3">
                            {[1, 2].map(i => (
                                <div key={i} className="glass rounded-2xl p-5">
                                    <div className="skeleton h-4 w-1/3 rounded-full mb-2" />
                                    <div className="skeleton h-3 w-1/4 rounded-full" />
                                </div>
                            ))}
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-5 text-sm text-red-400 text-center">
                            Failed to load websites. Check your connection.
                        </div>
                    )}

                    {!isLoading && websites?.length === 0 && (
                        <div className="glass border-dashed rounded-2xl p-16 text-center">
                            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                            </div>
                            <p className="text-slate-300 text-sm font-medium">No websites monitored yet</p>
                            <p className="text-slate-500 text-xs mt-1">Add a URL above to start watching it</p>
                        </div>
                    )}

                    <div className="space-y-3">
                        {sortedWebsites.map(w => (
                            <WebsiteCard
                                key={w.id}
                                website={w}
                                onDelete={handleDelete}
                                deleting={deletingId === w.id}
                            />
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
