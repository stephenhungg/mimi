import { Client } from "@notionhq/client";
import { Thread } from "./Thread.js";
import type { ChatAttachmentInput, ChatInvocationResponse, PollThreadOptions, StreamChunk, StreamMessage, ThreadInfo, ThreadListParams, ThreadListResponse, ThreadListItem } from "./types.js";
export declare class Agent {
    readonly id: string;
    readonly name?: string;
    readonly instruction?: string | null;
    private readonly client;
    private readonly baseUrl;
    private readonly auth;
    private readonly notionVersion;
    constructor(args: {
        client: Client;
        id: string;
        name?: string;
        instruction?: string | null;
        baseUrl: string;
        auth: string;
        notionVersion?: string;
    });
    private buildChatRequestBody;
    chat(args: {
        message: string;
        attachments?: ChatAttachmentInput[];
        threadId?: string;
    } | {
        message?: string;
        attachments: ChatAttachmentInput[];
        threadId?: string;
    }): Promise<ChatInvocationResponse>;
    thread(threadId: string): Thread;
    getThread(threadId: string): Promise<ThreadListItem>;
    pollThread(threadId: string, options?: PollThreadOptions): Promise<ThreadListItem>;
    listThreads(params?: ThreadListParams): Promise<ThreadListResponse>;
    private isAgentNotFoundError;
    chatStream(args: {
        message: string;
        attachments?: ChatAttachmentInput[];
        threadId?: string;
        verbose?: boolean;
        onMessage?: (message: StreamMessage) => void;
    }): AsyncGenerator<StreamChunk, ThreadInfo, undefined>;
    chatStream(args: {
        message?: string;
        attachments: ChatAttachmentInput[];
        threadId?: string;
        verbose?: boolean;
        onMessage?: (message: StreamMessage) => void;
    }): AsyncGenerator<StreamChunk, ThreadInfo, undefined>;
}
//# sourceMappingURL=Agent.d.ts.map