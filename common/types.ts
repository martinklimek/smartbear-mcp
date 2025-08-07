import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
export interface Client {
    registerTools(server: McpServer): void;
    registerResources?(server: McpServer): void;
    registerPrompts?(server: McpServer): void;
}
