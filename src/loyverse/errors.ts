import type { LoyverseErrorResponse } from './types.js';

export class LoyverseApiError extends Error {
  readonly statusCode: number;
  readonly errorCode: string;
  readonly details: string;
  readonly field?: string;
  readonly retryable: boolean;

  constructor(opts: {
    statusCode: number;
    errorCode: string;
    details: string;
    field?: string;
    retryable?: boolean;
  }) {
    super(`Loyverse API error ${opts.statusCode}: [${opts.errorCode}] ${opts.details}`);
    this.name = 'LoyverseApiError';
    this.statusCode = opts.statusCode;
    this.errorCode = opts.errorCode;
    this.details = opts.details;
    this.field = opts.field;
    this.retryable = opts.retryable ?? (opts.statusCode === 429 || opts.statusCode >= 500);
  }
}

export class AuthError extends LoyverseApiError {
  constructor(errorCode: string, details: string) {
    super({ statusCode: errorCode === 'FORBIDDEN' ? 403 : 401, errorCode, details, retryable: false });
    this.name = 'AuthError';
  }
}

export class RateLimitError extends LoyverseApiError {
  constructor(details: string) {
    super({ statusCode: 429, errorCode: 'RATE_LIMITED', details, retryable: true });
    this.name = 'RateLimitError';
  }
}

export class NotFoundError extends LoyverseApiError {
  constructor(details: string) {
    super({ statusCode: 404, errorCode: 'NOT_FOUND', details, retryable: false });
    this.name = 'NotFoundError';
  }
}

export function parseLoyverseError(
  statusCode: number,
  body: unknown,
): LoyverseApiError {
  const parsed = body as LoyverseErrorResponse;
  const firstError = parsed?.errors?.[0];
  const errorCode = firstError?.code ?? 'UNKNOWN';
  const details = firstError?.details ?? 'Unknown error';
  const field = firstError?.field;

  if (statusCode === 401 || statusCode === 403) {
    return new AuthError(errorCode, details);
  }
  if (statusCode === 429) {
    return new RateLimitError(details);
  }
  if (statusCode === 404) {
    return new NotFoundError(details);
  }

  return new LoyverseApiError({ statusCode, errorCode, details, field });
}
