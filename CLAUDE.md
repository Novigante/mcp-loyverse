# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run build              # Compile TypeScript to dist/
npm test                   # Run all tests (vitest)
npm run test:watch         # Run tests in watch mode
npm run lint               # ESLint on src/ and tests/
npm run format             # Prettier formatting
npm start                  # Run compiled server (requires LOYVERSE_API_TOKEN)
npm run build && npm test  # Full validation after changes
```

Run a single test file:
```bash
npx vitest run tests/tools/salesSummary.test.ts
```

## Architecture

MCP server for the Loyverse POS API. Read-only, stdio transport (stdout=MCP JSON, stderr=structured logs). Node 20+, strict ESM (NodeNext), Zod v4, @modelcontextprotocol/sdk v1.27.1.

### Tool pattern

Every tool in `src/tools/` exports `{ toolDefinition, toolHandler }`. The definition has name, description, inputSchema (Zod), and annotations. The handler is an async function receiving parsed input + API clients, returning `McpToolResult`.

Tools are registered in `src/mcp/toolRegistry.ts` which imports all 15 tools and wires them to the MCP server via `server.registerTool()`.

### Layers

- **`src/mcp/`** — Server creation (`server.ts`) and tool registration (`toolRegistry.ts`)
- **`src/tools/`** — Tool definitions + handlers; shared utilities in `_shared/` (result builders, date range presets)
- **`src/loyverse/`** — HTTP client with retry logic (429/5xx), resource clients (receipts, items, employees, customers, stores, merchant), typed responses in `types/`
- **`src/domain/analytics/`** — Auto-paginating receipt collector (10k limit) and pure aggregation functions
- **`src/config/`** — Env validation (Zod), structured logger (JSON to stderr), secret redaction

### Entry point

`src/index.ts` loads config, creates HTTP + resource clients, initializes MCP server with StdioServerTransport, handles SIGINT/SIGTERM.

## Key conventions

- `McpToolResult` must include `[key: string]: unknown` index signature for SDK compatibility
- `z.coerce.boolean()` does NOT handle `"false"` string correctly — use `z.preprocess()` instead
- TDD workflow: write tests first, then implementation
- Tests use Vitest globals, mock clients with `vi.spyOn()`, and factory helpers (`makeReceipt`, `makeLineItem`)
- Prettier: single quotes, semicolons, trailing commas, 100 char width
- Unused variables must be prefixed with `_`

## Loyverse API quirks

- Receipts use `receipt_number` (string), not UUID
- ID filter params are inconsistent: `items_ids` (plural) vs `store_id` (singular)
- Stores endpoint has no cursor pagination
- Receipt line items are inline (no extra API calls)
- `GET /merchant` provides `currency_code` + `decimal_places`
- Error format: `{ errors: [{ code, details, field? }] }`

## Environment variables

- `LOYVERSE_API_TOKEN` (required) — Personal Access Token
- `LOYVERSE_BASE_URL` — API base URL (default: Loyverse production)
- `DEFAULT_TIMEZONE` — For date presets (default: UTC)
- `LOG_LEVEL` — Logging verbosity
