import { redactSecrets } from './secrets.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface Logger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

export function createLogger(level: LogLevel): Logger {
  const minLevel = LEVEL_ORDER[level];

  function log(lvl: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (LEVEL_ORDER[lvl] < minLevel) return;

    const timestamp = new Date().toISOString();
    const tag = `[${lvl.toUpperCase()}]`;
    let line = `${tag} [${timestamp}] ${message}`;

    if (data && Object.keys(data).length > 0) {
      const safe = redactSecrets(data);
      line += ` ${JSON.stringify(safe)}`;
    }

    process.stderr.write(line + '\n');
  }

  return {
    debug: (msg, data) => log('debug', msg, data),
    info: (msg, data) => log('info', msg, data),
    warn: (msg, data) => log('warn', msg, data),
    error: (msg, data) => log('error', msg, data),
  };
}
