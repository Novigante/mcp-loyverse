import { describe, it, expect } from 'vitest';
import { healthcheckHandler } from '../../src/tools/healthcheck.js';

describe('healthcheck tool', () => {
  it('returns expected shape with configured=true when token present', async () => {
    const result = await healthcheckHandler({ token: 'some-token', readOnly: true });

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const data = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);
    expect(data.status).toBe('ok');
    expect(data.version).toBe('0.1.0');
    expect(data.readOnly).toBe(true);
    expect(data.configured).toBe(true);
    expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('returns configured=false when token is empty', async () => {
    const result = await healthcheckHandler({ token: '', readOnly: true });

    const data = JSON.parse((result.content[0] as { type: 'text'; text: string }).text);
    expect(data.configured).toBe(false);
  });

  it('does not expose the token value', async () => {
    const secret = 'super-secret-token-value';
    const result = await healthcheckHandler({ token: secret, readOnly: true });

    const text = (result.content[0] as { type: 'text'; text: string }).text;
    expect(text).not.toContain(secret);
  });
});
