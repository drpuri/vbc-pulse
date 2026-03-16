import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "VBC Pulse",
  description:
    "AI-curated value-based care intelligence for healthcare executives",
};

const NAV_LINKS = [
  { href: "/aco", label: "ACO" },
  { href: "/risk-adjustment", label: "Risk Adj" },
  { href: "/quality-cost", label: "Quality" },
  { href: "/ai-vbc", label: "AI + VBC" },
  { href: "/earnings", label: "Earnings" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <nav className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <Link
              href="/"
              className="text-lg font-bold tracking-tight text-gray-900 hover:text-brand-600 transition-colors"
            >
              VBC Pulse
            </Link>
            <div className="hidden sm:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <span className="w-px h-5 bg-gray-200 mx-1" />
              <Link
                href="/admin"
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                Admin
              </Link>
            </div>
          </nav>
        </header>

        <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-8 w-full">
          {children}
        </main>

        <footer className="border-t border-gray-200 bg-white py-6">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between text-xs text-gray-400">
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
