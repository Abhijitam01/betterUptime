"use client";

import Link from "next/link";
import useSWR from "swr";
import { StatusBadge } from "./StatusBadge";
import { api, type Website, type Tick } from "../lib/api";

interface Props {
    website: Website;
    onDelete: (id: string) => void;
    deleting: boolean;
}

function MiniSparkline({ websiteId }: { websiteId: string }) {
    const { data: ticks } = useSWR<Tick[]>(
        `history-${websiteId}`,
        () => api.getWebsiteHistory(websiteId),
        { refreshInterval: 600_000 }
    );

    const count = 20;
    const allTicks = ticks ?? [];
    const recent = [...allTicks].slice(0, count).reverse();

    const responseTimes = recent.map(t => t.response_time_ms).filter(n => n > 0);
    const maxMs = responseTimes.length > 0 ? Math.max(...responseTimes) : 1;

    const upCount = allTicks.filter(t => t.status === "Up").length;
    const uptime = allTicks.length > 0
        ? ((upCount / allTicks.length) * 100).toFixed(1)
        : null;
    const latestResponseMs = allTicks[0]?.response_time_ms;

    return (
        <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-end gap-[2px] h-8" style={{ width: 88 }}>
                {Array.from({ length: count }).map((_, i) => {
                    const tick = recent[i];
                    if (!tick) {
                        return (
                            <div
                                key={i}
                                className="flex-1 rounded-sm bg-white/[0.08] opacity-40"
                                style={{ height: "25%" }}
                            />
                        );
                    }
                    const heightPct = tick.response_time_ms > 0
                        ? Math.max(20, (tick.response_time_ms / maxMs) * 100)
                        : 25;
                    const color =
                        tick.status === "Up" ? "bg-emerald-400"
                            : tick.status === "Down" ? "bg-red-400"
                                : "bg-slate-600";
                    return (
                        <div
                            key={i}
                            className={`flex-1 rounded-sm ${color} hover:opacity-80 transition-opacity`}
                            style={{ height: `${heightPct}%` }}
                            title={`${tick.status} · ${tick.response_time_ms}ms · ${new Date(tick.createdAt).toLocaleString()}`}
                        />
                    );
                })}
            </div>

            <div className="flex flex-col items-end gap-0.5 min-w-[52px]">
                {latestResponseMs !== undefined && (
                    <span className="text-xs font-mono font-semibold text-slate-200 leading-none">
                        {latestResponseMs}ms
                    </span>
                )}
                {uptime !== null && (
                    <span className="text-xs font-mono text-emerald-400 leading-none">
                        {uptime}%
                    </span>
                )}
                {!ticks && (
                    <span className="text-[10px] text-slate-600 leading-none">loading…</span>
                )}
            </div>
        </div>
    );
}

export function WebsiteCard({ website, onDelete, deleting }: Props) {
    const status = website.latestTick?.status ?? "Unknown";

    function handleDelete(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        onDelete(website.id);
    }

    return (
        <Link
            href={`/dashboard/${website.id}`}
            className="group glass rounded-2xl p-5 hover:bg-white/[0.05] transition-all flex items-center gap-4 cursor-pointer"
        >
            {/* Left: status + name */}
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                    <StatusBadge status={status} />
                    <span className="font-medium text-white truncate text-sm group-hover:text-emerald-400 transition-colors">
                        {website.display_name || website.url}
                    </span>
                </div>
                {website.display_name && (
                    <p className="mt-0.5 text-xs text-slate-500 truncate">{website.url}</p>
                )}
                <p className="mt-1 text-xs text-slate-500">
                    Added {new Date(website.time_added).toLocaleDateString()}
                </p>
            </div>

            {/* Right: sparkline + delete */}
            <div className="flex items-center gap-3 shrink-0">
                <MiniSparkline websiteId={website.id} />

                <button
                    onClick={handleDelete}
                    disabled={deleting}
                    aria-label="Delete"
                    className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all disabled:opacity-30 p-1 shrink-0"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                </button>
            </div>
        </Link>
    );
}
