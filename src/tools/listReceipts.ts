import { z } from 'zod';
import type { ReceiptsClient } from '../loyverse/receiptsClient.js';
import { resolveDateRange } from './_shared/dateRange.js';
import { successResult, errorResult, handleToolError, type McpToolResult } from './_shared/toolResult.js';

const listReceiptsInputSchema = {
  period: z
    .enum(['today', 'yesterday', 'this_week', 'this_month', 'last_7_days', 'last_30_days'])
    .optional()
    .describe('Date preset for filtering receipts'),
  from: z.string().optional().describe('Start date (ISO 8601) for explicit date range'),
  to: z.string().optional().describe('End date (ISO 8601) for explicit date range'),
  store_id: z.string().uuid().optional().describe('Filter by store UUID'),
  receipt_numbers: z
    .string()
    .optional()
    .describe('Comma-separated receipt numbers to look up'),
  limit: z.number().int().min(1).max(250).default(50).describe('Results per page (1-250)'),
  cursor: z.string().optional().describe('Pagination cursor from previous response'),
};

interface ListReceiptsInput {
  period?: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_7_days' | 'last_30_days';
  from?: string;
  to?: string;
  store_id?: string;
  receipt_numbers?: string;
  limit?: number;
  cursor?: string;
}

export async function listReceiptsHandler(
  input: ListReceiptsInput,
  receiptsClient: ReceiptsClient,
  timezone: string,
): Promise<McpToolResult> {
  try {
    const hasDatePreset = input.period !== undefined;
    const hasExplicitRange = input.from !== undefined || input.to !== undefined;
    const hasReceiptNumbers = input.receipt_numbers !== undefined && input.receipt_numbers.length > 0;

    if (!hasDatePreset && !hasExplicitRange && !hasReceiptNumbers) {
      return errorResult(
        'VALIDATION_ERROR',
        'Must provide either a date period, explicit from/to range, or receipt_numbers',
      );
    }

    let createdAtMin: string | undefined;
    let createdAtMax: string | undefined;

    if (hasDatePreset) {
      const range = resolveDateRange({ period: input.period! }, timezone);
      createdAtMin = range.from;
      createdAtMax = range.to;
    } else if (hasExplicitRange) {
      if (!input.from || !input.to) {
        return errorResult('VALIDATION_ERROR', 'Both "from" and "to" are required for explicit date range');
      }
      const range = resolveDateRange({ from: input.from, to: input.to }, timezone);
      createdAtMin = range.from;
      createdAtMax = range.to;
    }

    const result = await receiptsClient.listReceipts({
      createdAtMin,
      createdAtMax,
      storeId: input.store_id,
      receiptNumbers: input.receipt_numbers,
      limit: input.limit,
      cursor: input.cursor,
    });

    return successResult(result);
  } catch (err) {
    return handleToolError(err);
  }
}

export const listReceiptsDefinition = {
  name: 'list_receipts',
  description:
    'Search receipts (tickets) by date range, store, or receipt numbers. ' +
    'Returns receipt summaries with totals, line items, and payment info. ' +
    'Use date presets (today, yesterday, this_week, this_month) or explicit from/to range.',
  inputSchema: listReceiptsInputSchema,
  annotations: {
    readOnlyHint: true,
  },
} as const;
