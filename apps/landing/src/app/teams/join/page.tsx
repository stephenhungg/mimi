// /teams/join?code=... — accept an invite. mints a cookie if needed.

"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function JoinPage() {
  // useSearchParams must be wrapped in Suspense for next.js 15 prerender.
  return (
    <Suspense fallback={<JoinShell><p>loading…</p></JoinShell>}>
      <JoinInner />
    </Suspense>
  );
}

function JoinInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const code = sp.get("code") ?? "";
  const [status, setStatus] = useState<"idle" | "joining" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (!code || status !== "idle") return;
    setStatus("joining");
    fetch("/api/teams/join", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) {
          setError(body.error ?? "join failed");
          setStatus("error");
          return;
        }
        setTeamName(body.team.name);
        setTeamId(body.team.id);
        setStatus("done");
      })
      .catch((e) => {
        setError(String(e));
        setStatus("error");
      });
  }, [code, status]);

  return (
    <JoinShell>
      {!code && <p>missing invite code in URL.</p>}
      {status === "joining" && <p>joining…</p>}
      {status === "error" && (
        <div className="sticker" style={{ background: "var(--paper)", padding: 24 }}>
          <p style={{ color: "#a00", margin: 0, fontFamily: "monospace" }}>{error}</p>
        </div>
      )}
      {status === "done" && teamId && (
        <div className="sticker" style={{ background: "var(--paper)", padding: 32 }}>
          <p style={{ margin: "0 0 16px", fontSize: 18 }}>welcome to <strong>{teamName}</strong>.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button onClick={() => router.push(`/teams/${teamId}`)} className="pill">go to team →</button>
          </div>
        </div>
      )}
    </JoinShell>
  );
}

function JoinShell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: "100vh", background: "var(--paper)", color: "var(--asphalt)", padding: 48, fontFamily: "ui-sans-serif, system-ui" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
        <Link href="/" style={{ fontSize: 13, opacity: 0.7 }}>← back to mimi.</Link>
        <h1 style={{ margin: "32px 0 16px", fontSize: 28 }}>joining team</h1>
        {children}
      </div>
    </main>
  );
}
