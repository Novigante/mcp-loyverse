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

export function errorResult(code: string, message: string): McpToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify({ code, message }) }],
    isError: true,
  };
}

export function handleToolError(err: unknown): McpToolResult {
  if (err instanceof LoyverseApiError) {
    return errorResult(err.errorCode, err.details);
  }
  const message = err instanceof Error ? err.message : String(err);
  return errorResult('INTERNAL_ERROR', message);
}
