// mimi. landing — asphalt + paper, animal-crossing-coded, sticker-pack frames.

import Image from "next/image";

const SQUAD = [
  { species: "tiger",   sprite: "/tiger.png",   watches: "github",    motto: "tests are sacred",          color: "var(--accent-tiger)"   },
  { species: "otter",   sprite: "/otter.png",   watches: "gmail",     motto: "no email left behind",      color: "var(--accent-otter)"   },
  { species: "bunny",   sprite: "/bunny.png",   watches: "calendar",  motto: "always five minutes early", color: "var(--accent-bunny)"   },
  { species: "mimi",    sprite: "/dog.png",     watches: "oversight", motto: "everyone goes home safe",   color: "var(--accent-dog)"     },
  { species: "giraffe", sprite: "/giraffe.png", watches: "notion",    motto: "i wrote that down",         color: "var(--accent-giraffe)" },
];

const PILLARS = [
  { title: "notion is canonical",          body: "5 dbs — residents, events, artifacts, conversations, agent_memory. every action in the 3D room writes back. the notion page IS the dashboard." },
  { title: "agents react in real time",    body: "tiger jolts on a github push. bunny twitches on a calendar invite. mimi (the dog) dispatches the team. they walk to their desks and slam keyboards." },
  { title: "failure is a first-class state", body: "when an agent rate-limits or crashes, it curls into a slime puddle. mimi walks over and asks 'you good?'. most demos hide failure — we celebrate it." },
  { title: "built on notion's dev platform", body: "6 notion workers (events, github-bridge, overnight-pulse, thumbnail-render, mcp-server, notion-agents). uses the official notion-agents-sdk-js." },
];

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--paper)", color: "var(--asphalt)" }}>
      {/* nav */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 48px" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Image src="/icon.png" alt="" width={36} height={36} />
          <span className="pixel" style={{ fontSize: 11 }}>mimi.</span>
        </div>
        <div style={{ display: "flex", gap: 24, fontSize: 14 }}>
          <a href="#squad">the squad</a>
          <a href="#how">how it works</a>
          <a href="https://github.com/stephenhung/mimi" target="_blank" rel="noreferrer">github</a>
        </div>
      </nav>

      {/* hero */}
      <section style={{ padding: "80px 48px 120px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}>
          <div>
            <Image src="/wordmark.png" alt="mimi." width={420} height={140} priority style={{ marginBottom: 32 }} />
            <h1 style={{ fontSize: 48, lineHeight: 1.1, fontWeight: 600, margin: "0 0 24px" }}>
              the 3D agent workspace<br />for your notion team.
            </h1>
            <p style={{ fontSize: 20, opacity: 0.8, margin: "0 0 32px", maxWidth: 460 }}>
              chibi animals that watch your tools. one cozy room. notion is the ground truth.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
              <a href="/onboard" className="pill">build your squad →</a>
              <a href="#how" className="pill" style={{ background: "var(--paper)", color: "var(--asphalt)" }}>see the demo</a>
            </div>
          </div>
          <div>
            <Image src="/hero.png" alt="mimi. room hero" width={640} height={640} className="sticker" priority />
          </div>
        </div>
      </section>

      {/* notion thumbnail section */}
      <section style={{ background: "var(--asphalt)", color: "var(--paper)", padding: "80px 48px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <p className="pixel" style={{ fontSize: 11, opacity: 0.7, marginBottom: 16 }}>// LAYER A · NOTION DASHBOARD</p>
          <h2 style={{ fontSize: 36, fontWeight: 600, margin: "0 0 16px" }}>
            the room renders inside your notion page.
          </h2>
          <p style={{ fontSize: 18, opacity: 0.8, maxWidth: 640, margin: "0 auto 40px" }}>
            a live svg thumbnail of the 3D room, refreshed every few seconds. click it → drop into the world.
          </p>
          <div style={{ maxWidth: 820, margin: "0 auto" }}>
            <Image
              src="/room.png"
              alt="notion thumbnail preview"
              width={1024}
              height={576}
              className="sticker"
              style={{ borderColor: "var(--paper)", boxShadow: "6px 6px 0 var(--paper)" }}
            />
          </div>
        </div>
      </section>

      {/* squad roster */}
      <section id="squad" style={{ padding: "80px 48px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p className="pixel" style={{ fontSize: 11, opacity: 0.7, marginBottom: 16 }}>// THE ROSTER</p>
          <h2 style={{ fontSize: 36, fontWeight: 600, margin: "0 0 48px" }}>five specialists. one open room.</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 24 }}>
            {SQUAD.map((a) => (
              <div key={a.species} className="sticker" style={{ background: "var(--paper)", padding: 16, textAlign: "center" }}>
                <Image src={a.sprite} alt={a.species} width={120} height={120} style={{ margin: "0 auto 12px", height: "auto" }} />
                <div className="pixel" style={{ fontSize: 10, textTransform: "uppercase", marginBottom: 4, color: a.color }}>
                  {a.species}
                </div>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>watches {a.watches}</div>
                <div style={{ fontSize: 12, fontStyle: "italic", opacity: 0.6 }}>“{a.motto}”</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* how it works */}
      <section id="how" style={{ background: "var(--asphalt)", color: "var(--paper)", padding: "80px 48px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p className="pixel" style={{ fontSize: 11, opacity: 0.7, marginBottom: 16 }}>// HOW IT WORKS</p>
          <h2 style={{ fontSize: 36, fontWeight: 600, margin: "0 0 48px" }}>two layers. ground truth in the middle.</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            {PILLARS.map((p) => (
              <div key={p.title} style={{ borderLeft: "4px solid var(--paper)", paddingLeft: 24 }}>
                <h3 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 8px" }}>{p.title}</h3>
                <p style={{ opacity: 0.8, lineHeight: 1.6, margin: 0 }}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* killshot teaser */}
      <section style={{ padding: "80px 48px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
          <p className="pixel" style={{ fontSize: 11, opacity: 0.7, marginBottom: 16 }}>// THE KILLSHOT</p>
          <h2 style={{ fontSize: 36, fontWeight: 600, margin: "0 0 24px" }}>
            commit → tiger jolts → PR opens → notion updates.<br />
            <span style={{ opacity: 0.6 }}>in under 2 seconds.</span>
          </h2>
          <p style={{ fontSize: 18, opacity: 0.8, marginBottom: 40 }}>
            push real code. watch the chibi tiger run to its desk, slam its keyboard, animalese-chirp the diagnosis, and file the artifact. all of it lands as live rows in your notion workspace.
          </p>
          <a href="/onboard" className="pill">enter the room →</a>
        </div>
      </section>

      {/* footer */}
      <footer style={{ background: "var(--asphalt)", color: "var(--paper)", padding: "48px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Image src="/icon.png" alt="" width={32} height={32} />
            <span className="pixel" style={{ fontSize: 11 }}>mimi.</span>
            <span style={{ opacity: 0.6, fontSize: 13 }}>— built for the notion developer platform hackathon, may 2026.</span>
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 13, opacity: 0.7 }}>
            <a href="https://github.com/stephenhung/mimi" target="_blank" rel="noreferrer">github</a>
            <span>·</span>
            <span>MIT</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
