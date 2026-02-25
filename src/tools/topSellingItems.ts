import { z } from 'zod';
import type { ReceiptsClient } from '../loyverse/receiptsClient.js';
import { resolveDateRange } from './_shared/dateRange.js';
import { successResult, errorResult, handleToolError, type McpToolResult } from './_shared/toolResult.js';
import { collectAllReceipts } from '../domain/analytics/receiptCollector.js';
import { computeTopItems } from '../domain/analytics/salesAggregations.js';

const topSellingItemsInputSchema = {
  period: z
    .enum(['today', 'yesterday', 'this_week', 'this_month', 'last_7_days', 'last_30_days'])
    .optional()
    .describe('Date preset for the period'),
  from: z.string().optional().describe('Start date (ISO 8601) for explicit date range'),
  to: z.string().optional().describe('End date (ISO 8601) for explicit date range'),
  store_id: z.string().uuid().optional().describe('Filter by store UUID'),
  metric: z
    .enum(['quantity', 'sales_amount'])
    .default('quantity')
    .describe('Ranking metric: by quantity sold or by sales amount'),
  limit: z.number().int().min(1).max(50).default(10).describe('Number of top items to return (1-50)'),
};

interface TopSellingItemsInput {
  period?: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_7_days' | 'last_30_days';
  from?: string;
  to?: string;
  store_id?: string;
  metric?: 'quantity' | 'sales_amount';
  limit?: number;
}

export async function topSellingItemsHandler(
  input: TopSellingItemsInput,
  receiptsClient: ReceiptsClient,
  timezone: string,
): Promise<McpToolResult> {
  try {
    const hasDatePreset = input.period !== undefined;
    const hasExplicitRange = input.from !== undefined || input.to !== undefined;

    if (!hasDatePreset && !hasExplicitRange) {
      return errorResult(
        'VALIDATION_ERROR',
        'Must provide either a date period or explicit from/to range',
      );
    }

    let dateFrom: string;
    let dateTo: string;

    if (hasDatePreset) {
      const range = resolveDateRange({ period: input.period! }, timezone);
      dateFrom = range.from;
      dateTo = range.to;
    } else {
      if (!input.from || !input.to) {
        return errorResult('VALIDATION_ERROR', 'Both "from" and "to" are required for explicit date range');
      }
      const range = resolveDateRange({ from: input.from, to: input.to }, timezone);
      dateFrom = range.from;
      dateTo = range.to;
    }

    const receipts = await collectAllReceipts(receiptsClient, {
      createdAtMin: dateFrom,
      createdAtMax: dateTo,
      storeId: input.store_id,
    });

    const metric = input.metric ?? 'quantity';
    const limit = input.limit ?? 10;
    const items = computeTopItems(receipts, metric, limit);

    return successResult({
      items,
      metric,
      period: { from: dateFrom, to: dateTo },
    });
  } catch (err) {
    return handleToolError(err);
  }
}

export const topSellingItemsDefinition = {
  name: 'top_selling_items',
  description:
    'Get the top-selling items for a period, ranked by quantity sold or by sales amount. ' +
    'Answers: What was the best-selling dish today?',
  inputSchema: topSellingItemsInputSchema,
  annotations: {
    readOnlyHint: true,
  },
} as const;
