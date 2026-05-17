import { Client } from "@notionhq/client";
import { AgentOperations } from "./AgentOperations.js";
import type { ClientOptions } from "./types.js";
export declare class NotionAgentsClient extends Client {
    readonly agents: AgentOperations;
    constructor(options: ClientOptions);
}
//# sourceMappingURL=NotionAgentsClient.d.ts.map