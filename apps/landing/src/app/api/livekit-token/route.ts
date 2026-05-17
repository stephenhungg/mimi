// mints a short-lived livekit jwt so a client can join the mimi. room.
// query: ?identity=<unique>&name=<display>&room=<roomName>
// the apps/web client (humans) and agents/runtime (agents) both call this.

import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "livekit not configured: set LIVEKIT_API_KEY + LIVEKIT_API_SECRET in apps/landing/.env.local" },
      { status: 500, headers: cors() },
    );
  }

  const sp = req.nextUrl.searchParams;
  const identity = sp.get("identity") ?? `guest-${Math.random().toString(36).slice(2, 8)}`;
  const name = sp.get("name") ?? identity;
  const room = sp.get("room") ?? process.env.LIVEKIT_ROOM ?? "mimi-house-main";
  const kind = sp.get("kind") ?? "human"; // "human" | "agent"

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name,
    metadata: JSON.stringify({ kind, name }),
    // 6 hours — plenty for a demo session.
    ttl: 60 * 60 * 6,
  });
  at.addGrant({
    room,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  });

  const token = await at.toJwt();
  return NextResponse.json(
    { token, url: process.env.LIVEKIT_URL ?? "", room, identity },
    { headers: cors() },
  );
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

function cors() {
  // demo: open to localhost dev. tighten in prod.
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
