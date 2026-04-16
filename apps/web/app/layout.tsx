import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "BetterUptime — Website monitoring that works",
    description: "Know when your website goes down before your users do. Free, open-source uptime monitoring with response time tracking and full history.",
    icons: {
        icon: "/favicon.svg",
        shortcut: "/favicon.svg",
        apple: "/favicon.svg",
    },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('theme');if(t==='light')document.documentElement.setAttribute('data-theme','light');})();` }} />
            </head>
            <body className="antialiased bg-[var(--theme-bg)] text-white" style={{ background: 'var(--theme-bg)' }}>
                {children}
            </body>
        </html>
    );
}
