#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config/index.js';
import { createLogger } from './config/logger.js';
import { LoyverseHttpClient } from './loyverse/httpClient.js';
import { createServer } from './mcp/server.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);

  const httpClient = new LoyverseHttpClient({
    baseUrl: config.loyverseBaseUrl,
    token: config.loyverseApiToken,
  });

  const server = createServer(config, httpClient);
  const transport = new StdioServerTransport();

  await server.connect(transport);
  logger.info('mcp-loyverse server started', { transport: 'stdio' });

  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down mcp-loyverse server...');
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  // Logger may not be initialized yet, fall back to stderr
  process.stderr.write(`Fatal error starting mcp-loyverse: ${err}\n`);
  process.exit(1);
});
