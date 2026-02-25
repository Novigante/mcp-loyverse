import { z } from 'zod';
import type { ReceiptsClient } from '../loyverse/receiptsClient.js';
import type { MerchantClient } from '../loyverse/merchantClient.js';
import { resolveDateRange } from './_shared/dateRange.js';
import { successResult, errorResult, handleToolError, type McpToolResult } from './_shared/toolResult.js';
import { collectAllReceipts } from '../domain/analytics/receiptCollector.js';
import { computeSalesSummary } from '../domain/analytics/salesAggregations.js';

const salesSummaryInputSchema = {
  period: z
    .enum(['today', 'yesterday', 'this_week', 'this_month', 'last_7_days', 'last_30_days'])
    .optional()
    .describe('Date preset for the summary period'),
  from: z.string().optional().describe('Start date (ISO 8601) for explicit date range'),
  to: z.string().optional().describe('End date (ISO 8601) for explicit date range'),
  store_id: z.string().uuid().optional().describe('Filter by store UUID'),
};

interface SalesSummaryInput {
  period?: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_7_days' | 'last_30_days';
  from?: string;
  to?: string;
  store_id?: string;
}

export async function salesSummaryHandler(
  input: SalesSummaryInput,
  receiptsClient: ReceiptsClient,
  merchantClient: MerchantClient,
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

    const summary = computeSalesSummary(receipts, { from: dateFrom, to: dateTo });

    // Fetch currency from merchant
    let currency: string | undefined;
    try {
      const merchant = await merchantClient.getMerchant();
      currency = merchant.currency?.code;
    } catch {
      // Non-fatal: continue without currency
    }

    return successResult({
      ...summary,
      currency,
    });
  } catch (err) {
    return handleToolError(err);
  }
}

export const salesSummaryDefinition = {
  name: 'sales_summary',
  description:
    'Get a sales summary for a given period: total revenue, receipt count, average ticket, ' +
    'discounts, taxes, and tips. Use presets (today, yesterday, this_week, this_month) or explicit date range.',
  inputSchema: salesSummaryInputSchema,
  annotations: {
    readOnlyHint: true,
  },
} as const;
