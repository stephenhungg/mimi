// POST /api/teams/[teamId]/invite → generate an invite code.
// only the team owner can mint invites (keeps demo simple).

import { NextRequest, NextResponse } from "next/server";
import { getTeam, createInvite } from "@/lib/teams";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> },
) {
  const userId = req.cookies.get("mimi_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "no session" }, { status: 401 });

  const { teamId } = await params;
  const team = await getTeam(teamId);
  if (!team) return NextResponse.json({ error: "team not found" }, { status: 404 });
  if (team.ownerUserId !== userId) {
    return NextResponse.json({ error: "only the owner can invite" }, { status: 403 });
  }

  const invite = await createInvite(teamId, userId);
  const url = new URL(`/teams/join?code=${invite.code}`, req.nextUrl.origin);
  return NextResponse.json({
    ok: true,
    code: invite.code,
    url: url.toString(),
    expiresAt: invite.expiresAt,
  });
}
