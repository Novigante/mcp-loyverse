import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../../src/config/env.js';

describe('loadConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Clear all config-related vars
    delete process.env.LOYVERSE_API_TOKEN;
    delete process.env.LOYVERSE_BASE_URL;
    delete process.env.LOG_LEVEL;
    delete process.env.DEFAULT_TIMEZONE;
    delete process.env.MCP_READ_ONLY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('loads valid config correctly', () => {
    process.env.LOYVERSE_API_TOKEN = 'test-token-12345';
    const config = loadConfig();
    expect(config.loyverseApiToken).toBe('test-token-12345');
    expect(config.loyverseBaseUrl).toBe('https://api.loyverse.com/v1.0');
    expect(config.logLevel).toBe('info');
    expect(config.defaultTimezone).toBe('UTC');
    expect(config.mcpReadOnly).toBe(true);
  });

  it('throws when LOYVERSE_API_TOKEN is missing', () => {
    expect(() => loadConfig()).toThrow();
  });

  it('throws when LOYVERSE_API_TOKEN is empty string', () => {
    process.env.LOYVERSE_API_TOKEN = '';
    expect(() => loadConfig()).toThrow();
  });

  it('applies default values when optional vars are missing', () => {
    process.env.LOYVERSE_API_TOKEN = 'test-token-12345';
    const config = loadConfig();
    expect(config.loyverseBaseUrl).toBe('https://api.loyverse.com/v1.0');
    expect(config.logLevel).toBe('info');
    expect(config.defaultTimezone).toBe('UTC');
    expect(config.mcpReadOnly).toBe(true);
  });

  it('throws on invalid LOG_LEVEL', () => {
    process.env.LOYVERSE_API_TOKEN = 'test-token-12345';
    process.env.LOG_LEVEL = 'verbose';
    expect(() => loadConfig()).toThrow();
  });

  it('coerces MCP_READ_ONLY from string "true"', () => {
    process.env.LOYVERSE_API_TOKEN = 'test-token-12345';
    process.env.MCP_READ_ONLY = 'true';
    const config = loadConfig();
    expect(config.mcpReadOnly).toBe(true);
  });

  it('coerces MCP_READ_ONLY from string "false"', () => {
    process.env.LOYVERSE_API_TOKEN = 'test-token-12345';
    process.env.MCP_READ_ONLY = 'false';
    const config = loadConfig();
    expect(config.mcpReadOnly).toBe(false);
  });

  it('returns a frozen object', () => {
    process.env.LOYVERSE_API_TOKEN = 'test-token-12345';
    const config = loadConfig();
    expect(Object.isFrozen(config)).toBe(true);
  });

  it('does not expose token value in error messages', () => {
    process.env.LOYVERSE_API_TOKEN = '';
    try {
      loadConfig();
    } catch (e) {
      const message = (e as Error).message;
      expect(message).not.toContain('test-token');
    }
  });
});
