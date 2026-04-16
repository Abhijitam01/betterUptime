import type { Tick } from "../lib/api";

interface Props {
    ticks: Tick[];
    count?: number;
}

export function UptimeBars({ ticks, count = 30 }: Props) {
    const recent = ticks.slice(0, count).reverse();
    const uptime = ticks.length === 0
        ? null
        : ((ticks.filter(t => t.status === "Up").length / ticks.length) * 100).toFixed(1);

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-end gap-[2px] h-8">
                {Array.from({ length: count }).map((_, i) => {
                    const tick = recent[i];
                    const color = !tick
                        ? "bg-white/[0.08]"
                        : tick.status === "Up"
                            ? "bg-emerald-400"
                            : tick.status === "Down"
                                ? "bg-red-400"
                                : "bg-slate-600";
                    return (
                        <div
                            key={i}
                            title={
                                tick
                                    ? `${tick.status} · ${tick.response_time_ms}ms · ${new Date(tick.createdAt).toLocaleString()}`
                                    : "No data"
                            }
                            className={`flex-1 rounded-sm transition-all ${color} ${tick ? "h-full hover:opacity-80" : "h-1/2 opacity-30"}`}
                        />
                    );
                })}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>30 checks ago</span>
                {uptime !== null && (
                    <span className="font-medium text-slate-400">{uptime}% uptime</span>
                )}
                <span>Now</span>
            </div>
        </div>
    );
}
