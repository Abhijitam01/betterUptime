import type { WebsiteStatus } from "../lib/api";

const config: Record<WebsiteStatus, { pill: string; dot: string; pulse: boolean; label: string }> = {
    Up:              { pill: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",  dot: "bg-emerald-500",  pulse: true,  label: "Up" },
    Down:            { pill: "bg-red-500/15 text-red-400 border-red-500/25",              dot: "bg-red-500",      pulse: false, label: "Down" },
    Unknown:         { pill: "bg-white/[0.06] text-slate-400 border-white/[0.08]",        dot: "bg-slate-400",    pulse: false, label: "Unknown" },
    keyword_failed:  { pill: "bg-violet-500/15 text-violet-400 border-violet-500/25",     dot: "bg-violet-500",   pulse: false, label: "Keyword failed" },
};

export function StatusBadge({ status }: { status: WebsiteStatus }) {
    const { pill, dot, pulse, label } = config[status] ?? config.Unknown;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${pill}`}>
            <span className="relative flex h-1.5 w-1.5">
                {pulse && <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${dot}`} />}
                <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dot}`} />
            </span>
            {label}
        </span>
    );
}
