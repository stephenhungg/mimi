// mimi-github-bridge — github webhook receiver.
//
// receives raw github push / pull_request / issues events, verifies the
// HMAC-SHA256 signature using Web Crypto (the workers runtime is not node, so
// no `node:crypto`), normalizes into an ExternalEvent, and forwards to the
// mimi-events worker. all canonical writes happen in mimi-events.

import { Worker, WebhookVerificationError } from "@notionhq/workers";
import { j } from "@notionhq/workers/schema-builder";
import type { JSONValue } from "@notionhq/workers/types";
import { ENV, type EventType, type ExternalEvent } from "../_shared/src/mimi.js";

function asJson(v: unknown): JSONValue {
	return JSON.parse(JSON.stringify(v)) as JSONValue;
}

const worker = new Worker();
export default worker;

// ─── HMAC-SHA256 verify via Web Crypto (workers-safe) ────────────────────────

const textEncoder = new TextEncoder();

function hexToBytes(hex: string): Uint8Array {
	if (hex.length % 2 !== 0) throw new Error("odd-length hex");
	const out = new Uint8Array(hex.length / 2);
	for (let i = 0; i < out.length; i++) {
		out[i] = parseInt(hex.substr(i * 2, 2), 16);
	}
	return out;
}

async function verifyGithubSignature(rawBody: string, headers: Record<string, string>): Promise<void> {
	const secret = process.env[ENV.GITHUB_WEBHOOK_SECRET];
	if (!secret) {
		throw new WebhookVerificationError("GITHUB_WEBHOOK_SECRET not configured");
	}
	const header = headers["x-hub-signature-256"];
	if (!header || !header.startsWith("sha256=")) {
		throw new WebhookVerificationError("missing or malformed x-hub-signature-256");
	}
	const providedHex = header.slice("sha256=".length);
	let providedBytes: Uint8Array;
	try {
		providedBytes = hexToBytes(providedHex);
	} catch {
		throw new WebhookVerificationError("invalid signature hex");
	}

	const key = await crypto.subtle.importKey(
		"raw",
		textEncoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["verify"],
	);

	const bodyBytes = textEncoder.encode(rawBody);
	// cast through ArrayBuffer to avoid TS lib lib strictness (SharedArrayBuffer vs ArrayBuffer).
	const sig = providedBytes.buffer.slice(providedBytes.byteOffset, providedBytes.byteOffset + providedBytes.byteLength);
	const msg = bodyBytes.buffer.slice(bodyBytes.byteOffset, bodyBytes.byteOffset + bodyBytes.byteLength);
	// crypto.subtle.verify is timing-safe by spec.
	const ok = await crypto.subtle.verify("HMAC", key, sig as ArrayBuffer, msg as ArrayBuffer);
	if (!ok) {
		throw new WebhookVerificationError("github signature mismatch");
	}
}

// ─── github event → ExternalEvent normalization ──────────────────────────────

function mapGithubEvent(ghEvent: string): EventType {
	switch (ghEvent) {
		case "push":
			return "github.push";
		case "pull_request":
			return "github.pull_request";
		case "issues":
			return "github.issues";
		default:
			return "github.push";
	}
}

function summarizeGithub(ghEvent: string, body: Record<string, unknown>): string {
	switch (ghEvent) {
		case "push": {
			const ref = String((body.ref as string | undefined) ?? "");
			const pusher = (body.pusher as { name?: string } | undefined)?.name ?? "someone";
			const commits = Array.isArray(body.commits) ? body.commits.length : 0;
			return `${pusher} pushed ${commits} commit(s) to ${ref}`;
		}
		case "pull_request": {
			const action = String((body.action as string | undefined) ?? "");
			const pr = body.pull_request as { number?: number; title?: string; user?: { login?: string } } | undefined;
			return `PR #${pr?.number ?? "?"} ${action}: ${pr?.title ?? ""} (by ${pr?.user?.login ?? "?"})`;
		}
		case "issues": {
			const action = String((body.action as string | undefined) ?? "");
			const issue = body.issue as { number?: number; title?: string } | undefined;
			return `issue #${issue?.number ?? "?"} ${action}: ${issue?.title ?? ""}`;
		}
		default:
			return `github ${ghEvent} event`;
	}
}

async function forwardToMimiEvents(event: ExternalEvent): Promise<void> {
	const url = process.env[ENV.MIMI_EVENTS_URL];
	if (!url) {
		console.warn("mimi-github-bridge: MIMI_EVENTS_URL not set — skipping forward");
		return;
	}
	try {
		const res = await fetch(url, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(event),
		});
		if (!res.ok) {
			console.warn(`mimi-github-bridge: events forward failed status=${res.status}`);
		}
	} catch (err) {
		console.warn("mimi-github-bridge: events forward threw", err);
	}
}

// ─── webhook: POST /github ───────────────────────────────────────────────────

worker.webhook("github", {
	title: "github webhook",
	description: "verifies x-hub-signature-256 then forwards normalized events to mimi-events.",
	execute: async (events) => {
		for (const event of events) {
			await verifyGithubSignature(event.rawBody, event.headers);

			const ghEvent = event.headers["x-github-event"] ?? "push";
			const type = mapGithubEvent(ghEvent);
			const summary = summarizeGithub(ghEvent, event.body);

			const normalized: ExternalEvent = {
				id: event.headers["x-github-delivery"] ?? event.deliveryId,
				source: "github",
				type,
				ts: new Date().toISOString(),
				payload: { summary, ...event.body },
				routeTo: "tiger",
			};

			console.log(`mimi-github-bridge: ${ghEvent} → ${summary}`);
			await forwardToMimiEvents(normalized);
		}
	},
});

// ─── tools ───────────────────────────────────────────────────────────────────

worker.tool("simulatePush", {
	title: "simulate github push",
	description: "fires a synthetic github.push ExternalEvent at mimi-events (demo helper).",
	schema: j.object({
		repo: j.string().describe("repo full_name, e.g. mimi-ai/opal"),
		message: j.string().describe("commit message"),
	}),
	execute: async ({ repo, message }) => {
		const event: ExternalEvent = {
			id: `sim-${Date.now()}`,
			source: "github",
			type: "github.push",
			ts: new Date().toISOString(),
			payload: {
				summary: `simulated push to ${repo}: ${message}`,
				repo,
				commits: [{ message, author: { name: "demo" } }],
			},
			routeTo: "tiger",
		};
		await forwardToMimiEvents(event);
		return asJson({ ok: true, event });
	},
});

worker.tool("health", {
	title: "health check",
	description: "returns ok if reachable.",
	schema: j.object({}),
	execute: () => ({ status: "ok", worker: "mimi-github-bridge", ts: new Date().toISOString() }),
});
