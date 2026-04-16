"use client";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import type { Tick } from "../lib/api";

function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ResponseTimeChart({ ticks }: { ticks: Tick[] }) {
    const data = [...ticks].reverse().map(t => ({
        time: formatTime(t.createdAt),
        ms: t.response_time_ms,
        status: t.status,
    }));

    return (
        <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                />
                <YAxis
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                    unit="ms"
                    width={48}
                />
                <Tooltip
                    contentStyle={{
                        background: "rgba(8,12,24,0.95)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "6px",
                        fontSize: "12px",
                        color: "#e2e8f0",
                    }}
                    formatter={(value) => [`${value}ms`, "Response time"]}
                />
                <Line
                    type="monotone"
                    dataKey="ms"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
