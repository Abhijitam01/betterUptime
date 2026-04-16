"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, type ImportResult } from "../../lib/api";
import { getToken } from "../../lib/auth";
import { Navbar } from "../../components/Navbar";

type Tab = "uptimerobot" | "csv";

type CsvRow = { url: string; display_name: string; check_interval_sec: number };

function parseCsv(text: string): CsvRow[] {
    const lines = text.trim().split("\n").filter(Boolean);
    const header = lines[0]?.toLowerCase().split(",") ?? [];
    const urlIdx = header.indexOf("url");
    const nameIdx = header.indexOf("display_name");
    const intervalIdx = header.indexOf("check_interval_sec");
    return lines.slice(1).map(line => {
        const cols = line.split(",");
        return {
            url: (cols[urlIdx] ?? "").trim(),
            display_name: (cols[nameIdx] ?? "").trim(),
            check_interval_sec: parseInt(cols[intervalIdx] ?? "60", 10) || 60,
        };
    }).filter(r => r.url.startsWith("http"));
}

export default function ImportPage() {
    const router = useRouter();
    const [tab, setTab] = useState<Tab>("uptimerobot");
    const [apiKey, setApiKey] = useState("");
    const [csvText, setCsvText] = useState("");
    const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!getToken()) router.push("/signin");
    }, [router]);

    function handleCsvChange(text: string) {
        setCsvText(text);
        setCsvRows(parseCsv(text));
        setResult(null);
    }

    async function handleUptimeRobotImport() {
        if (!apiKey.trim()) return;
        setImporting(true);
        setError("");
        setResult(null);
        try {
            const res = await api.importUptimeRobot(apiKey.trim());
            setResult(res);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Import failed");
        } finally {
            setImporting(false);
        }
    }

    async function handleCsvImport() {
        if (csvRows.length === 0) return;
        setImporting(true);
        setError("");
        setResult(null);
        try {
            const res = await api.importCsv(csvRows);
            setResult(res);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Import failed");
        } finally {
            setImporting(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#080c18]">
            <Navbar />
            <main className="mx-auto max-w-2xl px-4 py-10 space-y-6">
                <div>
                    <h1 className="text-xl font-bold text-white">Import monitors</h1>
                    <p className="text-sm text-slate-400 mt-1">Migrate from UptimeRobot or import via CSV. Duplicate URLs are skipped.</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-white/[0.04] border border-white/[0.08] rounded-xl p-1 w-fit">
                    {(["uptimerobot", "csv"] as Tab[]).map(t => (
                        <button
                            key={t}
                            onClick={() => { setTab(t); setResult(null); setError(""); }}
                            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${tab === t ? "bg-white/[0.08] text-white" : "text-slate-500 hover:text-slate-300"}`}
                        >
                            {t === "uptimerobot" ? "UptimeRobot" : "CSV"}
                        </button>
                    ))}
                </div>

                <div className="glass rounded-2xl p-6 space-y-4">
                    {tab === "uptimerobot" ? (
                        <>
                            <p className="text-sm text-slate-400">
                                Enter your UptimeRobot API key (read-only). Find it under{" "}
                                <span className="font-medium text-slate-300">My Settings → API Settings</span>.
                            </p>
                            <input
                                type="text"
                                placeholder="ur1234567-abcdefghijklmnopqrstuvwx"
                                value={apiKey}
                                onChange={e => { setApiKey(e.target.value); setResult(null); }}
                                className="dark-input font-mono"
                            />
                            {error && <p className="text-xs text-red-400">{error}</p>}
                            {result && (
                                <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-4 py-3 text-sm text-emerald-400">
                                    Imported {result.imported} monitor{result.imported !== 1 ? "s" : ""}.
                                    {result.skipped > 0 && ` Skipped ${result.skipped} duplicate${result.skipped !== 1 ? "s" : ""}.`}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <button
                                    onClick={handleUptimeRobotImport}
                                    disabled={importing || !apiKey.trim()}
                                    className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 disabled:text-emerald-600 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20"
                                >
                                    {importing ? "Importing…" : "Import from UptimeRobot"}
                                </button>
                                {result && (
                                    <button
                                        onClick={() => router.push("/dashboard")}
                                        className="text-sm font-medium text-slate-400 hover:text-white px-4 py-2.5 rounded-xl hover:bg-white/[0.06] transition"
                                    >
                                        Go to dashboard
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <p className="text-sm text-slate-400 mb-2">
                                    Paste CSV with a header row. Required column: <code className="bg-white/[0.06] px-1 rounded text-xs text-slate-300">url</code>.
                                    Optional: <code className="bg-white/[0.06] px-1 rounded text-xs text-slate-300">display_name</code>, <code className="bg-white/[0.06] px-1 rounded text-xs text-slate-300">check_interval_sec</code>.
                                </p>
                                <p className="text-xs text-slate-500 font-mono bg-white/[0.03] border border-white/[0.06] rounded-lg p-2">
                                    url,display_name,check_interval_sec{"\n"}
                                    https://example.com,Example,60{"\n"}
                                    https://api.example.com,API,120
                                </p>
                            </div>
                            <textarea
                                rows={8}
                                placeholder={"url,display_name\nhttps://example.com,My Site"}
                                value={csvText}
                                onChange={e => handleCsvChange(e.target.value)}
                                className="dark-input font-mono resize-none"
                                style={{ height: "auto" }}
                            />
                            {csvRows.length > 0 && !result && (
                                <p className="text-xs text-slate-500">{csvRows.length} valid URL{csvRows.length !== 1 ? "s" : ""} detected</p>
                            )}
                            {error && <p className="text-xs text-red-400">{error}</p>}
                            {result && (
                                <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-4 py-3 text-sm text-emerald-400">
                                    Imported {result.imported} monitor{result.imported !== 1 ? "s" : ""}.
                                    {result.skipped > 0 && ` Skipped ${result.skipped} duplicate${result.skipped !== 1 ? "s" : ""}.`}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCsvImport}
                                    disabled={importing || csvRows.length === 0}
                                    className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 disabled:text-emerald-600 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20"
                                >
                                    {importing ? "Importing…" : `Import ${csvRows.length} URL${csvRows.length !== 1 ? "s" : ""}`}
                                </button>
                                {result && (
                                    <button
                                        onClick={() => router.push("/dashboard")}
                                        className="text-sm font-medium text-slate-400 hover:text-white px-4 py-2.5 rounded-xl hover:bg-white/[0.06] transition"
                                    >
                                        Go to dashboard
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
