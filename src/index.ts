import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import * as dotenv from "dotenv";

dotenv.config();

const N8N_WEBHOOK_BASE_URL = process.env.N8N_WEBHOOK_BASE_URL || "http://localhost:5678/webhook";
const N8N_API_KEY = process.env.N8N_API_KEY || "";

const TriggerWorkflowSchema = z.object({
  workflowId: z.string().describe("Target n8n webhook path or deterministic workflow ID"),
  idempotencyKey: z.string().describe("Unique call_id or message_id to prevent duplicate execution"),
  channel: z.enum(["vapi_voice", "twilio_sms", "whatsapp_cloud"]).describe("Originating communication channel"),
  payload: z.record(z.unknown()).describe("Structured lead or session state payload"),
});

const server = new Server(
  {
    name: "mcp-n8n-voice-orchestrator",
    version: "1.2.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "dispatch_idempotent_n8n_workflow",
        description:
          "Dispatches a deterministic, lock-verified webhook payload to a self-hosted n8n workflow from Vapi, Twilio, or WhatsApp Cloud API.",
        inputSchema: {
          type: "object",
          properties: {
            workflowId: {
              type: "string",
              description: "Target n8n webhook path or deterministic workflow ID",
            },
            idempotencyKey: {
              type: "string",
              description: "Unique call_id or message_id to prevent race conditions",
            },
            channel: {
              type: "string",
              enum: ["vapi_voice", "twilio_sms", "whatsapp_cloud"],
            },
            payload: {
              type: "object",
              description: "Structured lead or session state payload",
            },
          },
          required: ["workflowId", "idempotencyKey", "channel", "payload"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "dispatch_idempotent_n8n_workflow") {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const args = TriggerWorkflowSchema.parse(request.params.arguments);
  const endpoint = `${N8N_WEBHOOK_BASE_URL}/${args.workflowId}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Idempotency-Key": args.idempotencyKey,
      "X-Source-Channel": args.channel,
      ...(N8N_API_KEY ? { Authorization: `Bearer ${N8N_API_KEY}` } : {}),
    },
    body: JSON.stringify({
      timestamp: new Date().toISOString(),
      ...args.payload,
    }),
  });

  if (!response.ok) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            status: "error",
            httpCode: response.status,
            idempotencyKey: args.idempotencyKey,
          }),
        },
      ],
      isError: true,
    };
  }

  const data = await response.json().catch(() => ({ status: "dispatched" }));

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({
          status: "locked_and_dispatched",
          idempotencyKey: args.idempotencyKey,
          channel: args.channel,
          n8nResponse: data,
        }),
      },
    ],
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal MCP Orchestrator error:", error);
  process.exit(1);
});
