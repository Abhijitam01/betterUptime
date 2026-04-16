"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, type UserProfile } from "../../lib/api";
import { getToken } from "../../lib/auth";
import { Navbar } from "../../components/Navbar";

export default function Settings() {
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [email, setEmail] = useState("");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!getToken()) { router.push("/signin"); return; }
        api.getMe().then(p => {
            setProfile(p);
            setEmail(p.email ?? "");
        }).catch(() => router.push("/signin"));
    }, [router]);

    async function handleSave(e: FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError("");
        setSaved(false);
        try {
            const updated = await api.updateEmail(email);
            setProfile(updated);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#080c18]">
            <Navbar />
            <main className="mx-auto max-w-xl px-4 py-10 space-y-6">
                <div>
                    <h1 className="text-xl font-bold text-white">Account Settings</h1>
                    <p className="text-sm text-slate-400 mt-1">Manage your profile and alert email.</p>
                </div>

                <div className="glass rounded-2xl p-6 space-y-5">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Username</label>
                        <p className="text-sm text-white font-medium">{profile?.username ?? "—"}</p>
                    </div>

                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                                Alert Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="dark-input"
                            />
                            <p className="text-xs text-slate-500 mt-1">Used for downtime alerts when email alerts are enabled on a monitor.</p>
                        </div>

                        {error && <p className="text-xs text-red-400">{error}</p>}

                        <button
                            type="submit"
                            disabled={saving || !email}
                            className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 disabled:text-emerald-600 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20"
                        >
                            {saving ? "Saving…" : saved ? "Saved!" : "Save changes"}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
}
