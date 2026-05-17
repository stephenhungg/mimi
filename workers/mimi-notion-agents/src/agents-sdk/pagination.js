import { iteratePaginatedAPI, collectPaginatedAPI } from "@notionhq/client";
/**
 * Returns an async iterator over all agents.
 *
 * Automatically handles pagination, yielding agents one at a time.
 *
 * @param client - Notion agents client instance
 * @param params - Optional filtering and pagination parameters (start_cursor
 *   will be managed automatically)
 *
 * @example
 * ```typescript
 * for await (const agent of iterateAgents(client, { name: "Sales" })) {
 *   console.log(agent.name)
 * }
 * ```
 */
export function iterateAgents(client, params) {
    return iteratePaginatedAPI((args) => client.agents.list(args), params || {});
}
/**
 * Collects all agents into an in-memory array.
 *
 * Automatically handles pagination, returning all results at once.
 *
 * @param client - Notion agents client instance
 * @param params - Optional filtering and pagination parameters (start_cursor
 *   will be managed automatically)
 *
 * @example
 * ```typescript
 * const allAgents = await collectAgents(client)
 * console.log(`Found ${allAgents.length} agents`)
 * ```
 */
export function collectAgents(client, params) {
    return collectPaginatedAPI((args) => client.agents.list(args), params || {});
}
/**
 * Returns an async iterator over all threads for an agent.
 *
 * Automatically handles pagination, yielding threads one at a time.
 *
 * @param agent - Agent instance
 * @param params - Optional filtering and pagination parameters (start_cursor
 *   will be managed automatically)
 *
 * @example
 * ```typescript
 * const agent = client.agents.agent(agentId)
 * for await (const thread of iterateThreads(agent, { status: "completed" })) {
 *   console.log(thread.title)
 * }
 * ```
 */
export function iterateThreads(agent, params) {
    return iteratePaginatedAPI((args) => agent.listThreads(args), params || {});
}
/**
 * Collects all threads for an agent into an in-memory array.
 *
 * Automatically handles pagination, returning all results at once.
 *
 * @param agent - Agent instance
 * @param params - Optional filtering and pagination parameters (start_cursor
 *   will be managed automatically)
 *
 * @example
 * ```typescript
 * const agent = client.agents.agent(agentId)
 * const allThreads = await collectThreads(agent, { status: "completed" })
 * console.log(`Found ${allThreads.length} completed threads`)
 * ```
 */
export function collectThreads(agent, params) {
    return collectPaginatedAPI((args) => agent.listThreads(args), params || {});
}
/**
 * Returns an async iterator over all messages in a thread.
 *
 * Automatically handles pagination, yielding messages one at a time.
 *
 * @param thread - Thread instance
 * @param params - Optional filtering and pagination parameters (start_cursor
 *   will be managed automatically)
 *
 * @example
 * ```typescript
 * const thread = agent.thread(threadId)
 * for await (const message of iterateMessages(thread, { role: "agent" })) {
 *   console.log(`${message.role}: ${message.content}`)
 * }
 * ```
 */
export function iterateMessages(thread, params) {
    return iteratePaginatedAPI((args) => thread.listMessages(args), params || {});
}
/**
 * Collects all messages in a thread into an in-memory array.
 *
 * Automatically handles pagination, returning all results at once.
 *
 * @param thread - Thread instance
 * @param params - Optional filtering and pagination parameters (start_cursor
 *   will be managed automatically)
 *
 * @example
 * ```typescript
 * const thread = agent.thread(threadId)
 * const allMessages = await collectMessages(thread)
 * console.log(`Thread has ${allMessages.length} messages`)
 * ```
 */
export function collectMessages(thread, params) {
    return collectPaginatedAPI((args) => thread.listMessages(args), params || {});
}
