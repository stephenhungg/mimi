import { APIErrorCode, APIResponseError } from "@notionhq/client";
export class NotionAgentsError extends Error {
    constructor(message, code = "unknown_error") {
        super(message);
        this.name = "NotionAgentsError";
        this.code = code;
        Object.setPrototypeOf(this, NotionAgentsError.prototype);
    }
}
export class AgentNotFoundError extends NotionAgentsError {
    constructor(agentId) {
        super(`Agent ${agentId} not found`, "agent_not_found");
        this.name = "AgentNotFoundError";
        this.agentId = agentId;
        Object.setPrototypeOf(this, AgentNotFoundError.prototype);
    }
}
export class ThreadNotFoundError extends NotionAgentsError {
    constructor(threadId) {
        super(`Thread ${threadId} not found`, "thread_not_found");
        this.name = "ThreadNotFoundError";
        this.threadId = threadId;
        Object.setPrototypeOf(this, ThreadNotFoundError.prototype);
    }
}
export class PollingTimeoutError extends NotionAgentsError {
    constructor(attempts) {
        super(`Thread polling timed out after ${attempts} attempts`, "polling_timeout");
        this.name = "PollingTimeoutError";
        this.attempts = attempts;
        Object.setPrototypeOf(this, PollingTimeoutError.prototype);
    }
}
export class StreamError extends NotionAgentsError {
    constructor(message, code) {
        super(message, code);
        this.name = "StreamError";
        Object.setPrototypeOf(this, StreamError.prototype);
    }
}
function getErrorCode(error) {
    if (APIResponseError.isAPIResponseError(error)) {
        return error.code;
    }
    if (error && typeof error === "object" && "code" in error) {
        const code = error.code;
        if (typeof code === "string") {
            return code;
        }
    }
    return undefined;
}
function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    if (error && typeof error === "object" && "message" in error) {
        const message = error.message;
        if (typeof message === "string") {
            return message;
        }
    }
    return undefined;
}
function parseObjectNotFoundTypeFromMessage(message) {
    const match = message.match(/Could not find (agent|thread) with ID:/);
    if (!match) {
        return undefined;
    }
    return match[1];
}
export function isObjectNotFoundErrorForType(error, objectType) {
    const code = getErrorCode(error);
    if (code !== APIErrorCode.ObjectNotFound) {
        return false;
    }
    const message = getErrorMessage(error);
    if (!message) {
        return false;
    }
    return parseObjectNotFoundTypeFromMessage(message) === objectType;
}
