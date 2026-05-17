// mimi-notion-agents — sponsor flex.
//
// wraps the official notion agents sdk (`@notionhq/agents-client`, installed
// from github:makenotion/notion-agents-sdk-js) so mimi. can dispatch any
// notion-hosted custom agent during the demo. this is the bridge that makes
// mimi. the only entry that uses BOTH:
//   - notion-hosted custom agents (via this worker)
//   - hand-rolled claude agents (via agents/runtime)
//
// tools exposed:
//   - list_notion_agents     → all custom agents in the workspace
//   - summon_notion_agent    → chat() + poll + collect agent reply text

import { Worker } from "@notionhq/workers";
import { j } from "@notionhq/workers/schema-builder";
import type { JSONValue } from "@notionhq/workers/types";
import { NotionAgentsClient } from "@notionhq/agents-client";

const worker = new Worker();
export default worker;

const NOTION_VERSION = "2025-09-03";

function notionToken(): string {
	const tok = process.env.MIMI_NOTION_TOKEN ?? process.env.NOTION_API_TOKEN;
	if (!tok) throw new Error("mimi-notion-agents: missing MIMI_NOTION_TOKEN / NOTION_API_TOKEN");
	return tok;
}

function asJson(v: unknown): JSONValue {
	return JSON.parse(JSON.stringify(v)) as JSONValue;
}

// ─── tool: list_notion_agents ───────────────────────────────────────────────

worker.tool("list_notion_agents", {
	title: "list notion agents",
	description: "returns all notion-hosted custom agents in the workspace, via the official notion agents sdk.",
	schema: j.object({}),
	outputSchema: j.object({
		agents: j.array(
			j.object({
				id: j.string(),
				name: j.string(),
			}),
		),
	}),
	execute: async () => {
		const client = new NotionAgentsClient({
			auth: notionToken(),
			notionVersion: NOTION_VERSION,
		});
		const res = await client.agents.list({ page_size: 100 });
		const agents = res.results.map((a) => ({ id: a.id, name: a.name ?? "" }));
		return asJson({ agents });
	},
});

// ─── tool: summon_notion_agent ──────────────────────────────────────────────

worker.tool("summon_notion_agent", {
	title: "summon notion agent",
	description:
		"invoke a notion-hosted custom agent by id with a message, poll until the thread completes, and return the agent's reply text.",
	schema: j.object({
		agentId: j.string().describe("the notion custom agent id"),
		message: j.string().describe("the prompt to send to the custom agent"),
	}),
	outputSchema: j.object({
		ok: j.boolean(),
		text: j.string().nullable(),
		threadId: j.string().nullable(),
		error: j.string().nullable(),
	}),
	execute: async ({ agentId, message }) => {
		try {
			const client = new NotionAgentsClient({
				auth: notionToken(),
				notionVersion: NOTION_VERSION,
			});
			const agent = client.agents.agent(agentId);
			const invocation = await agent.chat({ message });
			const threadId = invocation.thread_id;

			// poll until the thread completes (or fails), then pull messages.
			const final = await agent.pollThread(threadId, {
				maxAttempts: 30,
				initialDelayMs: 500,
				baseDelayMs: 1000,
				maxDelayMs: 5000,
			});
			if (final.status === "failed") {
				return asJson({
					ok: false,
					text: null,
					threadId,
					error: final.error ?? "thread failed",
				});
			}

			const msgs = await agent.thread(threadId).listMessages({ page_size: 20 });
			// agent replies, most recent last per notion ordering — take the latest agent message.
			const agentMsgs = msgs.results.filter((m) => m.role === "agent");
			const text = agentMsgs.length > 0 ? agentMsgs[agentMsgs.length - 1].content : "";
			return asJson({ ok: true, text, threadId, error: null });
		} catch (err) {
			return asJson({
				ok: false,
				text: null,
				threadId: null,
				error: err instanceof Error ? err.message : String(err),
			});
		}
	},
});

// ─── tool: health ───────────────────────────────────────────────────────────

worker.tool("notion_agents_health", {
	title: "notion agents health",
	description: "ok if the worker is reachable and the sdk import resolves.",
	schema: j.object({}),
	execute: () => ({
		status: "ok",
		worker: "mimi-notion-agents",
		ts: new Date().toISOString(),
	}),
});
