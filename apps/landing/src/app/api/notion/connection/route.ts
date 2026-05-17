// reads the current user's notion connection. used by the landing page to
// show "connected as: <workspace>" once oauth has completed.

import { NextRequest, NextResponse } from "next/server";
import { getConnection } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const userId = req.cookies.get("mimi_user_id")?.value;
  if (!userId) return NextResponse.json({ connected: false });
  const conn = await getConnection(userId);
  if (!conn) return NextResponse.json({ connected: false });
  // never return the access_token to the browser.
  const { accessToken: _hidden, ...safe } = conn;
  return NextResponse.json({ connected: true, ...safe });
}
