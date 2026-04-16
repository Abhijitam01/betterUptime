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
            <body className="antialiased bg-[#080c18] text-white">
                {children}
            </body>
        </html>
    );
}
