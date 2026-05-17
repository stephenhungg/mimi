// /teams — list of teams the user is in + create-team form.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Team {
  id: string;
  name: string;
  workspaceName: string;
  workspaceIcon?: string;
  isOwner: boolean;
  roomId: string;
  createdAt: string;
}

interface Connection {
  connected: boolean;
  workspaceName?: string;
  dbs?: unknown;
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [conn, setConn] = useState<Connection | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    const [tRes, cRes] = await Promise.all([
      fetch("/api/teams/list").then((r) => r.json()),
      fetch("/api/notion/connection").then((r) => r.json()),
    ]);
    setTeams(tRes.teams ?? []);
    setConn(cRes);
  };

  useEffect(() => { void refresh(); }, []);

  const create = async () => {
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/teams/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message ?? body.error ?? "create failed");
        return;
      }
      setName("");
      await refresh();
    } finally {
      setCreating(false);
    }
  };

  const notConnected = !conn?.connected;
  const notProvisioned = conn?.connected && !conn.dbs;

  return (
    <main style={{ minHeight: "100vh", background: "var(--paper)", color: "var(--asphalt)", padding: "48px 24px", fontFamily: "ui-sans-serif, system-ui" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <Link href="/" style={{ fontSize: 13, opacity: 0.7, marginBottom: 32, display: "inline-block" }}>← back to mimi.</Link>
        <h1 style={{ margin: "0 0 8px", fontSize: 32 }}>your teams</h1>
        <p style={{ margin: "0 0 32px", opacity: 0.7 }}>a team is a shared 3D room + a shared notion workspace. invite teammates, assign agents.</p>

        {notConnected && (
          <div className="sticker" style={{ background: "var(--paper)", padding: 24, marginBottom: 24 }}>
            <p style={{ margin: "0 0 12px" }}>connect notion first to create a team.</p>
            <Link href="/api/notion/oauth/start" className="pill">connect notion →</Link>
          </div>
        )}
        {notProvisioned && (
          <div className="sticker" style={{ background: "var(--paper)", padding: 24, marginBottom: 24 }}>
            <p style={{ margin: "0 0 12px" }}>provision your notion dbs before creating a team.</p>
            <Link href="/connected" className="pill">provision dbs →</Link>
          </div>
        )}

        {conn?.connected && conn.dbs ? (
          <div className="sticker" style={{ background: "var(--paper)", padding: 24, marginBottom: 24 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 20 }}>create a team</h2>
            <p style={{ margin: "0 0 12px", fontSize: 14, opacity: 0.7 }}>
              the team will use <strong>{conn.workspaceName}</strong> as its notion backend. members can join via invite link without needing their own notion.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <input
                type="text"
                placeholder="team name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  flex: 1, padding: "10px 14px", border: "2px solid var(--asphalt)",
                  background: "var(--paper)", color: "var(--asphalt)", fontSize: 14, borderRadius: 6,
                }}
              />
              <button onClick={create} disabled={creating} className="pill" style={{ cursor: creating ? "wait" : "pointer" }}>
                {creating ? "creating…" : "create →"}
              </button>
            </div>
            {error && <p style={{ marginTop: 12, color: "#a00", fontSize: 13, fontFamily: "monospace" }}>{error}</p>}
          </div>
        ) : null}

        <h2 style={{ margin: "32px 0 16px", fontSize: 20 }}>teams you're in ({teams.length})</h2>
        {teams.length === 0 ? (
          <p style={{ opacity: 0.6 }}>no teams yet.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {teams.map((t) => (
              <Link key={t.id} href={`/teams/${t.id}`} className="sticker" style={{ background: "var(--paper)", padding: 20, textDecoration: "none", color: "var(--asphalt)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  {t.workspaceIcon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.workspaceIcon} alt="" width={32} height={32} style={{ borderRadius: 6 }} />
                  ) : (
                    <div style={{ width: 32, height: 32, background: "var(--asphalt)", color: "var(--paper)", borderRadius: 6, display: "grid", placeItems: "center", fontSize: 16 }}>🐕</div>
                  )}
                  <div>
                    <div style={{ fontWeight: 600 }}>{t.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.6 }}>{t.workspaceName}</div>
                  </div>
                </div>
                <div className="pixel" style={{ fontSize: 9, opacity: 0.5 }}>
                  {t.isOwner ? "OWNER" : "MEMBER"} · {t.roomId}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
