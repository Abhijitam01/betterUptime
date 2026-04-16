import { notFound } from "next/navigation";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type Tick = { id: string; status: string; response_time_ms: number; createdAt: string };
type Incident = { id: string; started_at: string; resolved_at: string | null; cause: string | null };
type PublicStatus = {
    id: string;
    display_name: string;
    url: string;
    ticks: Tick[];
    incidents: Incident[];
};

async function getPublicStatus(slug: string): Promise<PublicStatus | null> {
    try {
        const res = await fetch(`${BASE_URL}/public/status/${slug}`, { next: { revalidate: 30 } });
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
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

function calcUptime(ticks: Tick[]): number {
    if (ticks.length === 0) return 100;
    const up = ticks.filter(t => t.status === "Up").length;
    return Math.round((up / ticks.length) * 1000) / 10;
}

function UptimeBar({ ticks }: { ticks: Tick[] }) {
    const bars = ticks.slice(0, 30).reverse();
    return (
        <div className="flex gap-0.5 h-10 items-end">
            {bars.map(t => (
                <div
                    key={t.id}
                    title={`${t.status} — ${t.response_time_ms}ms`}
                    className={`flex-1 rounded-sm min-w-[4px] transition-all ${
                        t.status === "Up" ? "bg-emerald-400" :
                        t.status === "Down" ? "bg-red-400" : "bg-amber-400"
                    }`}
                    style={{ height: `${Math.min(100, Math.max(10, (t.response_time_ms / 2000) * 100))}%` }}
                />
            ))}
        </div>
    );
}

export default async function StatusPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const data = await getPublicStatus(slug);
    if (!data) notFound();

    const latestTick = data.ticks[0];
    const isUp = latestTick?.status === "Up";
    const uptime = calcUptime(data.ticks);
    const openIncidents = data.incidents.filter(i => !i.resolved_at);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="border-b border-slate-200/80 bg-white">
                <div className="mx-auto max-w-2xl px-4 h-14 flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="font-semibold text-slate-900 tracking-tight text-sm">BetterUptime</span>
                </div>
            </header>

            <main className="mx-auto max-w-2xl px-4 py-10 space-y-6">
                {/* Status banner */}
                <div className={`rounded-2xl px-6 py-5 ${isUp ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
                    <div className="flex items-center gap-3 mb-1">
                        <span className={`relative flex h-3 w-3`}>
                            {isUp && <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />}
                            <span className={`relative inline-flex h-3 w-3 rounded-full ${isUp ? "bg-emerald-500" : "bg-red-500"}`} />
                        </span>
                        <h1 className={`text-lg font-bold ${isUp ? "text-emerald-900" : "text-red-900"}`}>
                            {data.display_name}
                        </h1>
                    </div>
                    <p className={`text-sm font-medium ${isUp ? "text-emerald-700" : "text-red-700"}`}>
                        {isUp ? "Operational" : "Experiencing issues"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{data.url}</p>
                </div>

                {/* Uptime + bar */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Last 30 checks</span>
                        <span className="text-sm font-bold text-slate-900">{uptime}% uptime</span>
                    </div>
                    <UptimeBar ticks={data.ticks} />
                </div>

                {/* Active incidents */}
                {openIncidents.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-5 shadow-sm space-y-2">
                        <h2 className="text-xs font-semibold text-red-700 uppercase tracking-wide">Active incident</h2>
                        {openIncidents.map(i => (
                            <div key={i.id} className="text-sm text-red-800">
                                <span className="font-medium">{i.cause ?? "Down"}</span>
                                <span className="text-red-500 ml-2 text-xs">ongoing — {formatDuration(i.started_at, null)}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Past incidents */}
                {data.incidents.filter(i => i.resolved_at).length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Recent incidents</h2>
                        <div className="space-y-2">
                            {data.incidents.filter(i => i.resolved_at).slice(0, 5).map(i => (
                                <div key={i.id} className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-sm text-slate-800 font-medium">{i.cause ?? "Down"}</p>
                                        <p className="text-xs text-slate-400">
                                            {new Date(i.started_at).toLocaleDateString()} — resolved after {formatDuration(i.started_at, i.resolved_at)}
                                        </p>
                                    </div>
                                    <span className="text-xs bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 font-medium whitespace-nowrap">Resolved</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <p className="text-center text-xs text-slate-300">
                    Powered by <span className="font-medium">BetterUptime</span> — refreshes every 30s
                </p>
            </main>
        </div>
    );
}
