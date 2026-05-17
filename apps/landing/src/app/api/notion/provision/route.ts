// provisions the 5 mimi. dbs in the connected user's workspace.
// POST /api/notion/provision
// requires: mimi_user_id cookie + an existing connection
// behavior: creates a hub page "mimi. workspace" under the first grantable
// page found via /v1/search, then creates 5 dbs under it. idempotent: if a
// db with the canonical name already exists under the hub, reuses it.

import { NextRequest, NextResponse } from "next/server";
import { Client as NotionClient } from "@notionhq/client";
import { getConnection, updateConnection } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const DB_DEFS = [
  { key: "residents",     name: "mimi. residents",      icon: "🐾", build: residentsSchema },
  { key: "events",        name: "mimi. events",         icon: "📡", build: eventsSchema },
  { key: "artifacts",     name: "mimi. artifacts",      icon: "📦", build: artifactsSchema },
  { key: "conversations", name: "mimi. conversations",  icon: "💬", build: conversationsSchema },
  { key: "agentMemory",   name: "mimi. agent_memory",   icon: "🧠", build: agentMemorySchema },
] as const;

export async function POST(req: NextRequest) {
  const userId = req.cookies.get("mimi_user_id")?.value;
  if (!userId) return NextResponse.json({ error: "no session" }, { status: 401 });
  const conn = await getConnection(userId);
  if (!conn) return NextResponse.json({ error: "not connected to notion" }, { status: 401 });

  const notion = new NotionClient({ auth: conn.accessToken });

  try {
    // 1. find or create the hub page.
    let hubPageId = conn.hubPageId;
    if (!hubPageId) {
      // find any page the user granted us. notion's /v1/search returns pages
      // the integration has access to. we pick the first one as the parent.
      const search = await notion.search({
        filter: { property: "object", value: "page" },
        page_size: 5,
      });
      const firstPage = search.results.find((r) => r.object === "page") as { id: string } | undefined;
      if (!firstPage) {
        return NextResponse.json(
          {
            error: "no_granted_pages",
            hint: "during install, the user must grant mimi access to at least one page. ask them to re-run the install and pick a page on the consent screen.",
          },
          { status: 400 },
        );
      }
      const hub = await notion.pages.create({
        parent: { type: "page_id", page_id: firstPage.id },
        icon: { type: "emoji", emoji: "🐕" },
        properties: {
          title: { title: [{ type: "text", text: { content: "mimi. workspace" } }] },
        },
        children: [
          {
            object: "block",
            type: "callout",
            callout: {
              icon: { type: "emoji", emoji: "🐕" },
              rich_text: [
                {
                  type: "text",
                  text: {
                    content:
                      "this is your mimi. workspace. the 5 databases below are the canonical state for your 3D agent room — every action in the room writes back here.",
                  },
                },
              ],
            },
          },
        ],
      });
      hubPageId = hub.id;
    }

    // 2. create the 5 dbs under the hub (idempotent — list children first).
    const existing = await notion.blocks.children.list({ block_id: hubPageId, page_size: 50 });
    const existingByTitle = new Map<string, string>();
    for (const block of existing.results as Array<{ type?: string; id: string }>) {
      if (block.type !== "child_database") continue;
      const db = await notion.databases.retrieve({ database_id: block.id }).catch(() => null);
      if (!db) continue;
      const title = ((db as { title?: Array<{ plain_text?: string }> }).title ?? [])
        .map((t) => t.plain_text ?? "")
        .join("");
      existingByTitle.set(title, block.id);
    }

    const dbs: Record<string, string> = {};
    for (const def of DB_DEFS) {
      const existingId = existingByTitle.get(def.name);
      if (existingId) {
        dbs[def.key] = existingId;
        continue;
      }
      const created = await notion.databases.create({
        parent: { type: "page_id", page_id: hubPageId },
        title: [{ type: "text", text: { content: def.name } }],
        icon: { type: "emoji", emoji: def.icon as never },
        properties: def.build() as never,
      });
      dbs[def.key] = created.id;
    }

    const updated = await updateConnection(userId, {
      hubPageId,
      dbs: {
        residents: dbs.residents!,
        events: dbs.events!,
        artifacts: dbs.artifacts!,
        conversations: dbs.conversations!,
        agentMemory: dbs.agentMemory!,
      },
    });

    return NextResponse.json({
      ok: true,
      hubPageId,
      workspaceName: conn.workspaceName,
      dbs: updated?.dbs,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "provision_failed", message: (e as Error).message },
      { status: 500 },
    );
  }
}

