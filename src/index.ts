#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config/index.js';
import { LoyverseHttpClient } from './loyverse/httpClient.js';
import { createServer } from './mcp/server.js';

async function main(): Promise<void> {
  const config = loadConfig();

  const httpClient = new LoyverseHttpClient({
    baseUrl: config.loyverseBaseUrl,
    token: config.loyverseApiToken,
  });

  const server = createServer(config, httpClient);
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error('mcp-loyverse server started (stdio transport)');

  const shutdown = async (): Promise<void> => {
    console.error('Shutting down mcp-loyverse server...');
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Fatal error starting mcp-loyverse:', err);
  process.exit(1);
});
