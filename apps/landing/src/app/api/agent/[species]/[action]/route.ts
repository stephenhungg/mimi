// agent router — single URL fans out to the right agent runtime.
// POST /api/agent/${species}/event     → forward to AGENT_${SPECIES}_URL/event
// POST /api/agent/${species}/dialogue  → forward to AGENT_${SPECIES}_URL/dialogue
//
// apps/web posts to ${VITE_AGENT_BASE_URL}/${species}/dialogue. set
// VITE_AGENT_BASE_URL=http://localhost:3000/api/agent and this route handles
// the species → port lookup centrally instead of needing a reverse proxy.

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALL_SPECIES = ["tiger", "otter", "bunny", "dog", "giraffe"] as const;
type Species = (typeof ALL_SPECIES)[number];

function isSpecies(s: string): s is Species {
  return (ALL_SPECIES as readonly string[]).includes(s);
}

function agentUrlFor(species: Species): string | undefined {
  const specific = process.env[`AGENT_${species.toUpperCase()}_URL`];
  if (specific) return specific;
  const base = process.env.AGENT_BASE_URL;
  if (base) return `${base.replace(/\/$/, "")}/${species}`;
  // dev convention: tiger=8081, otter=8082, bunny=8083, dog=8084, giraffe=8085
  const portMap: Record<Species, number> = { tiger: 8081, otter: 8082, bunny: 8083, dog: 8084, giraffe: 8085 };
  return `http://localhost:${portMap[species]}`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ species: string; action: string }> },
) {
  const { species, action } = await params;
  if (!isSpecies(species)) {
    return NextResponse.json({ error: `unknown species: ${species}` }, { status: 400, headers: cors() });
  }
  if (action !== "event" && action !== "dialogue") {
    return NextResponse.json({ error: `unknown action: ${action}` }, { status: 400, headers: cors() });
  }
  const target = agentUrlFor(species);
  if (!target) {
    return NextResponse.json({ error: `no AGENT_${species.toUpperCase()}_URL bound` }, { status: 502, headers: cors() });
  }
  try {
    const body = await req.text();
    const res = await fetch(`${target.replace(/\/$/, "")}/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { ...cors(), "content-type": res.headers.get("content-type") ?? "application/json" },
    });
  } catch (e) {
    return NextResponse.json({ error: `forward failed: ${(e as Error).message}` }, { status: 502, headers: cors() });
  }
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

function cors(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
