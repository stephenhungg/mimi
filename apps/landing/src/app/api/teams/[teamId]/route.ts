// GET /api/teams/[teamId] → full team state (members, assigned agents, dbs).
// the cookie user must be a member.

import { NextRequest, NextResponse } from "next/server";
import { getTeam, listMembers, listAssignments } from "@/lib/teams";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
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
  const assignments = await listAssignments(teamId);

  return NextResponse.json({
    id: team.id,
    name: team.name,
    workspaceName: team.workspaceName,
    workspaceIcon: team.workspaceIcon,
    roomId: team.roomId,
    isOwner: team.ownerUserId === userId,
    members,
    assignments,
    // we expose db ids so the agent runtime + thumbnail worker can read them.
    // we do NOT expose the owner's accessToken — that lives server-side only.
    dbs: team.dbs,
  });
}
