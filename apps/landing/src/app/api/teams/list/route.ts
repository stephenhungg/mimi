// GET /api/teams/list  → all teams the cookie user is a member of.

import { NextRequest, NextResponse } from "next/server";
import { listUserTeams } from "@/lib/teams";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const userId = req.cookies.get("mimi_user_id")?.value;
  if (!userId) return NextResponse.json({ teams: [] });
  const teams = await listUserTeams(userId);
  return NextResponse.json({
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      workspaceName: t.workspaceName,
      workspaceIcon: t.workspaceIcon,
      ownerUserId: t.ownerUserId,
      isOwner: t.ownerUserId === userId,
      roomId: t.roomId,
      createdAt: t.createdAt,
    })),
  });
}
