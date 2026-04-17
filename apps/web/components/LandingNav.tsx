"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function LandingNav() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                scrolled
                    ? "border-b border-white/[0.06] bg-[#080c18]/90 backdrop-blur-xl shadow-lg shadow-black/20"
                    : "bg-transparent"
            }`}
        >
            <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/25">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping-slow absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                        </span>
                    </div>
                    <span className="text-white font-semibold tracking-tight">BetterUptime</span>
                </div>

                <nav className="hidden md:flex items-center gap-1">
                    <a
                        href="#features"
                        className="px-3 py-1.5 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-all"
                    >
                        Features
                    </a>
                    <a
                        href="#how-it-works"
                        className="px-3 py-1.5 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-all"
                    >
                        How it works
                    </a>
                    <a
                        href="#pricing"
                        className="px-3 py-1.5 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-all"
                    >
                        Pricing
                    </a>
                </nav>

                <div className="flex items-center gap-2">
                    <Link
                        href="/signin"
                        className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/[0.05]"
                    >
                        Sign in
                    </Link>
                    <Link
                        href="/signup"
                        className="text-sm bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg px-4 py-1.5 font-medium transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
                    >
                        Get started free
                    </Link>
                </div>
            </div>
        </header>
    );
}
