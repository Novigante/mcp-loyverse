import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  LOYVERSE_API_TOKEN: z.string().min(1, 'LOYVERSE_API_TOKEN is required'),
  LOYVERSE_BASE_URL: z
    .string()
    .url()
    .default('https://api.loyverse.com/v1.0'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DEFAULT_TIMEZONE: z.string().default('UTC'),
  MCP_READ_ONLY: z.preprocess(
    (val) => {
      if (val === undefined || val === '') return true;
      if (typeof val === 'string') return val.toLowerCase() !== 'false' && val !== '0';
      return Boolean(val);
    },
    z.boolean(),
  ).default(true),
});

export interface Config {
  readonly loyverseApiToken: string;
  readonly loyverseBaseUrl: string;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
  readonly defaultTimezone: string;
  readonly mcpReadOnly: boolean;
}

export function loadConfig(): Config {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid configuration: ${issues}`);
  }

  const env = result.data;

  return Object.freeze({
    loyverseApiToken: env.LOYVERSE_API_TOKEN,
    loyverseBaseUrl: env.LOYVERSE_BASE_URL,
    logLevel: env.LOG_LEVEL,
    defaultTimezone: env.DEFAULT_TIMEZONE,
    mcpReadOnly: env.MCP_READ_ONLY,
  });
}
