import { describe, it, expect } from 'vitest';
import { successResult, errorResult } from '../../../src/tools/_shared/toolResult.js';

describe('successResult', () => {
  it('wraps data in MCP text content format', () => {
    const data = { items: [{ id: '1', name: 'Coffee' }] };
    const result = successResult(data);

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(JSON.parse(result.content[0].text)).toEqual(data);
    expect(result.isError).toBeUndefined();
  });

  it('handles primitive data', () => {
    const result = successResult('hello');
    expect(JSON.parse(result.content[0].text)).toBe('hello');
  });
});

describe('errorResult', () => {
  it('formats error with isError flag', () => {
    const result = errorResult('NOT_FOUND', 'Receipt not found');

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.code).toBe('NOT_FOUND');
    expect(parsed.message).toBe('Receipt not found');
  });
});
