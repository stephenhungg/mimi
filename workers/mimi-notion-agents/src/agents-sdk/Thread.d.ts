import { Client } from "@notionhq/client";
import type { PollThreadOptions, ThreadMessageListParams, ThreadMessageListResponse, ThreadListItem } from "./types.js";
export declare class Thread {
    readonly threadId: string;
    readonly agentId: string;
    private readonly client;
    constructor(args: {
        client: Client;
        threadId: string;
        agentId: string;
    });
    get(): Promise<ThreadListItem>;
    listMessages(params?: ThreadMessageListParams): Promise<ThreadMessageListResponse>;
    poll(options?: PollThreadOptions): Promise<ThreadListItem>;
}
//# sourceMappingURL=Thread.d.ts.map