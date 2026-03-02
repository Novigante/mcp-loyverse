# Changelog

All notable changes to this project will be documented in this file.

## [0.1.1] - 2026-03-02

### Fixed

- **Date presets ignore `DEFAULT_TIMEZONE` at month boundaries**: `startOfDayInTz` day-change detection failed when timezone offsets crossed month boundaries (e.g. `today` in `America/Mexico_City` resolved to wrong date when UTC had already crossed into the next month)
- **Explicit date-only `from`/`to` strings parsed as UTC**: date-only strings (`YYYY-MM-DD`) are now interpreted as start/end of day in the configured `DEFAULT_TIMEZONE` instead of UTC midnight

### Added

- **Integration test Phase 7 — Timezone awareness**: 4 tests validating receipts and sales summaries respect the configured timezone against the live Loyverse API
- **10 new unit tests**: month boundary presets (UTC-6 and UTC+9), date-only explicit ranges with timezone

## [0.1.0] - 2026-02-25

### Added

- **MCP Server** with stdio transport using `@modelcontextprotocol/sdk`
- **Configuration** with Zod validation, secret redaction, and structured logging
- **HTTP Client** with retry logic (exponential backoff on 429, single retry on 5xx)
- **15 MCP tools**:
  - `healthcheck` — server status and configuration
  - `list_receipts` / `get_receipt` — receipt (ticket) queries
  - `list_items` / `get_item` — catalog item lookups
  - `list_employees` / `get_employee` — employee queries
  - `list_customers` / `get_customer` — customer queries
  - `list_stores` / `get_store` — store queries
  - `get_merchant` — merchant profile and currency info
  - `sales_summary` — aggregated sales metrics for a period
  - `top_selling_items` — top items by quantity or sales amount
  - `top_employees_by_sales` — top employees by sales or receipt count
- **Date range presets**: today, yesterday, this_week, this_month, last_7_days, last_30_days
- **Timezone-aware** date resolution (configurable via `DEFAULT_TIMEZONE`)
- **Auto-pagination** for analytics tools (up to 10,000 receipts)
- **Safety limits**: 90-day max date range, 10,000 receipt cap
- **194 tests** with full mock coverage
