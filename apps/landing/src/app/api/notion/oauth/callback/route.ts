// notion oauth callback.
// notion redirects here with ?code=&state=. we:
//   1. verify state matches a record we created at /oauth/start
//   2. POST to notion's /v1/oauth/token with basic auth
//   3. save the connection (access_token, workspace_id, etc) in storage
//   4. redirect to /connected (success page) — provisioning happens on demand

import { NextRequest, NextResponse } from "next/server";
import { consumeOAuthState, saveConnection } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface NotionOAuthTokenResponse {
  access_token: string;
  token_type: "bearer";
  bot_id: string;
  workspace_name: string;
  workspace_icon?: string;
  workspace_id: string;
  owner?: {
    type?: string;
    user?: { id?: string; name?: string; avatar_url?: string };
    workspace?: boolean;
  };
  duplicated_template_id?: string | null;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const errParam = req.nextUrl.searchParams.get("error");

  if (errParam) {
    return NextResponse.redirect(new URL(`/connected?error=${encodeURIComponent(errParam)}`, req.url));
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL("/connected?error=missing_code_or_state", req.url));
  }

  // verify state — comes back from saveOAuthState(state, userId) on /start.
  const userId = await consumeOAuthState(state);
  if (!userId) {
    return NextResponse.redirect(new URL("/connected?error=invalid_state", req.url));
  }

  const clientId = process.env.NOTION_OAUTH_CLIENT_ID;
  const clientSecret = process.env.NOTION_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.NOTION_OAUTH_REDIRECT_URI ?? `${req.nextUrl.origin}/api/notion/oauth/callback`;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/connected?error=server_not_configured", req.url));
  }

  // token exchange — basic auth with client_id:client_secret, json body.
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  let tokRes: Response;
  try {
    tokRes = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });
  } catch (e) {
    return NextResponse.redirect(new URL(`/connected?error=${encodeURIComponent("network: " + (e as Error).message)}`, req.url));
  }
  if (!tokRes.ok) {
    const body = await tokRes.text().catch(() => "");
    return NextResponse.redirect(new URL(`/connected?error=${encodeURIComponent(`token_exchange_${tokRes.status}: ${body.slice(0, 200)}`)}`, req.url));
  }
  const tok = (await tokRes.json()) as NotionOAuthTokenResponse;

  await saveConnection({
    userId,
    accessToken: tok.access_token,
    workspaceId: tok.workspace_id,
    workspaceName: tok.workspace_name,
    workspaceIcon: tok.workspace_icon,
    botId: tok.bot_id,
    ownerName: tok.owner?.user?.name,
    ownerAvatar: tok.owner?.user?.avatar_url,
    connectedAt: new Date().toISOString(),
  });

  const redirect = new URL("/connected?ok=1", req.url);
  return NextResponse.redirect(redirect);
}
