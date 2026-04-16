"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearToken } from "../lib/auth";

export function Navbar() {
    const router = useRouter();

    function signout() {
        clearToken();
        router.push("/signin");
    }

    return (
        <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#080c18]/90 backdrop-blur-md">
            <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
                <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <span className="relative flex h-2 w-2">
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="font-semibold text-white tracking-tight text-sm">BetterUptime</span>
                </Link>

                <nav className="flex items-center gap-1">
                    <Link
                        href="/import"
                        className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/[0.06]"
                    >
                        Import
                    </Link>
                    <Link
                        href="/settings"
                        className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/[0.06]"
                    >
                        Settings
                    </Link>
                    <button
                        onClick={signout}
                        className="text-xs text-slate-500 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/[0.06]"
                    >
                        Sign out
                    </button>
                </nav>
            </div>
        </header>
    );
}
