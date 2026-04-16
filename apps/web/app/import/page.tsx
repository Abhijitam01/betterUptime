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
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <main className="mx-auto max-w-2xl px-4 py-10 space-y-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Import monitors</h1>
                    <p className="text-sm text-slate-500 mt-1">Migrate from UptimeRobot or import via CSV. Duplicate URLs are skipped.</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
                    {(["uptimerobot", "csv"] as Tab[]).map(t => (
                        <button
                            key={t}
                            onClick={() => { setTab(t); setResult(null); setError(""); }}
                            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                        >
                            {t === "uptimerobot" ? "UptimeRobot" : "CSV"}
                        </button>
                    ))}
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                    {tab === "uptimerobot" ? (
                        <>
                            <p className="text-sm text-slate-600">
                                Enter your UptimeRobot API key (read-only). Find it under{" "}
                                <span className="font-medium">My Settings → API Settings</span>.
                            </p>
                            <input
                                type="text"
                                placeholder="ur1234567-abcdefghijklmnopqrstuvwx"
                                value={apiKey}
                                onChange={e => { setApiKey(e.target.value); setResult(null); }}
                                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition bg-slate-50"
                            />
                            {error && <p className="text-xs text-red-600">{error}</p>}
                            {result && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800">
                                    Imported {result.imported} monitor{result.imported !== 1 ? "s" : ""}.
                                    {result.skipped > 0 && ` Skipped ${result.skipped} duplicate${result.skipped !== 1 ? "s" : ""}.`}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <button
                                    onClick={handleUptimeRobotImport}
                                    disabled={importing || !apiKey.trim()}
                                    className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-300 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-all shadow-sm"
                                >
                                    {importing ? "Importing…" : "Import from UptimeRobot"}
                                </button>
                                {result && (
                                    <button
                                        onClick={() => router.push("/dashboard")}
                                        className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2.5 rounded-xl hover:bg-slate-100 transition"
                                    >
                                        Go to dashboard
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <p className="text-sm text-slate-600 mb-2">
                                    Paste CSV with a header row. Required column: <code className="bg-slate-100 px-1 rounded text-xs">url</code>.
                                    Optional: <code className="bg-slate-100 px-1 rounded text-xs">display_name</code>, <code className="bg-slate-100 px-1 rounded text-xs">check_interval_sec</code>.
                                </p>
                                <p className="text-xs text-slate-400 font-mono bg-slate-50 border border-slate-200 rounded-lg p-2">
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
                                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition bg-slate-50 resize-none"
                            />
                            {csvRows.length > 0 && !result && (
                                <p className="text-xs text-slate-500">{csvRows.length} valid URL{csvRows.length !== 1 ? "s" : ""} detected</p>
                            )}
                            {error && <p className="text-xs text-red-600">{error}</p>}
                            {result && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800">
                                    Imported {result.imported} monitor{result.imported !== 1 ? "s" : ""}.
                                    {result.skipped > 0 && ` Skipped ${result.skipped} duplicate${result.skipped !== 1 ? "s" : ""}.`}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCsvImport}
                                    disabled={importing || csvRows.length === 0}
                                    className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-300 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-all shadow-sm"
                                >
                                    {importing ? "Importing…" : `Import ${csvRows.length} URL${csvRows.length !== 1 ? "s" : ""}`}
                                </button>
                                {result && (
                                    <button
                                        onClick={() => router.push("/dashboard")}
                                        className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2.5 rounded-xl hover:bg-slate-100 transition"
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
