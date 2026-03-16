import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "VBC Pulse",
  description:
    "AI-curated value-based care intelligence for healthcare executives",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <header className="border-b border-terminal-border">
          <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-2 h-2 rounded-full bg-terminal-accent animate-pulse" />
              <span className="font-mono text-lg font-bold tracking-tight text-terminal-text group-hover:text-terminal-accent transition-colors">
                VBC PULSE
              </span>
            </Link>
            <div className="hidden sm:flex items-center gap-6 font-mono text-xs text-terminal-muted">
              <Link
                href="/aco"
                className="hover:text-terminal-accent transition-colors"
              >
                ACO
              </Link>
              <Link
                href="/risk-adjustment"
                className="hover:text-terminal-accent transition-colors"
              >
                RISK ADJ
              </Link>
              <Link
                href="/quality-cost"
                className="hover:text-terminal-accent transition-colors"
              >
                QUALITY
              </Link>
              <Link
                href="/ai-vbc"
                className="hover:text-terminal-accent transition-colors"
              >
                AI+VBC
              </Link>
              <Link
                href="/earnings"
                className="hover:text-terminal-accent transition-colors"
              >
                EARNINGS
              </Link>
              <span className="w-px h-4 bg-terminal-border" />
              <Link
                href="/admin"
                className="hover:text-terminal-warn transition-colors"
              >
                ADMIN
              </Link>
            </div>
          </nav>
        </header>
        <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
          {children}
        </main>
        <footer className="border-t border-terminal-border py-6">
          <div className="max-w-6xl mx-auto px-4 flex items-center justify-between text-xs font-mono text-terminal-muted">
            <span>VBC Pulse &middot; AI-curated healthcare intelligence</span>
            <span className="hidden sm:inline">
              Powered by Claude &middot; Updated weekly
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
