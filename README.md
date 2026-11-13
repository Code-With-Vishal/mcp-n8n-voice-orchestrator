[![npm version](https://img.shields.io/npm/v/mcp-n8n-voice-orchestrator.svg)](https://www.npmjs.com/package/mcp-n8n-voice-orchestrator)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

# mcp-n8n-voice-orchestrator

A small Model Context Protocol (MCP) server that lets Claude (Desktop, Code, or the API) trigger self-hosted n8n webhook workflows with an idempotency key, plus a reference n8n workflow and Postgres schema for de-duplicating voice and messaging webhooks.

Status: early (v1.x). One MCP tool, one example workflow, one SQL schema. Feedback and PRs welcome.

## The problem

Voice and messaging automations often receive overlapping webhooks. For example, a Vapi end-of-call report and an inbound WhatsApp message can arrive within a few hundred milliseconds of each other. Without a lock, both can trigger an outbound message, and the lead gets double-texted.

This repo shows one way to handle it:

1. Claude calls an MCP tool with a stable `idempotencyKey` (a call ID or message ID).
2. The server forwards it to your n8n webhook with an `X-Idempotency-Key` header.
3. The n8n workflow tries to insert that key into Postgres/Supabase. Only the first delivery succeeds, so only one branch continues.

## What is in the repo

| Path | What it does |
| --- | --- |
| `src/index.ts` | MCP server (stdio). Exposes one tool, `dispatch_idempotent_n8n_workflow`, with Zod-validated input. Forwards the call to n8n with `X-Idempotency-Key` and `X-Source-Channel` headers. |
| `workflows/vapi-missed-call-recovery.json` | Example n8n workflow: webhook in, Postgres insert with `ON CONFLICT DO NOTHING`, then an IF node that separates first delivery from duplicates. Add your own WhatsApp/SMS nodes on the first-delivery branch. |
| `state-machine/schema.sql` | The `webhook_locks` table the workflow writes to. |
| `.env.example` | Environment variables for the server. |

The lock itself lives in the n8n workflow and database. The MCP server only forwards the key.

## Quick start

```bash
git clone https://github.com/Code-With-Vishal/mcp-n8n-voice-orchestrator.git
cd mcp-n8n-voice-orchestrator
npm install
cp .env.example .env
npm run build
```

Or install from npm:

```bash
npm i mcp-n8n-voice-orchestrator
```

1. Run `state-machine/schema.sql` in your Postgres or Supabase database.
2. Import `workflows/vapi-missed-call-recovery.json` into n8n and attach your Postgres credentials.
3. Set `N8N_WEBHOOK_BASE_URL` (and optionally `N8N_API_KEY`) in `.env`.

### Claude Desktop config

```json
{
  "mcpServers": {
    "n8n-voice-orchestrator": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-n8n-voice-orchestrator/dist/index.js"],
      "env": {
        "N8N_WEBHOOK_BASE_URL": "http://localhost:5678/webhook"
      }
    }
  }
}
```

## Tool reference

`dispatch_idempotent_n8n_workflow`

| Field | Type | Notes |
| --- | --- | --- |
| `workflowId` | string | n8n webhook path, appended to `N8N_WEBHOOK_BASE_URL` |
| `idempotencyKey` | string | Stable ID for the event, such as a call ID or message ID |
| `channel` | `vapi_voice` \| `twilio_sms` \| `whatsapp_cloud` | Sent as `X-Source-Channel` |
| `payload` | object | Forwarded as the JSON body, with a `timestamp` added |

## Roadmap

- [ ] Tests for the dispatch handler
- [ ] More example workflows (lead qualification, session handoff)
- [ ] CLI to generate MCP tool definitions from n8n workflow JSON

## Contributing

Issues and pull requests are welcome, especially anonymized n8n workflows that handle webhook de-duplication.

## License

MIT
