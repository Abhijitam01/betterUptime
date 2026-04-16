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
    const [editing, setEditing] = useState(true);
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
            setEditing(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save");
        } finally {
            setSaving(false);
        }
    }

    function handleEdit() {
        setSaved(false);
        setEditing(true);
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
                                disabled={!editing}
                                className="dark-input disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <p className="text-xs text-slate-500 mt-1">Used for downtime alerts when email alerts are enabled on a monitor.</p>
                        </div>

                        {error && <p className="text-xs text-red-400">{error}</p>}

                        <div className="flex items-center gap-3">
                            {editing ? (
                                <button
                                    type="submit"
                                    disabled={saving || !email}
                                    className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-800 disabled:text-emerald-600 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20"
                                >
                                    {saving ? "Saving…" : "Save changes"}
                                </button>
                            ) : (
                                <>
                                    <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-semibold">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        Saved
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleEdit}
                                        className="text-sm font-medium text-slate-400 hover:text-white px-4 py-2 rounded-xl hover:bg-white/[0.06] transition-all border border-white/[0.08]"
                                    >
                                        Edit
                                    </button>
                                </>
                            )}
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
