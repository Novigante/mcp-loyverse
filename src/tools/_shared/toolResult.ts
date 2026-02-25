import { LoyverseApiError } from '../../loyverse/errors.js';

export interface McpToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
  [key: string]: unknown;
}

export function successResult(data: unknown): McpToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

export function errorResult(code: string, message: string, retryable = false, requestId?: string): McpToolResult {
  const payload: Record<string, unknown> = { code, message, retryable };
  if (requestId) payload.requestId = requestId;
  return {
    content: [{ type: 'text', text: JSON.stringify(payload) }],
    isError: true,
  };
}

export function handleToolError(err: unknown, requestId?: string): McpToolResult {
  if (err instanceof LoyverseApiError) {
    return errorResult(err.errorCode, err.details, err.retryable, requestId);
  }
  const message = err instanceof Error ? err.message : String(err);
  return errorResult('INTERNAL_ERROR', message, false, requestId);
}
