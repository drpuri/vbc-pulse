"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SECTIONS } from "@/lib/sources";

interface SectionStats {
  id: string;
  name: string;
  total: number;
  avgUser: number;
  avgModel: number;
  addendum: string | null;
  addendumDate: string | null;
  articlesAnalyzed: number;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : null;
}

export default function AdminPage() {
  const [stats, setStats] = useState<SectionStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [secretInput, setSecretInput] = useState("");
  const [tuning, setTuning] = useState<string | null>(null);

  useEffect(() => {
    const cookie = getCookie("auth_secret");
    if (cookie) {
      setAuthed(true);
      loadStats(cookie);
    } else {
      setLoading(false);
    }
  }, []);

  async function loadStats(secret: string) {
    setLoading(true);
    try {
      // Fetch stats for each section from the feed endpoint
      const results = await Promise.all(
        SECTIONS.map(async (s) => {
          const [feedRes] = await Promise.all([
            fetch(`/api/feed/${s.id}?limit=1`),
          ]);
          const feedData = await feedRes.json();
          return {
            id: s.id,
            name: s.name,
            total: feedData.count || 0,
            avgUser: 0,
            avgModel: 0,
            addendum: null as string | null,
            addendumDate: null as string | null,
            articlesAnalyzed: 0,
          };
        })
      );
      setStats(results);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }

  function handleLogin() {
    document.cookie = `auth_secret=${secretInput}; path=/; max-age=${60 * 60 * 24 * 30}`;
    setAuthed(true);
    loadStats(secretInput);
  }

  async function triggerTune(sectionId: string) {
    const secret = getCookie("auth_secret");
    if (!secret) return;

    setTuning(sectionId);
    try {
      const res = await fetch("/api/feedback/tune", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-secret": secret,
        },
        body: JSON.stringify({ section: sectionId }),
      });
      const data = await res.json();
      if (data.ok && data.addendum) {
        setStats((prev) =>
          prev.map((s) =>
            s.id === sectionId
              ? {
                  ...s,
                  addendum: data.addendum.prompt,
                  addendumDate: data.addendum.generatedAt,
                  articlesAnalyzed: data.addendum.articlesAnalyzed,
                  avgUser: data.addendum.avgUserRating,
                  avgModel: data.addendum.avgModelRating,
                }
              : s
          )
        );
      }
    } catch {
      // silent fail
    } finally {
      setTuning(null);
    }
  }

  if (!authed) {
    return (
      <div className="max-w-md mx-auto py-20">
        <h1 className="font-mono text-xl font-bold mb-6">
          <span className="text-terminal-accent">&gt;</span> Admin Access
        </h1>
        <div className="card">
          <label className="block text-xs font-mono text-terminal-muted mb-2">
            AUTH_SECRET
          </label>
          <input
            type="password"
            value={secretInput}
            onChange={(e) => setSecretInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 font-mono text-sm text-terminal-text focus:border-terminal-accent focus:outline-none"
            placeholder="Enter secret..."
          />
          <button onClick={handleLogin} className="btn-primary mt-3 w-full">
            Authenticate
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/"
          className="text-xs font-mono text-terminal-muted hover:text-terminal-accent transition-colors"
        >
          &larr; Dashboard
        </Link>
        <h1 className="font-mono text-2xl font-bold mt-2">
          <span className="text-terminal-warn">&gt;</span> Admin Panel
        </h1>
        <p className="text-terminal-muted text-sm mt-1">
          Rating stats, feedback tuning, and system monitoring
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <span className="font-mono text-sm text-terminal-muted animate-pulse">
            Loading stats...
          </span>
        </div>
      ) : (
        <div className="space-y-6">
          {stats.map((s) => (
            <div key={s.id} className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-mono text-base font-bold">{s.name}</h2>
                <Link
                  href={`/${s.id}`}
                  className="text-xs font-mono text-terminal-accent hover:underline"
                >
                  View feed &rarr;
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-xs font-mono text-terminal-muted">
                    Articles
                  </div>
                  <div className="text-lg font-mono font-bold text-terminal-text">
                    {s.total}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-mono text-terminal-muted">
                    Avg User Rating
                  </div>
                  <div className="text-lg font-mono font-bold text-terminal-text">
                    {s.avgUser || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-mono text-terminal-muted">
                    Avg Model Score
                  </div>
                  <div className="text-lg font-mono font-bold text-terminal-text">
                    {s.avgModel || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-mono text-terminal-muted">
                    Rated Articles
                  </div>
                  <div className="text-lg font-mono font-bold text-terminal-text">
                    {s.articlesAnalyzed || "—"}
                  </div>
                </div>
              </div>

              {/* Addendum display */}
              {s.addendum && (
                <div className="bg-terminal-bg rounded p-3 mb-4 border border-terminal-border">
                  <div className="text-xs font-mono text-terminal-accent mb-1">
                    Current Addendum (
                    {s.addendumDate
                      ? new Date(s.addendumDate).toLocaleDateString()
                      : "unknown"}
                    )
                  </div>
                  <pre className="text-xs text-terminal-muted whitespace-pre-wrap font-mono">
                    {s.addendum}
                  </pre>
                </div>
              )}

              <button
                onClick={() => triggerTune(s.id)}
                disabled={tuning === s.id}
                className={`btn-ghost ${tuning === s.id ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {tuning === s.id ? "Tuning..." : "Tune Now"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-8 card">
        <h2 className="font-mono text-base font-bold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={async () => {
              const res = await fetch("/api/cron/refresh");
              const data = await res.json();
              alert(JSON.stringify(data, null, 2));
            }}
            className="btn-primary"
          >
            Trigger Refresh
          </button>
          <button
            onClick={() => {
              document.cookie =
                "auth_secret=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
              setAuthed(false);
            }}
            className="btn-ghost"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
