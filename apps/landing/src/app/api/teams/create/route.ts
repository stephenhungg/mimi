// POST /api/teams/create  { name: string }
// creates a new team owned by the cookie user. their notion connection must
// already be provisioned (5 dbs exist) — we copy the owner's tokens + db ids
// into the team so all members write into one shared workspace.

import { NextRequest, NextResponse } from "next/server";
import { getConnection } from "@/lib/storage";
import { createTeam } from "@/lib/teams";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const userId = req.cookies.get("mimi_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "no session" }, { status: 401 });

  const conn = await getConnection(userId);
  if (!conn) return NextResponse.json({ error: "connect notion first" }, { status: 401 });
  if (!conn.dbs || !conn.hubPageId) {
    return NextResponse.json(
      { error: "provision your notion dbs first", hint: "go to /connected and click 'provision 5 dbs'" },
      { status: 400 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const name = (body.name ?? "").trim() || `${conn.workspaceName} mimi room`;

  try {
    const team = await createTeam({
      name,
      ownerUserId: userId,
      ownerConnection: conn,
    });
    return NextResponse.json({
      ok: true,
      team: { id: team.id, name: team.name, livekitRoom: team.livekitRoom, workspaceName: team.workspaceName },
    });
  } catch (e) {
    return NextResponse.json({ error: "create_failed", message: (e as Error).message }, { status: 500 });
  }
}
