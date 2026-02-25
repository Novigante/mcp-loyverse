import { describe, it, expect } from 'vitest';
import { errorResult, handleToolError } from '../../../src/tools/_shared/toolResult.js';
import { LoyverseApiError, RateLimitError, NotFoundError } from '../../../src/loyverse/errors.js';

describe('errorResult — hardened format', () => {
  it('includes retryable flag (false by default)', () => {
    const result = errorResult('VALIDATION_ERROR', 'bad input');
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe('VALIDATION_ERROR');
    expect(data.message).toBe('bad input');
    expect(data.retryable).toBe(false);
  });

  it('includes retryable flag when passed true', () => {
    const result = errorResult('RATE_LIMITED', 'too many requests', true);
    const data = JSON.parse(result.content[0].text);
    expect(data.retryable).toBe(true);
  });
});

describe('handleToolError — hardened format', () => {
  it('maps LoyverseApiError with retryable flag', () => {
    const err = new RateLimitError('slow down');
    const result = handleToolError(err);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe('RATE_LIMITED');
    expect(data.retryable).toBe(true);
  });

  it('maps NotFoundError as not retryable', () => {
    const err = new NotFoundError('not found');
    const result = handleToolError(err);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe('NOT_FOUND');
    expect(data.retryable).toBe(false);
  });

  it('maps 5xx errors as retryable', () => {
    const err = new LoyverseApiError({
      statusCode: 500,
      errorCode: 'INTERNAL_SERVER_ERROR',
      details: 'server error',
    });
    const result = handleToolError(err);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe('INTERNAL_SERVER_ERROR');
    expect(data.retryable).toBe(true);
  });

  it('maps unknown errors as INTERNAL_ERROR, not retryable', () => {
    const result = handleToolError(new Error('something broke'));
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe('INTERNAL_ERROR');
    expect(data.retryable).toBe(false);
  });

  it('includes requestId when provided', () => {
    const result = handleToolError(new Error('oops'), 'req-abc-123');
    const data = JSON.parse(result.content[0].text);
    expect(data.requestId).toBe('req-abc-123');
  });
});
