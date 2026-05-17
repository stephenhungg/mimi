// POST /api/teams/join  { code: string } → join a team via invite code.
// mints the cookie if missing (so a teammate who's never visited can accept
// an invite link directly without needing to "connect notion" first — they
// can add notion later if they want their own personal squad).

import { NextRequest, NextResponse } from "next/server";
import { consumeInvite } from "@/lib/teams";
import { randomToken } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { code?: string };
  const code = (body.code ?? "").trim();
  if (!code) return NextResponse.json({ error: "missing code" }, { status: 400 });

  let userId = req.cookies.get("mimi_user_id")?.value ?? "";
  let needsCookie = false;
  if (!userId) {
    userId = randomToken(16);
    needsCookie = true;
  }

  const team = await consumeInvite(code, userId);
  if (!team) {
    return NextResponse.json({ error: "invalid_or_expired_invite" }, { status: 400 });
  }

  const res = NextResponse.json({
    ok: true,
    team: { id: team.id, name: team.name, workspaceName: team.workspaceName, roomId: team.roomId },
  });
  if (needsCookie) {
    res.cookies.set("mimi_user_id", userId, {
      httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
    });
  }
  return res;
}
