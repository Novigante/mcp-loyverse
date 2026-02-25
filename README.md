# mcp-loyverse

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-stdio-purple.svg)](https://modelcontextprotocol.io/)

A local-first, read-only MCP server for the [Loyverse POS API](https://developer.loyverse.com/) that lets AI assistants query receipts, items, employees, customers, stores, and sales analytics — built for secure local use with Personal Access Tokens.

## What & Why

**mcp-loyverse** bridges the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) and the Loyverse POS API so that AI assistants like Claude can answer business questions about your point-of-sale data directly:

- *"What were today's total sales?"* — answered in a single tool call
- *"Which was the best-selling item this week?"* — aggregated automatically
- *"Show me the top employees by sales this month"* — with name resolution

Instead of the AI making dozens of paginated API calls, high-level analytics tools handle pagination, filtering, and aggregation internally, returning concise summaries that are token-efficient.

## Features

- **15 MCP tools** (1 system + 11 resource + 3 analytics)
- **Automatic pagination** for analytics — no manual cursor handling
- **Date presets** — `today`, `yesterday`, `this_week`, `this_month`, `last_7_days`, `last_30_days`
- **Timezone-aware** date resolution (configurable, defaults to UTC)
- **Read-only** — only GET requests, no data modification
- **Secure** — token never appears in logs or error messages
- **Structured logging** to stderr with configurable log level
- **Retry logic** — exponential backoff on 429 (rate limit), single retry on 5xx
- **Safety limits** — max 10,000 receipts per analytics query, 90-day max date range

## Requirements

- **Node.js 20+**
- **Loyverse account** with a [Personal Access Token](https://my.loyverse.com/) (Settings > Personal Access Tokens)

## Quick Start

### Option 1: From source

```bash
git clone https://github.com/novigante/mcp-loyverse.git
cd mcp-loyverse
npm install
npm run build
```

### Option 2: npx (if published to npm)

```bash
LOYVERSE_API_TOKEN=your_token npx mcp-loyverse
```

### Configure with Claude Code

Add to your MCP settings (`.mcp.json` or `~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "loyverse": {
      "command": "node",
      "args": ["/path/to/mcp-loyverse/dist/index.js"],
      "env": {
        "LOYVERSE_API_TOKEN": "your_personal_access_token_here",
        "DEFAULT_TIMEZONE": "America/Mexico_City"
      }
    }
  }
}
```

### Verify

Ask your AI assistant: *"Run the healthcheck tool"* — it should return server status and configuration info.

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LOYVERSE_API_TOKEN` | Yes | — | Loyverse Personal Access Token |
| `LOYVERSE_BASE_URL` | No | `https://api.loyverse.com/v1.0` | API base URL |
| `DEFAULT_TIMEZONE` | No | `UTC` | Timezone for date presets (e.g. `America/Mexico_City`) |
| `LOG_LEVEL` | No | `info` | Log verbosity: `debug`, `info`, `warn`, `error` |
| `MCP_READ_ONLY` | No | `true` | Read-only mode (always true in v0.1) |

## Available Tools

### System

| Tool | Description |
|------|-------------|
| `healthcheck` | Server status, version, and configuration check |

### Resource (CRUD read-only)

| Tool | Description | Key Inputs |
|------|-------------|------------|
| `list_receipts` | Search receipts by date, store, or receipt numbers | `period`, `from`/`to`, `store_id`, `receipt_numbers` |
| `get_receipt` | Get full receipt details | `receipt_number` |
| `list_items` | List catalog items | `items_ids`, `limit`, `cursor` |
| `get_item` | Get item details by ID | `item_id` |
| `list_employees` | List employees (staff, waiters, cashiers) | `employee_ids`, `limit`, `cursor` |
| `get_employee` | Get employee details by ID | `employee_id` |
| `list_customers` | List customers, optionally filter by email | `customer_ids`, `email`, `limit`, `cursor` |
| `get_customer` | Get customer details by ID | `customer_id` |
| `list_stores` | List all stores | `store_ids`, `show_deleted` |
| `get_store` | Get store details by ID | `store_id` |
| `get_merchant` | Get merchant profile and currency settings | *(none)* |

### Analytics (high-level, auto-paginated)

| Tool | Description | Key Inputs |
|------|-------------|------------|
| `sales_summary` | Revenue, receipt count, average ticket, taxes, tips | `period`, `from`/`to`, `store_id` |
| `top_selling_items` | Top items ranked by quantity or sales amount | `period`, `metric`, `limit` |
| `top_employees_by_sales` | Top employees by sales or receipt count (resolves names) | `period`, `metric`, `limit` |

## Example Prompts

- *"What were today's total sales?"*
- *"Show me the top 5 best-selling items this week"*
- *"Which employee had the highest sales this month?"*
- *"List all receipts from yesterday"*
- *"Get the details of receipt number R-1234"*
- *"What was the average ticket amount this week?"*
- *"What currency does the merchant use?"*

## Architecture

```
src/
  config/         Configuration (env validation, secrets, logger)
  loyverse/       HTTP client, API error handling, resource clients
  domain/         Analytics: pure aggregation functions, receipt collector
  tools/          MCP tool definitions and handlers
    _shared/      Date range helpers, pagination, result builders
  mcp/            MCP server setup and tool registry
  index.ts        Entrypoint (stdio transport)
```

Each tool exports `{ definition, handler }`. The `toolRegistry.ts` wires definitions into the MCP server. Analytics tools compose the receipt collector (auto-pagination) with pure aggregation functions.

## Security

- **Read-only** — only HTTP GET requests to the Loyverse API
- **Token protection** — the API token never appears in logs, error messages, or tool responses
- **Secret redaction** — structured log data is automatically sanitized
- **Local-first** — runs on your machine via stdio transport; no external server or network exposure

## Limitations (v0.1)

- **Read-only** — no creating, updating, or deleting resources
- **PAT only** — no OAuth flow; requires a Personal Access Token
- **stdio only** — no HTTP/SSE transport (designed for local MCP clients)
- **No caching** — every tool call fetches fresh data from the API
- **Analytics limit** — max 10,000 receipts per query; max 90-day date range

## Roadmap

- [ ] Write tools (create/update items, customers)
- [ ] OAuth 2.0 authentication flow
- [ ] HTTP/SSE transport for remote deployment
- [ ] Response caching with TTL
- [ ] Webhook support for real-time updates
- [ ] Inventory and stock level tools

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Write tests first (TDD) — `npm test`
4. Implement your changes
5. Verify: `npm run build && npm test && npm run lint`
6. Submit a pull request

## License

[Apache-2.0](LICENSE)
