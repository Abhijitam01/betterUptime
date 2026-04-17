"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../lib/api";
import { setToken } from "../../../lib/auth";

export default function SignUp() {
    const router = useRouter();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        setLoading(true);

        const form = new FormData(e.currentTarget);
        const username = form.get("username") as string;
        const password = form.get("password") as string;

        try {
            await api.signup(username, password);
            const { jwt } = await api.signin(username, password);
            setToken(jwt);
            router.push("/dashboard");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Sign up failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#080c18] flex items-center justify-center px-4">
            <div
                className="fixed inset-0 pointer-events-none"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
                    `,
                    backgroundSize: "60px 60px",
                }}
            />
            <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,transparent_30%,#080c18_80%)]" />

            <div className="relative z-10 w-full max-w-sm">
                <div className="flex items-center justify-center gap-2 mb-8">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    <span className="text-white font-semibold tracking-tight">BetterUptime</span>
                </div>

                <div className="glass rounded-2xl p-7">
                    <h1 className="text-xl font-bold text-white mb-1">Create your account</h1>
                    <p className="text-sm text-slate-400 mb-6">Start monitoring your websites for free</p>

                    {error && (
                        <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-1.5">
                                Username
                            </label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                required
                                autoComplete="username"
                                className="w-full rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-slate-500 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/15 transition"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">
                                Password
                                <span className="ml-1.5 text-xs text-slate-500 font-normal">(min 8 characters)</span>
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                minLength={8}
                                autoComplete="new-password"
                                className="w-full rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-slate-500 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/15 transition"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-600 disabled:opacity-60 text-white rounded-xl py-2.5 text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20"
                        >
                            {loading ? "Creating account…" : "Create free account"}
                        </button>
                    </form>
                </div>

                <p className="text-center text-sm text-slate-500 mt-5">
                    Already have an account?{" "}
                    <Link href="/signin" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                        Sign in
                    </Link>
                </p>

                <div className="text-center mt-4">
                    <Link href="/" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
                        ← Back to home
                    </Link>
                </div>
            </div>
        </div>
    );
}
