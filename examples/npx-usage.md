# Using mcp-loyverse with npx

## Quick Start (without cloning)

If the package is published to npm, you can run it directly:

```bash
LOYVERSE_API_TOKEN=your_token_here npx mcp-loyverse
```

## Claude Code Configuration (npx)

Add to your Claude Code MCP settings (`~/.claude/settings.json` or project `.mcp.json`):

```json
{
  "mcpServers": {
    "loyverse": {
      "command": "npx",
      "args": ["-y", "mcp-loyverse"],
      "env": {
        "LOYVERSE_API_TOKEN": "your_personal_access_token_here",
        "DEFAULT_TIMEZONE": "America/Mexico_City"
      }
    }
  }
}
```

## From Source (local development)

```bash
git clone https://github.com/novigante/mcp-loyverse.git
cd mcp-loyverse
npm install
npm run build

# Run directly
LOYVERSE_API_TOKEN=your_token_here npm start

# Or configure in Claude Code using the absolute path
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LOYVERSE_API_TOKEN` | Yes | — | Your Loyverse Personal Access Token |
| `LOYVERSE_BASE_URL` | No | `https://api.loyverse.com/v1.0` | API base URL |
| `DEFAULT_TIMEZONE` | No | `UTC` | Timezone for date presets |
| `LOG_LEVEL` | No | `info` | Log level: debug, info, warn, error |
| `MCP_READ_ONLY` | No | `true` | Read-only mode (always true in v0.1) |

## Getting a Loyverse API Token

1. Log in to your [Loyverse Back Office](https://my.loyverse.com/)
2. Go to **Settings** > **Personal Access Tokens**
3. Create a new token with read permissions
4. Copy the token and use it as `LOYVERSE_API_TOKEN`
