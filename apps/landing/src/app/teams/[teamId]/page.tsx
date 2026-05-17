// /teams/[teamId] — team dashboard: members, assigned agents, invite link, enter-room CTA.

"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface Assignment {
  userId: string;
  userName?: string;
  species: "tiger" | "otter" | "bunny" | "dog" | "giraffe";
  identity: string;
  assignedAt: string;
}

interface TeamState {
  id: string;
  name: string;
  workspaceName: string;
  workspaceIcon?: string;
  livekitRoom: string;
  isOwner: boolean;
  members: string[];
  assignments: Assignment[];
}

const SPECIES_LIST = ["tiger", "otter", "bunny", "dog", "giraffe"] as const;
const SPECIES_SPRITE: Record<string, string> = {
  tiger: "/tiger.png", otter: "/otter.png", bunny: "/bunny.png", dog: "/dog.png", giraffe: "/giraffe.png",
};
const SPECIES_WATCHES: Record<string, string> = {
  tiger: "github", otter: "gmail", bunny: "calendar", dog: "oversight", giraffe: "notion",
};
const SPECIES_COLOR: Record<string, string> = {
  tiger: "var(--accent-tiger)", otter: "var(--accent-otter)", bunny: "var(--accent-bunny)",
  dog: "var(--accent-dog)", giraffe: "var(--accent-giraffe)",
};

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:5173";

export default function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = use(params);
  const [team, setTeam] = useState<TeamState | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);

  const refresh = async () => {
    const res = await fetch(`/api/teams/${teamId}`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErr(body.error ?? `http ${res.status}`);
      return;
    }
    setTeam(await res.json());
  };
  useEffect(() => { void refresh(); }, [teamId]);

  const mintInvite = async () => {
    const res = await fetch(`/api/teams/${teamId}/invite`, { method: "POST" });
    const body = await res.json();
    if (res.ok) setInviteUrl(body.url);
  };

  const copyInvite = async () => {
    if (!inviteUrl) return;
    setCopying(true);
    try { await navigator.clipboard.writeText(inviteUrl); } catch {}
    setTimeout(() => setCopying(false), 1200);
  };

  const assign = async (species: string) => {
    await fetch(`/api/teams/${teamId}/assign`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ species }),
    });
    await refresh();
  };

  const enterRoom = `${WEB_URL}?team=${teamId}`;

  if (err) {
    return (
      <main style={{ minHeight: "100vh", padding: 48 }}>
        <Link href="/teams">← teams</Link>
        <h1>error</h1>
        <p style={{ fontFamily: "monospace" }}>{err}</p>
      </main>
    );
  }
  if (!team) return <main style={{ padding: 48 }}>loading…</main>;

  return (
    <main style={{ minHeight: "100vh", background: "var(--paper)", color: "var(--asphalt)", padding: "48px 24px", fontFamily: "ui-sans-serif, system-ui" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <Link href="/teams" style={{ fontSize: 13, opacity: 0.7 }}>← teams</Link>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 24, marginBottom: 32 }}>
          {team.workspaceIcon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={team.workspaceIcon} alt="" width={48} height={48} style={{ borderRadius: 8, border: "2px solid var(--asphalt)" }} />
          ) : (
            <div style={{ width: 48, height: 48, background: "var(--asphalt)", color: "var(--paper)", borderRadius: 8, display: "grid", placeItems: "center", fontSize: 24 }}>🐕</div>
          )}
          <div>
            <h1 style={{ margin: 0, fontSize: 28 }}>{team.name}</h1>
            <p style={{ margin: "4px 0 0", opacity: 0.6, fontSize: 14 }}>
              backed by <strong>{team.workspaceName}</strong> · {team.isOwner ? "you are the owner" : "you are a member"}
            </p>
          </div>
        </div>

        {/* enter room */}
        <div className="sticker" style={{ background: "var(--asphalt)", color: "var(--paper)", padding: 24, marginBottom: 24 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>enter the room</h2>
          <p style={{ margin: "0 0 16px", opacity: 0.85, fontSize: 14 }}>
            a shared 3D room. all members + all assigned agents live here. multiplayer presence via livekit room <code style={{ background: "rgba(255,255,255,.1)", padding: "2px 6px", borderRadius: 4 }}>{team.livekitRoom}</code>.
          </p>
          <a href={enterRoom} className="pill" style={{ background: "var(--paper)", color: "var(--asphalt)" }}>enter →</a>
        </div>

        {/* invite */}
        {team.isOwner && (
          <div className="sticker" style={{ background: "var(--paper)", padding: 24, marginBottom: 24 }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>invite teammates</h2>
            <p style={{ margin: "0 0 16px", opacity: 0.7, fontSize: 14 }}>
              generate a link. anyone with the link joins this team — they don't need their own notion to walk around the room.
            </p>
            {!inviteUrl ? (
              <button onClick={mintInvite} className="pill">generate invite link →</button>
            ) : (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input readOnly value={inviteUrl} style={{ flex: 1, padding: "10px 14px", border: "2px solid var(--asphalt)", borderRadius: 6, fontSize: 13, fontFamily: "monospace" }} />
                <button onClick={copyInvite} className="pill" style={{ cursor: "pointer" }}>{copying ? "copied!" : "copy"}</button>
              </div>
            )}
          </div>
        )}

        {/* members */}
        <div className="sticker" style={{ background: "var(--paper)", padding: 24, marginBottom: 24 }}>
          <h2 style={{ margin: "0 0 16px", fontSize: 20 }}>members ({team.members.length})</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {team.members.map((m) => (
              <span key={m} style={{ padding: "6px 12px", border: "2px solid var(--asphalt)", borderRadius: 999, fontSize: 12, fontFamily: "monospace" }}>
                {m === team.members[0] ? "👑 " : ""}{m.slice(0, 12)}
              </span>
            ))}
          </div>
        </div>

        {/* assigned agents */}
        <div className="sticker" style={{ background: "var(--paper)", padding: 24, marginBottom: 24 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>contribute an agent</h2>
          <p style={{ margin: "0 0 16px", opacity: 0.7, fontSize: 14 }}>
            pick a species — your contribution shows up in the shared room. duplicates allowed (two members can both contribute their tiger).
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
            {SPECIES_LIST.map((s) => (
              <button
                key={s}
                onClick={() => void assign(s)}
                className="sticker"
                style={{
                  background: "var(--paper)", padding: 12, cursor: "pointer", textAlign: "center",
                  transition: "transform 120ms ease",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={SPECIES_SPRITE[s]} alt={s} width={64} height={64} style={{ margin: "0 auto 6px", height: "auto" }} />
                <div className="pixel" style={{ fontSize: 9, color: SPECIES_COLOR[s] }}>{s}</div>
                <div style={{ fontSize: 10, opacity: 0.6 }}>{SPECIES_WATCHES[s]}</div>
              </button>
            ))}
          </div>

          <h3 style={{ margin: "16px 0 8px", fontSize: 16 }}>assigned to room ({team.assignments.length})</h3>
          {team.assignments.length === 0 ? (
            <p style={{ opacity: 0.5, fontSize: 13 }}>no agents assigned yet.</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexWrap: "wrap", gap: 8 }}>
              {team.assignments.map((a) => (
                <li key={a.identity} style={{ padding: "6px 12px", border: "2px solid var(--asphalt)", borderRadius: 999, fontSize: 12 }}>
                  <span style={{ color: SPECIES_COLOR[a.species] }} className="pixel">{a.species}</span>
                  <span style={{ opacity: 0.6 }}> · by {a.userId.slice(0, 8)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
