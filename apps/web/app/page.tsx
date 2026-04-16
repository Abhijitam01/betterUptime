"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { LandingNav } from "../components/LandingNav";

// ─── Scroll reveal hook ────────────────────────────────────────────────────

function useReveal() {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    el.style.animationPlayState = "running";
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );
        el.style.animationPlayState = "paused";
        observer.observe(el);
        return () => observer.disconnect();
    }, []);
    return ref;
}

// ─── Components ────────────────────────────────────────────────────────────

function RevealSection({ children, className = "", delay = 0 }: {
    children: React.ReactNode;
    className?: string;
    delay?: number;
}) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.style.opacity = "0";
        el.style.transform = "translateY(32px)";
        el.style.transition = `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    el.style.opacity = "1";
                    el.style.transform = "translateY(0)";
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [delay]);
    return (
        <div ref={ref} className={className}>
            {children}
        </div>
    );
}

function MockDashboard() {
    return (
        <div className="w-full max-w-2xl mx-auto">
            <div className="glass rounded-2xl overflow-hidden shadow-2xl shadow-black/60">
                {/* Title bar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                    <div className="flex gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-red-500/60" />
                        <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
                        <span className="w-3 h-3 rounded-full bg-emerald-500/60" />
                    </div>
                    <div className="flex-1 flex justify-center">
                        <span className="text-[11px] text-slate-500 font-mono bg-white/[0.04] rounded-md px-3 py-0.5">
                            betteruptime.app/dashboard
                        </span>
                    </div>
                </div>

                {/* Dashboard content */}
                <div className="p-5 space-y-4">
                    {/* Status banner */}
                    <div className="flex items-center justify-between rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20 px-4 py-3">
                        <div className="flex items-center gap-2.5">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                            </span>
                            <span className="text-sm font-semibold text-emerald-400">All systems operational</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                            <span className="text-emerald-500 font-bold">4</span>
                            <span className="text-slate-500">up</span>
                            <span className="text-slate-600">·</span>
                            <span className="text-slate-400">4 total</span>
                        </div>
                    </div>

                    {/* Site rows */}
                    <div className="space-y-2">
                        <MockSiteRow url="myapp.com" ms={89} status="Up" uptime={99.9} />
                        <MockSiteRow url="api.myapp.com" ms={134} status="Up" uptime={100} />
                        <MockSiteRow url="docs.myapp.com" ms={210} status="Up" uptime={98.7} />
                        <MockSiteRow url="admin.myapp.com" ms={67} status="Up" uptime={100} />
                    </div>

                    {/* Mini chart */}
                    <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-slate-400 font-medium">Response time — myapp.com</span>
                            <span className="text-xs text-emerald-400 font-mono">avg 89ms</span>
                        </div>
                        <MiniChart />
                    </div>
                </div>
            </div>
            {/* Glow */}
            <div className="absolute -inset-x-12 -bottom-10 h-24 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
        </div>
    );
}

function MockSiteRow({ url, ms, status, uptime }: { url: string; ms: number; status: "Up" | "Down"; uptime: number }) {
    return (
        <div className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.04] px-3.5 py-2.5 hover:bg-white/[0.05] transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
                <span className="relative flex h-2 w-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-xs text-slate-200 font-mono truncate">{url}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-3">
                <div className="hidden sm:flex gap-[2px] items-end h-4">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div
                            key={i}
                            className="w-1 rounded-sm bg-emerald-500 opacity-60"
                            style={{ height: `${40 + Math.sin(i * 0.7) * 30 + Math.random() * 20}%` }}
                        />
                    ))}
                </div>
                <span className="text-[10px] text-slate-500 font-mono">{ms}ms</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                    {uptime}%
                </span>
            </div>
        </div>
    );
}

function MiniChart() {
    const points = [120, 89, 145, 78, 134, 92, 67, 110, 88, 95, 72, 89];
    const max = Math.max(...points);
    const min = Math.min(...points);
    const h = 60;
    const w = 100;
    const coords = points.map((p, i) => {
        const x = (i / (points.length - 1)) * w;
        const y = h - ((p - min) / (max - min)) * h * 0.8 - h * 0.1;
        return `${x},${y}`;
    });
    const pathD = `M ${coords.join(" L ")}`;
    const fillD = `${pathD} L ${w},${h} L 0,${h} Z`;

    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-12" preserveAspectRatio="none">
            <defs>
                <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={fillD} fill="url(#chartFill)" />
            <path d={pathD} fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function FeatureCard({ icon, title, description, gradient, delay = 0 }: {
    icon: React.ReactNode;
    title: string;
    description: string;
    gradient: string;
    delay?: number;
}) {
    return (
        <RevealSection delay={delay} className="group glass rounded-2xl p-6 hover:bg-white/[0.06] transition-all duration-300 cursor-default">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${gradient} group-hover:scale-110 transition-transform duration-300`}>
                <div className="text-white">{icon}</div>
            </div>
            <h3 className="font-semibold text-white mb-2 text-base">{title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
        </RevealSection>
    );
}

