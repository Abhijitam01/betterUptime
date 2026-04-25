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
        <div className="min-h-screen bg-[var(--theme-bg)] flex items-center justify-center px-4">
            <div
                className="fixed inset-0 pointer-events-none"
                style={{
                    backgroundImage: `
                        linear-gradient(var(--theme-divider) 1px, transparent 1px),
                        linear-gradient(90deg, var(--theme-divider) 1px, transparent 1px)
                    `,
                    backgroundSize: "60px 60px",
                }}
            />
            <div className="fixed inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 60% at 50% 50%, transparent 30%, var(--theme-bg) 80%)" }} />

            <div className="relative z-10 w-full max-w-sm">
                <div className="flex items-center justify-center gap-2 mb-8">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    <span className="text-[var(--theme-text-primary)] font-semibold tracking-tight">PingGod</span>
                </div>

                <div className="glass rounded-2xl p-7">
                    <h1 className="text-xl font-bold text-[var(--theme-text-primary)] mb-1">Create your account</h1>
                    <p className="text-sm text-[var(--theme-text-muted)] mb-6">Start monitoring your websites for free</p>

                    {error && (
                        <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-[var(--theme-text-secondary)] mb-1.5">
                                Username
                            </label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                required
                                autoComplete="username"
                                className="dark-input"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-[var(--theme-text-secondary)] mb-1.5">
                                Password
                                <span className="ml-1.5 text-xs text-[var(--theme-text-muted)] font-normal">(min 8 characters)</span>
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                minLength={8}
                                autoComplete="new-password"
                                className="dark-input"
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

                <p className="text-center text-sm text-[var(--theme-text-muted)] mt-5">
                    Already have an account?{" "}
                    <Link href="/signin" className="text-emerald-500 hover:text-emerald-400 transition-colors">
                        Sign in
                    </Link>
                </p>

                <div className="text-center mt-4">
                    <Link href="/" className="text-xs text-[var(--theme-text-muted)] hover:text-[var(--theme-text-secondary)] transition-colors">
                        ← Back to home
                    </Link>
                </div>
            </div>
        </div>
    );
}
