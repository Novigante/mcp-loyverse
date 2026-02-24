import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json') as { version: string };

interface HealthcheckContext {
  token: string;
  readOnly: boolean;
}

export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  [key: string]: unknown;
}

export async function healthcheckHandler(ctx: HealthcheckContext): Promise<ToolResult> {
  const data = {
    status: 'ok',
    version,
    readOnly: ctx.readOnly,
    configured: ctx.token.length > 0,
    timestamp: new Date().toISOString(),
  };

  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

export const healthcheckDefinition = {
  name: 'healthcheck',
  description: 'Check server status and configuration',
  inputSchema: {},
  annotations: {
    readOnlyHint: true,
  },
} as const;
