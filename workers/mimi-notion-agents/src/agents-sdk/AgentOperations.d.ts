import { Client } from "@notionhq/client";
import { Agent } from "./Agent.js";
import type { AgentListResponse, AgentListParams } from "./types.js";
export declare class AgentOperations {
    private readonly client;
    private readonly auth;
    private readonly baseUrl;
    private readonly notionVersion;
    constructor(args: {
        client: Client;
        auth: string;
        baseUrl: string;
        notionVersion?: string;
    });
    list(args?: AgentListParams): Promise<AgentListResponse>;
    agent(agentId: string): Agent;
    /**
     * @deprecated Personal agent access is unsupported and should not be
     * used for new integrations.
     */
    personal(): Agent;
}
//# sourceMappingURL=AgentOperations.d.ts.map