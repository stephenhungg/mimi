// initiates the notion oauth flow.
// GET /api/notion/oauth/start → 302 to notion's authorize page.
// sets a mimi_user_id cookie (random) if not already set so we can correlate
// the callback back to a user record after redirect.

import { NextRequest, NextResponse } from "next/server";
import { randomToken, saveOAuthState } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const clientId = process.env.NOTION_OAUTH_CLIENT_ID;
  const redirectUri = process.env.NOTION_OAUTH_REDIRECT_URI ?? `${req.nextUrl.origin}/api/notion/oauth/callback`;
  if (!clientId) {
    return NextResponse.json(
      { error: "notion oauth not configured: set NOTION_OAUTH_CLIENT_ID in env" },
      { status: 500 },
    );
  }

  // mint or reuse a per-user opaque cookie. this is the "user id" for the
  // hackathon — no real auth, just enough to correlate oauth callbacks +
  // remember the connection across page loads on the same browser.
  let userId: string = req.cookies.get("mimi_user_id")?.value ?? "";
  if (!userId) userId = randomToken(16);

  // csrf state — notion will echo this back; we verify it matches a record
  // we created here. ties the callback to this user's session.
  const state = randomToken(24);
  await saveOAuthState(state, userId);

  const auth = new URL("https://api.notion.com/v1/oauth/authorize");
  auth.searchParams.set("client_id", clientId);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("owner", "user");
  auth.searchParams.set("redirect_uri", redirectUri);
  auth.searchParams.set("state", state);

  const res = NextResponse.redirect(auth.toString());
  // set the cookie if it wasn't set yet. http-only, lax, 30 days.
  res.cookies.set("mimi_user_id", userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
