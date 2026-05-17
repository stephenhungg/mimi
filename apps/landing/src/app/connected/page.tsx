// post-oauth success/error page.
// reads /api/notion/connection and shows the connected workspace + a button
// to provision the 5 dbs. one-page client component.

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface Connection {
  connected: boolean;
  workspaceName?: string;
  workspaceIcon?: string;
  ownerName?: string;
  dbs?: { residents: string; events: string; artifacts: string; conversations: string; agentMemory: string };
  hubPageId?: string;
  connectedAt?: string;
}

type ProvisionState =
  | { status: "idle" }
  | { status: "provisioning" }
  | { status: "done"; dbCount: number }
  | { status: "error"; message: string };

export default function Connected() {
  const [conn, setConn] = useState<Connection | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [prov, setProv] = useState<ProvisionState>({ status: "idle" });

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const e = sp.get("error");
    if (e) setErr(e);
    fetch("/api/notion/connection")
      .then((r) => r.json())
      .then(setConn)
      .catch((e) => setErr(String(e)));
  }, []);

  const provision = async () => {
    setProv({ status: "provisioning" });
    try {
      const res = await fetch("/api/notion/provision", { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setProv({ status: "error", message: body.message ?? body.error ?? "provision failed" });
        return;
      }
      setProv({ status: "done", dbCount: Object.keys(body.dbs ?? {}).length });
      // refresh connection state.
      const next = await fetch("/api/notion/connection").then((r) => r.json());
      setConn(next);
    } catch (e) {
      setProv({ status: "error", message: (e as Error).message });
    }
  };

  return (
    <main style={{ minHeight: "100vh", background: "var(--paper)", color: "var(--asphalt)", padding: "48px 24px", fontFamily: "ui-sans-serif, system-ui" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, opacity: 0.7, marginBottom: 32 }}>
          ← back to mimi.
        </Link>

        {err && (
          <div className="sticker" style={{ background: "#fff0f0", padding: 24, marginBottom: 24 }}>
            <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>oauth error</h2>
            <p style={{ margin: 0, fontFamily: "monospace", fontSize: 13 }}>{err}</p>
            <Link href="/api/notion/oauth/start" className="pill" style={{ marginTop: 16, display: "inline-block" }}>try again →</Link>
          </div>
        )}

        {!conn && !err && <p>checking connection…</p>}

        {conn && !conn.connected && !err && (
          <div className="sticker" style={{ background: "var(--paper)", padding: 32 }}>
            <h2 style={{ margin: "0 0 16px" }}>not connected</h2>
            <p style={{ opacity: 0.8, marginBottom: 24 }}>connect your notion workspace to get started.</p>
            <Link href="/api/notion/oauth/start" className="pill">connect notion →</Link>
          </div>
        )}

        {conn && conn.connected && (
          <div className="sticker" style={{ background: "var(--paper)", padding: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
              {conn.workspaceIcon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={conn.workspaceIcon} alt="" width={48} height={48} style={{ borderRadius: 8, border: "2px solid var(--asphalt)" }} />
              ) : (
                <div style={{ width: 48, height: 48, background: "var(--asphalt)", color: "var(--paper)", borderRadius: 8, display: "grid", placeItems: "center", fontSize: 24 }}>🐕</div>
              )}
              <div>
                <div className="pixel" style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>// CONNECTED ✓</div>
                <h2 style={{ margin: 0, fontSize: 24 }}>{conn.workspaceName}</h2>
                {conn.ownerName && <p style={{ margin: "4px 0 0", fontSize: 13, opacity: 0.7 }}>owner: {conn.ownerName}</p>}
              </div>
            </div>

            {!conn.dbs && (
              <>
                <p style={{ opacity: 0.85, marginBottom: 20 }}>
                  next: provision the 5 mimi. dbs in your workspace. mimi. will create a hub page called <code>mimi. workspace</code> under the first page you granted access to, then add residents / events / artifacts / conversations / agent_memory dbs.
                </p>
                <button onClick={provision} disabled={prov.status === "provisioning"} className="pill" style={{ background: prov.status === "provisioning" ? "#888" : "var(--asphalt)", color: "var(--paper)", cursor: prov.status === "provisioning" ? "wait" : "pointer", border: "3px solid var(--asphalt)" }}>
                  {prov.status === "provisioning" ? "provisioning…" : "provision 5 dbs →"}
                </button>
                {prov.status === "error" && (
                  <p style={{ color: "#a00", marginTop: 16, fontFamily: "monospace", fontSize: 13 }}>error: {prov.message}</p>
                )}
              </>
            )}

            {conn.dbs && (
              <>
                <p style={{ opacity: 0.85, marginBottom: 12 }}>your mimi. workspace is fully provisioned:</p>
                <ul style={{ marginTop: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.8 }}>
                  <li>residents</li>
                  <li>events</li>
                  <li>artifacts</li>
                  <li>conversations</li>
                  <li>agent_memory</li>
                </ul>
                <p style={{ marginTop: 24 }}>
                  <Link href="/onboard" className="pill">build your squad →</Link>
                </p>
              </>
            )}

            {prov.status === "done" && (
              <p style={{ marginTop: 16, color: "#0a7", fontSize: 14 }}>✓ provisioned {prov.dbCount} dbs.</p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
