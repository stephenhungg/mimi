// POST /api/teams/[teamId]/assign  { species }
// the cookie user contributes one of their squad agents to this team's room.
// member must already be in the team.

import { NextRequest, NextResponse } from "next/server";
import { getTeam, listMembers, assignAgent, type Species } from "@/lib/teams";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID: Species[] = ["tiger", "otter", "bunny", "dog", "giraffe"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> },
) {
  const userId = req.cookies.get("mimi_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "no session" }, { status: 401 });

  const { teamId } = await params;
  const team = await getTeam(teamId);
  if (!team) return NextResponse.json({ error: "team not found" }, { status: 404 });
  const members = await listMembers(teamId);
  if (!members.includes(userId)) {
    return NextResponse.json({ error: "not a member" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { species?: string };
  const species = body.species as Species;
  if (!species || !VALID.includes(species)) {
    return NextResponse.json({ error: "invalid species" }, { status: 400 });
  }

  const assignment = await assignAgent({
    teamId,
    userId,
    species,
  });
  return NextResponse.json({ ok: true, assignment });
}