// ─── schemas — duplicated from scripts/provision-notion-dbs.ts ─────────────
// (kept in sync manually. consider extracting to @mimi/notion-schemas if both
// the script + this route diverge in the future.)

function residentsSchema() {
  return {
    Name: { title: {} },
    Identity: { rich_text: {} },
    Kind: { select: { options: [{ name: "human", color: "blue" }, { name: "agent", color: "orange" }] } },
    Species: { select: { options: [
      { name: "tiger", color: "orange" },
      { name: "otter", color: "blue" },
      { name: "bunny", color: "pink" },
      { name: "dog", color: "yellow" },
      { name: "giraffe", color: "green" },
    ]}},
    Owner: { rich_text: {} },
    Watches: { select: { options: [
      { name: "github", color: "purple" },
      { name: "gmail", color: "red" },
      { name: "calendar", color: "yellow" },
      { name: "notion", color: "gray" },
      { name: "manual", color: "default" },
    ]}},
    "Joined At": { date: {} },
    Motto: { rich_text: {} },
  };
}

function eventsSchema() {
  return {
    Summary: { title: {} },
    Source: { select: { options: [
      { name: "github", color: "purple" }, { name: "gmail", color: "red" },
      { name: "calendar", color: "yellow" }, { name: "notion", color: "gray" }, { name: "manual", color: "default" },
    ]}},
    Type: { select: { options: [
      { name: "github.push", color: "purple" }, { name: "github.pull_request", color: "purple" },
      { name: "github.issues", color: "purple" }, { name: "gmail.thread", color: "red" },
      { name: "calendar.invite", color: "yellow" }, { name: "calendar.starting_soon", color: "yellow" },
      { name: "notion.meeting_notes", color: "gray" }, { name: "manual.poke", color: "default" },
    ]}},
    Timestamp: { date: {} },
    Agent: { select: { options: [
      { name: "tiger", color: "orange" }, { name: "otter", color: "blue" },
      { name: "bunny", color: "pink" }, { name: "dog", color: "yellow" }, { name: "giraffe", color: "green" },
    ]}},
    "Raw Payload": { rich_text: {} },
  };
}

function artifactsSchema() {
  return {
    Title: { title: {} },
    Kind: { select: { options: [
      { name: "pr_draft", color: "purple" }, { name: "calendar_entry", color: "yellow" },
      { name: "email_reply", color: "red" }, { name: "decision", color: "blue" }, { name: "note", color: "gray" },
    ]}},
    Body: { rich_text: {} },
    "Created By": { select: { options: [
      { name: "tiger", color: "orange" }, { name: "otter", color: "blue" },
      { name: "bunny", color: "pink" }, { name: "dog", color: "yellow" }, { name: "giraffe", color: "green" },
    ]}},
    Timestamp: { date: {} },
    URL: { url: {} },
  };
}

function conversationsSchema() {
  return {
    Topic: { title: {} },
    Timestamp: { date: {} },
    Participants: { rich_text: {} },
    Transcript: { rich_text: {} },
  };
}

function agentMemorySchema() {
  return {
    Identity: { title: {} },
    Species: { select: { options: [
      { name: "tiger", color: "orange" }, { name: "otter", color: "blue" },
      { name: "bunny", color: "pink" }, { name: "dog", color: "yellow" }, { name: "giraffe", color: "green" },
    ]}},
  };
}
