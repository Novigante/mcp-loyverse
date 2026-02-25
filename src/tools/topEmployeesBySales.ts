import { z } from 'zod';
import type { ReceiptsClient } from '../loyverse/receiptsClient.js';
import type { EmployeesClient } from '../loyverse/employeesClient.js';
import { resolveDateRange } from './_shared/dateRange.js';
import { successResult, errorResult, handleToolError, type McpToolResult } from './_shared/toolResult.js';
import { collectAllReceipts } from '../domain/analytics/receiptCollector.js';
import { computeTopEmployees } from '../domain/analytics/salesAggregations.js';

const topEmployeesBySalesInputSchema = {
  period: z
    .enum(['today', 'yesterday', 'this_week', 'this_month', 'last_7_days', 'last_30_days'])
    .optional()
    .describe('Date preset for the period'),
  from: z.string().optional().describe('Start date (ISO 8601) for explicit date range'),
  to: z.string().optional().describe('End date (ISO 8601) for explicit date range'),
  store_id: z.string().uuid().optional().describe('Filter by store UUID'),
  metric: z
    .enum(['sales_amount', 'receipt_count'])
    .default('sales_amount')
    .describe('Ranking metric: by total sales amount or by number of receipts'),
  limit: z.number().int().min(1).max(50).default(10).describe('Number of top employees to return (1-50)'),
};

interface TopEmployeesBySalesInput {
  period?: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_7_days' | 'last_30_days';
  from?: string;
  to?: string;
  store_id?: string;
  metric?: 'sales_amount' | 'receipt_count';
  limit?: number;
}

export async function topEmployeesBySalesHandler(
  input: TopEmployeesBySalesInput,
  receiptsClient: ReceiptsClient,
  employeesClient: EmployeesClient,
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

    const metric = input.metric ?? 'sales_amount';
    const limit = input.limit ?? 10;
    const rankings = computeTopEmployees(receipts, metric, limit);

    // Resolve employee names if we have rankings
    if (rankings.length > 0) {
      const employeeIds = rankings
        .map((r) => r.employeeId)
        .filter((id) => id !== 'unknown');

      if (employeeIds.length > 0) {
        try {
          const response = await employeesClient.listEmployees({
            employeeIds: employeeIds.join(','),
          });
          const nameMap = new Map(response.employees.map((e) => [e.id, e.name]));

          for (const ranking of rankings) {
            const name = nameMap.get(ranking.employeeId);
            if (name) {
              ranking.employeeName = name;
            }
          }
        } catch {
          // Non-fatal: continue without names
        }
      }
    }

    return successResult({
      employees: rankings,
      metric,
      period: { from: dateFrom, to: dateTo },
    });
  } catch (err) {
    return handleToolError(err);
  }
}

export const topEmployeesBySalesDefinition = {
  name: 'top_employees_by_sales',
  description:
    'Get the top employees (waiters/cashiers) by sales amount or receipt count. ' +
    'Answers: Which waiter sold the most this month?',
  inputSchema: topEmployeesBySalesInputSchema,
  annotations: {
    readOnlyHint: true,
  },
} as const;
