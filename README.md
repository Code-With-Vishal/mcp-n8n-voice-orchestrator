# mcp-n8n-voice-orchestrator

A lightweight, deterministic **Model Context Protocol (MCP)** bridge and reference architecture designed to connect **Claude (Sonnet/Haiku/Opus)** and **Claude Code** directly to self-hosted **n8n** instances, **Vapi.ai** voice pipelines, **Twilio**, and **WhatsApp Cloud API**.

## Why This Exists (The Ecosystem Gap)
While n8n provides general workflow nodes and Anthropic's MCP standardizes tool-calling, production voice and messaging pipelines suffer from three critical bottlenecks:
1. **Race Conditions & Webhook Concurrency:** Out-of-order webhook arrivals between Vapi end-of-call reports and WhatsApp follow-up triggers.
2. **Sub-Second Latency Requirements:** Voice agents require deterministic state lookup (<300ms) before triggering LLM tool calls.
3. **Lack of Standardized MCP Schemas for Self-Hosted Automation:** Developers repeatedly rebuild boilerplate JSON-RPC wrappers to expose n8n webhook endpoints as verified Claude MCP tools.

## Core Architecture
- `/mcp-server`: TypeScript MCP server exposing n8n webhook workflows as strict, Zod-validated tools for Claude Desktop and Claude API.
- `/workflows`: Production-grade n8n JSON blueprints for missed-call recovery, deterministic lead qualification, and multi-channel session handoff.
- `/state-machine`: Supabase / PostgreSQL idempotency tables and row-level locking schemas to prevent duplicate outbound dispatches.

## Quick Start

```bash
git clone [https://github.com/Code-With-Vishal/mcp-n8n-voice-orchestrator.git](https://github.com/Code-With-Vishal/mcp-n8n-voice-orchestrator.git)
cd mcp-n8n-voice-orchestrator
npm install
cp .env.example .env
npm run build
