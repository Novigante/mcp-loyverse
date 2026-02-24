import { describe, it, expect } from 'vitest';
import { normalizePagination, paginationSchema } from '../../../src/tools/_shared/pagination.js';

describe('normalizePagination', () => {
  it('applies default limit of 50 when not provided', () => {
    const result = normalizePagination({});
    expect(result.limit).toBe(50);
    expect(result.cursor).toBeUndefined();
  });

  it('passes through valid limit and cursor', () => {
    const result = normalizePagination({ limit: 100, cursor: 'abc123' });
    expect(result.limit).toBe(100);
    expect(result.cursor).toBe('abc123');
  });

  it('accepts limit of 1', () => {
    const result = normalizePagination({ limit: 1 });
    expect(result.limit).toBe(1);
  });

  it('accepts limit of 250', () => {
    const result = normalizePagination({ limit: 250 });
    expect(result.limit).toBe(250);
  });
});

describe('paginationSchema validation', () => {
  it('rejects limit below 1', () => {
    const result = paginationSchema.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects limit above 250', () => {
    const result = paginationSchema.safeParse({ limit: 251 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer limit', () => {
    const result = paginationSchema.safeParse({ limit: 10.5 });
    expect(result.success).toBe(false);
  });
});