// ─── Icons ─────────────────────────────────────────────────────────────────

const ClockIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const ActivityIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
);

const GlobeIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
);

const BellIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
);

const ShieldIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

const HistoryIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 .49-3.51" />
    </svg>
);

// ─── Page ──────────────────────────────────────────────────────────────────

export default function Home() {
    return (
        <div className="min-h-screen bg-[#080c18] text-white overflow-x-hidden">
            <LandingNav />

            {/* ─── Hero ─────────────────────────────────────────────── */}
            <section className="relative flex flex-col items-center justify-center min-h-screen px-4 pt-20 pb-32 text-center overflow-hidden">

                {/* Gradient orbs */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="animate-orb-1 absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full bg-emerald-500/[0.07] blur-3xl" />
                    <div className="animate-orb-2 absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-teal-500/[0.06] blur-3xl" />
                </div>

                {/* Grid background */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage: `
                            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
                        `,
                        backgroundSize: "60px 60px",
                    }}
                />
                {/* Radial fade */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,transparent_20%,#080c18_75%)] pointer-events-none" />

                {/* Content */}
                <div className="relative z-10 mx-auto max-w-4xl space-y-7">

                    {/* Badge */}
                    <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/[0.08] px-4 py-1.5 text-sm text-emerald-400 mb-2">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                        Open source · Self-hostable · Free forever
                    </div>

                    {/* Headline */}
                    <h1 className="animate-fade-up-delay-1 text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.04]">
                        Know before
                        <br />
                        <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent animate-gradient-x">
                            your users do
                        </span>
                    </h1>

                    {/* Sub */}
                    <p className="animate-fade-up-delay-2 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                        BetterUptime monitors your websites every minute, tracks response times across
                        multiple regions, and sends instant alerts — so outages never catch you off guard.
                    </p>

                    {/* CTAs */}
                    <div className="animate-fade-up-delay-3 flex items-center gap-3 justify-center flex-wrap pt-1">
                        <Link
                            href="/signup"
                            className="group relative bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl px-7 py-3.5 text-sm font-semibold transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5"
                        >
                            Start monitoring free
                            <span className="ml-1.5 inline-block group-hover:translate-x-0.5 transition-transform">→</span>
                        </Link>
                        <Link
                            href="/signin"
                            className="border border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06] text-slate-300 hover:text-white rounded-xl px-7 py-3.5 text-sm font-medium transition-all"
                        >
                            Sign in
                        </Link>
                    </div>

                    {/* Social proof */}
                    <p className="animate-fade-up-delay-4 text-xs text-slate-600">
                        No credit card required · Setup in under 2 minutes
                    </p>
                </div>

                {/* Hero visual */}
                <div className="animate-float relative z-10 mt-20 w-full px-4">
                    <MockDashboard />
                </div>
            </section>

            {/* ─── Trust bar ────────────────────────────────────────── */}
            <section className="border-y border-white/[0.06] bg-white/[0.015] py-10 px-4">
                <RevealSection className="mx-auto max-w-5xl">
                    <p className="text-center text-xs text-slate-600 uppercase tracking-widest font-medium mb-8">
                        Trusted by developers building production systems
                    </p>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-6 items-center">
                        {["Vercel", "Railway", "Fly.io", "Supabase", "PlanetScale", "Render"].map(name => (
                            <div key={name} className="text-center text-slate-600 text-sm font-semibold tracking-tight hover:text-slate-400 transition-colors cursor-default">
                                {name}
                            </div>
                        ))}
                    </div>
                </RevealSection>
            </section>

            {/* ─── Stats ────────────────────────────────────────────── */}
            <section className="py-20 px-4">
                <div className="mx-auto max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                        { value: "60s", label: "Check interval", sub: "Up to every minute" },
                        { value: "5", label: "Global regions", sub: "Multi-region checks" },
                        { value: "99.9%", label: "Uptime tracked", sub: "SLA-grade history" },
                        { value: "<2min", label: "Setup time", sub: "From zero to monitoring" },
                    ].map((s, i) => (
                        <RevealSection key={s.label} delay={i * 80} className="glass rounded-2xl p-6 text-center">
                            <p className="text-3xl font-bold text-white mb-1">{s.value}</p>
                            <p className="text-sm font-medium text-slate-300 mb-0.5">{s.label}</p>
                            <p className="text-xs text-slate-500">{s.sub}</p>
                        </RevealSection>
                    ))}
                </div>
            </section>

            {/* ─── Features ─────────────────────────────────────────── */}
            <section id="features" className="py-24 px-4 border-t border-white/[0.06]">
                <div className="mx-auto max-w-5xl">
                    <RevealSection className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs text-slate-400 mb-6">
                            Features
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            Everything you need to stay on top
                        </h2>
                        <p className="text-slate-400 max-w-xl mx-auto">
                            No fluff, no dashboards you never open. Just reliable monitoring with the signals that actually matter.
                        </p>
                    </RevealSection>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <FeatureCard
                            delay={0}
                            gradient="bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20"
                            title="Real-time uptime checks"
                            description="Add any URL and monitoring starts immediately. Checks run every 60 seconds, 24/7, from multiple regions so you know it's not a network fluke."
                            icon={<ClockIcon />}
                        />
                        <FeatureCard
                            delay={80}
                            gradient="bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/20"
                            title="Response time tracking"
                            description="Every check records exact latency. Spot slowdowns with per-check history charts before they become full outages your users notice."
                            icon={<ActivityIcon />}
                        />
                        <FeatureCard
                            delay={160}
                            gradient="bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/20"
                            title="Multi-region monitoring"
                            description="Workers run from 5 distributed regions. Know whether it's your server or someone's ISP with location-aware checks."
                            icon={<GlobeIcon />}
                        />
                        <FeatureCard
                            delay={0}
                            gradient="bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20"
                            title="Instant incident alerts"
                            description="Get notified the moment something goes wrong via email or Slack webhook. Alerts include cause, duration, and recovery — no noise."
                            icon={<BellIcon />}
                        />
                        <FeatureCard
                            delay={80}
                            gradient="bg-gradient-to-br from-rose-500/20 to-pink-500/10 border border-rose-500/20"
                            title="SSL certificate monitoring"
                            description="Automatic SSL expiry tracking with 14-day advance warnings. Never let an expired cert take down your site silently."
                            icon={<ShieldIcon />}
                        />
                        <FeatureCard
                            delay={160}
                            gradient="bg-gradient-to-br from-teal-500/20 to-emerald-500/10 border border-teal-500/20"
                            title="Full check history"
                            description="Uptime %, average response time, and per-check logs stored for every site. Public status pages included at no extra cost."
                            icon={<HistoryIcon />}
                        />
                    </div>
                </div>
            </section>

            {/* ─── How it works ─────────────────────────────────────── */}
            <section id="how-it-works" className="py-24 px-4 border-t border-white/[0.06]">
                <div className="mx-auto max-w-3xl">
                    <RevealSection className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs text-slate-400 mb-6">
                            How it works
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            Up and monitoring in 3 steps
                        </h2>
                        <p className="text-slate-400">No credit card. No complex setup. No YAML.</p>
                    </RevealSection>

                    <div className="relative">
                        {/* Connecting line */}
                        <div className="absolute left-6 top-8 bottom-8 w-px bg-gradient-to-b from-emerald-500/50 via-teal-500/30 to-transparent hidden md:block" />

                        <div className="space-y-6">
                            {steps.map((step, i) => (
                                <RevealSection key={step.title} delay={i * 120}>
                                    <div className="flex gap-6 items-start">
                                        <div className="shrink-0 w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 font-bold text-lg relative z-10">
                                            {i + 1}
                                        </div>
                                        <div className="pt-2.5">
                                            <h3 className="font-semibold text-white mb-1.5 text-lg">{step.title}</h3>
                                            <p className="text-slate-400 leading-relaxed">{step.description}</p>
                                        </div>
                                    </div>
                                </RevealSection>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Pricing ──────────────────────────────────────────── */}
            <section id="pricing" className="py-24 px-4 border-t border-white/[0.06]">
                <div className="mx-auto max-w-3xl">
                    <RevealSection className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs text-slate-400 mb-6">
                            Pricing
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                            Simple, honest pricing
                        </h2>
                        <p className="text-slate-400">Free and open source forever. Self-host or use our cloud.</p>
                    </RevealSection>

                    <div className="grid md:grid-cols-2 gap-5">
                        <RevealSection delay={0}>
                            <div className="glass rounded-2xl p-7 h-full">
                                <div className="mb-5">
                                    <p className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-2">Free</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-bold text-white">$0</span>
                                        <span className="text-slate-500 text-sm">/ forever</span>
                                    </div>
                                </div>
                                <ul className="space-y-3 mb-7">
                                    {["Unlimited websites", "60-second checks", "Email & webhook alerts", "SSL monitoring", "Public status pages", "Full check history"].map(f => (
                                        <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                                            <svg className="shrink-0 text-emerald-500" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    href="/signup"
                                    className="w-full inline-flex justify-center items-center border border-white/10 hover:border-white/20 hover:bg-white/[0.05] text-white rounded-xl py-2.5 text-sm font-medium transition-all"
                                >
                                    Get started free
                                </Link>
                            </div>
                        </RevealSection>

                        <RevealSection delay={100}>
                            <div className="gradient-border rounded-2xl h-full">
                                <div className="glass rounded-2xl p-7 h-full relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.05] to-teal-500/[0.03]" />
                                    <div className="relative">
                                        <div className="flex items-center gap-2 mb-5">
                                            <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">Self-hosted</p>
                                            <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full font-medium">Open source</span>
                                        </div>
                                        <div className="flex items-baseline gap-1 mb-5">
                                            <span className="text-4xl font-bold text-white">Free</span>
                                        </div>
                                        <ul className="space-y-3 mb-7">
                                            {["Everything in Free", "Your own infrastructure", "No data leaves your servers", "Custom domains", "Full source code access", "Community support"].map(f => (
                                                <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                                                    <svg className="shrink-0 text-emerald-500" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                    {f}
                                                </li>
                                            ))}
                                        </ul>
                                        <a
                                            href="https://github.com"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full inline-flex justify-center items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl py-2.5 text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                            </svg>
                                            View on GitHub
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </RevealSection>
                    </div>
                </div>
            </section>

            {/* ─── CTA ──────────────────────────────────────────────── */}
            <section className="py-28 px-4 border-t border-white/[0.06]">
                <RevealSection className="mx-auto max-w-2xl text-center">
                    <div className="relative">
                        {/* Background glow */}
                        <div className="absolute inset-0 bg-emerald-500/5 blur-3xl rounded-full scale-150" />
                        <div className="relative">
                            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
                                Your next outage
                                <br />
                                <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                                    starts in 60 seconds.
                                </span>
                            </h2>
                            <p className="text-slate-400 mb-10 max-w-md mx-auto">
                                Don&apos;t wait for a user to tell you your site is down. Set up monitoring now — it&apos;s free, forever.
                            </p>
                            <div className="flex items-center gap-3 justify-center flex-wrap">
                                <Link
                                    href="/signup"
                                    className="group bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl px-8 py-4 text-base font-semibold transition-all shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5"
                                >
                                    Start monitoring free
                                    <span className="ml-2 inline-block group-hover:translate-x-0.5 transition-transform">→</span>
                                </Link>
                            </div>
                            <p className="mt-5 text-xs text-slate-600">No credit card · 2 minute setup · Open source</p>
                        </div>
                    </div>
                </RevealSection>
            </section>

            {/* ─── Footer ───────────────────────────────────────────── */}
            <footer className="border-t border-white/[0.06] py-10 px-4">
                <div className="mx-auto max-w-5xl flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2.5">
                        <div className="relative flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 border border-emerald-500/20">
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </div>
                        <span className="text-sm font-semibold text-slate-400">BetterUptime</span>
                    </div>
                    <div className="flex items-center gap-6 text-xs text-slate-600">
                        <a href="#features" className="hover:text-slate-400 transition-colors">Features</a>
                        <a href="#pricing" className="hover:text-slate-400 transition-colors">Pricing</a>
                        <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors">GitHub</a>
                    </div>
                    <p className="text-xs text-slate-700">Open source uptime monitoring built with Next.js &amp; Bun</p>
                </div>
            </footer>
        </div>
    );
}

// ─── Data ──────────────────────────────────────────────────────────────────

const steps = [
    {
        title: "Create a free account",
        description: "Sign up in seconds — no email verification, no credit card, no onboarding wizard. Just pick a username and password.",
    },
    {
        title: "Add your websites",
        description: "Paste any URL. We start watching immediately. Add as many sites as you want — there are no limits.",
    },
    {
        title: "Get notified, stay in control",
        description: "Configure email or Slack alerts, set maintenance windows, and share public status pages with your users.",
    },
];
