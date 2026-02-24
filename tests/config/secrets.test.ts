import { describe, it, expect } from 'vitest';
import { maskSecret, isSecret, redactSecrets } from '../../src/config/secrets.js';

describe('maskSecret', () => {
  it('shows first 4 chars and masks the rest', () => {
    expect(maskSecret('abcdefghijklmnop')).toBe('abcd****');
  });

  it('masks short strings entirely', () => {
    expect(maskSecret('abc')).toBe('****');
  });

  it('masks empty string', () => {
    expect(maskSecret('')).toBe('****');
  });
});

describe('isSecret', () => {
  it('returns true for LOYVERSE_API_TOKEN', () => {
    expect(isSecret('LOYVERSE_API_TOKEN')).toBe(true);
  });

  it('returns true for case-insensitive variations', () => {
    expect(isSecret('loyverse_api_token')).toBe(true);
  });

  it('returns false for non-secret keys', () => {
    expect(isSecret('LOG_LEVEL')).toBe(false);
    expect(isSecret('DEFAULT_TIMEZONE')).toBe(false);
  });
});

describe('redactSecrets', () => {
  it('replaces token values with masked version', () => {
    const obj = {
      LOYVERSE_API_TOKEN: 'mysecrettoken123',
      LOG_LEVEL: 'info',
    };
    const result = redactSecrets(obj);
    expect(result.LOYVERSE_API_TOKEN).toBe('myse****');
    expect(result.LOG_LEVEL).toBe('info');
  });

  it('handles objects with no secrets', () => {
    const obj = { LOG_LEVEL: 'debug' };
    const result = redactSecrets(obj);
    expect(result.LOG_LEVEL).toBe('debug');
  });
});
