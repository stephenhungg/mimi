import { Agent } from "./Agent.js";
import { PERSONAL_AGENT_ID } from "./types.js";
export class AgentOperations {
    constructor(args) {
        this.client = args.client;
        this.auth = args.auth;
        this.baseUrl = args.baseUrl;
        this.notionVersion = args.notionVersion ?? "2025-09-03";
    }
    async list(args) {
        const query = {};
        if (args?.name)
            query.name = args.name;
        if (args?.start_cursor)
            query.start_cursor = args.start_cursor;
        if (args?.page_size)
            query.page_size = args.page_size;
        const response = await this.client.request({
            path: "agents",
            method: "get",
            query,
        });
        return response;
    }
    agent(agentId) {
        return new Agent({
            client: this.client,
            id: agentId,
            auth: this.auth,
            baseUrl: this.baseUrl,
            notionVersion: this.notionVersion,
        });
    }
    /**
     * @deprecated Personal agent access is unsupported and should not be
     * used for new integrations.
     */
    personal() {
        return this.agent(PERSONAL_AGENT_ID);
    }
}
