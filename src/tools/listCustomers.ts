import { z } from 'zod';
import type { CustomersClient } from '../loyverse/customersClient.js';
import { successResult, handleToolError, type McpToolResult } from './_shared/toolResult.js';

const listCustomersInputSchema = {
  customer_ids: z
    .string()
    .optional()
    .describe('Comma-separated customer UUIDs to filter'),
  email: z
    .string()
    .optional()
    .describe('Filter by exact email address'),
  limit: z.number().int().min(1).max(250).default(50).describe('Results per page (1-250)'),
  cursor: z.string().optional().describe('Pagination cursor from previous response'),
};

interface ListCustomersInput {
  customer_ids?: string;
  email?: string;
  limit?: number;
  cursor?: string;
}

export async function listCustomersHandler(
  input: ListCustomersInput,
  customersClient: CustomersClient,
): Promise<McpToolResult> {
  try {
    const result = await customersClient.listCustomers({
      customerIds: input.customer_ids,
      email: input.email,
      limit: input.limit,
      cursor: input.cursor,
    });

    return successResult(result);
  } catch (err) {
    return handleToolError(err);
  }
}

export const listCustomersDefinition = {
  name: 'list_customers',
  description:
    'List customers. Filter by IDs or email. Returns customer profiles with visit history and spending totals.',
  inputSchema: listCustomersInputSchema,
  annotations: {
    readOnlyHint: true,
  },
} as const;
