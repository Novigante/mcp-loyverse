import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createRequire } from 'module';
import type { Config } from '../config/index.js';
import type { LoyverseHttpClient } from '../loyverse/httpClient.js';
import { registerTools } from './toolRegistry.js';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json') as { version: string };

export function createServer(config: Config, httpClient?: LoyverseHttpClient): McpServer {
  const server = new McpServer({
    name: 'mcp-loyverse',
    version,
  });

  registerTools(server, config, httpClient);

  return server;
}
