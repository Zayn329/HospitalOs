---
name: mcp-integration
description: |
  Use this skill when the user asks to configure, debug, implement, or connect Model Context Protocol (MCP) servers, tools, resources, or prompts to expand agent capabilities.
  Do NOT use for standard REST APIs or standard non-MCP integrations.
version: 1.0.0
---

# MCP Integration

## When to Use
Use this skill when exposing tools, prompts, or resource templates to an AI agent using the Model Context Protocol (MCP). This includes building server handlers, mapping JSON-schema parameters, and debugging standard MCP connections.

## Core Workflow
1. **Initialize MCP Server:** Set up the Server instance using the official MCP SDK (available in TypeScript or Python).
2. **Register Tool Definitions:** Declare tools with distinct names, descriptions, and strict JSON-schema parameters.
3. **Map Executions:** Connect tool names to execution callbacks containing backend operations.
4. **Define Resources/Prompts:** Expose read-only dynamic content, files, or pre-configured agent instructions.
5. **Set Up Transport Layer:** Configure stdio or Server-Sent Events (SSE) connections for communicating with the host client.
6. **Verify Protocol Compliance:** Test server discovery, schema listing, and error packets.

## Guidelines & Rationale
* **Explain Every Parameter Detail in Schemas:** The calling agent uses parameter description text to understand what inputs to feed a tool. Lacking descriptive schema text causes models to fail to trigger or input invalid values.
* **Return Structured Errors, Do Not Crash:** Catch execution failures inside tool handlers and return them in the response text array with `isError: true`. Crashing the server process breaks the agent's session entirely.
* **Enforce Strict Input Sanitization:** MCP tools run on the user's host environment. Clean and validate inputs to prevent path-traversal or remote execution vulnerabilities.

## Few-Shot Example
*Input:* "Create a TypeScript MCP server exposing a tool to list active hospital departments."
*Output:*
```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "hospital-departments-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Register Tool Schema
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_departments",
        description: "Fetch a list of active hospital departments and their status",
        inputSchema: {
          type: "object",
          properties: {
            facilityCode: {
              type: "string",
              description: "Optional code of the hospital branch to query",
            },
          },
        },
      },
    ],
  };
});

// Map execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "list_departments") {
    try {
      const facility = request.params.arguments?.facilityCode || "MAIN";
      const departments = [
        { name: "Emergency", status: "Active" },
        { name: "Pediatrics", status: "Active" }
      ];
      return {
        content: [{ type: "text", text: JSON.stringify(departments) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }
  throw new Error("Tool not found");
});

// Launch Transport
const transport = new StdioServerTransport();
await server.connect(transport);
```

## Constraints & Anti-Patterns
* Do NOT run commands or operations without parsing parameter types.
* Do NOT register tools with missing descriptions or empty schemas.
* Avoid using SSE transports when a simple stdio transport meets requirements.

## Evaluation Cases
```json
[
  {
    "id": "mcp-server-initialization",
    "input": "Write a python script initializing a basic MCP server instance.",
    "expected_tools": ["write_to_file"],
    "expected_output": "A Python MCP initialization with server definition, tool decorator mappings, and Stdio connection start."
  },
  {
    "id": "mcp-tool-definition",
    "input": "Register a new query tool listing patient record fields in the schema.",
    "expected_tools": ["write_to_file"],
    "expected_output": "A tool registration containing exact schema field explanations and property constraints."
  },
  {
    "id": "mcp-error-handling",
    "input": "Correct an MCP handler throwing raw exceptions inside CallToolRequestSchema.",
    "expected_tools": ["replace_file_content"],
    "expected_output": "An updated handler catching exceptions and returning an execution response with isError set to true."
  }
]
```
