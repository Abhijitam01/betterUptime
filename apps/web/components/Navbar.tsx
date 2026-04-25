"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { clearToken } from "../lib/auth";
import { ThemeToggle } from "./ThemeToggle";

export function Navbar() {
    const router = useRouter();
    const pathname = usePathname();

    function signout() {
        clearToken();
        router.push("/signin");
    }

    function navClass(href: string) {
        const active = pathname === href || pathname.startsWith(href + "/");
        return `text-xs font-medium transition-colors px-3 py-1.5 rounded-lg ${
            active
                ? "bg-emerald-500/15 text-emerald-400"
                : "text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-hover-bg,rgba(255,255,255,0.06))]"
        }`;
    }

    return (
        <header className="sticky top-0 z-40 border-b border-[var(--theme-divider)] backdrop-blur-md" style={{ background: "var(--theme-bg)" }}>
            <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
                <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="font-semibold text-[var(--theme-text-primary)] tracking-tight text-sm">PingGod</span>
                </Link>

                <nav className="flex items-center gap-1">
                    <Link href="/dashboard" className={navClass("/dashboard")}>
                        Dashboard
                    </Link>
                    <Link href="/import" className={navClass("/import")}>
                        Import
                    </Link>
                    <Link href="/settings" className={navClass("/settings")}>
                        Settings
                    </Link>
                    <ThemeToggle />
                    <button
                        onClick={signout}
                        className="text-xs text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)] transition-colors px-3 py-1.5 rounded-lg hover:bg-[var(--theme-hover-bg,rgba(255,255,255,0.06))]"
                    >
                        Sign out
                    </button>
                </nav>
            </div>
        </header>
    );
}
