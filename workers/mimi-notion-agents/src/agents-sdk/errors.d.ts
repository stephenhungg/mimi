export declare class NotionAgentsError extends Error {
    readonly code: string;
    constructor(message: string, code?: string);
}
export declare class AgentNotFoundError extends NotionAgentsError {
    readonly agentId: string;
    constructor(agentId: string);
}
export declare class ThreadNotFoundError extends NotionAgentsError {
    readonly threadId: string;
    constructor(threadId: string);
}
export declare class PollingTimeoutError extends NotionAgentsError {
    readonly attempts: number;
    constructor(attempts: number);
}
export declare class StreamError extends NotionAgentsError {
    constructor(message: string, code: string);
}
export type NotionApiObjectType = "agent" | "thread";
export declare function isObjectNotFoundErrorForType(error: unknown, objectType: NotionApiObjectType): boolean;
//# sourceMappingURL=errors.d.ts.map