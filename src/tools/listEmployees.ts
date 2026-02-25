import { z } from 'zod';
import type { EmployeesClient } from '../loyverse/employeesClient.js';
import { successResult, handleToolError, type McpToolResult } from './_shared/toolResult.js';

const listEmployeesInputSchema = {
  employee_ids: z
    .string()
    .optional()
    .describe('Comma-separated employee UUIDs to filter'),
  limit: z.number().int().min(1).max(250).default(50).describe('Results per page (1-250)'),
  cursor: z.string().optional().describe('Pagination cursor from previous response'),
};

interface ListEmployeesInput {
  employee_ids?: string;
  limit?: number;
  cursor?: string;
}

export async function listEmployeesHandler(
  input: ListEmployeesInput,
  employeesClient: EmployeesClient,
): Promise<McpToolResult> {
  try {
    const result = await employeesClient.listEmployees({
      employeeIds: input.employee_ids,
      limit: input.limit,
      cursor: input.cursor,
    });

    return successResult(result);
  } catch (err) {
    return handleToolError(err);
  }
}

export const listEmployeesDefinition = {
  name: 'list_employees',
  description:
    'List employees (waiters, cashiers, staff). Use to resolve employee names from IDs found in receipts.',
  inputSchema: listEmployeesInputSchema,
  annotations: {
    readOnlyHint: true,
  },
} as const;
