import { z } from 'zod';
import type { CustomersClient } from '../loyverse/customersClient.js';
import { successResult, errorResult, handleToolError, type McpToolResult } from './_shared/toolResult.js';

const getCustomerInputSchema = {
  customer_id: z.string().min(1).describe('The customer UUID to look up'),
};

interface GetCustomerInput {
  customer_id: string;
}

export async function getCustomerHandler(
  input: GetCustomerInput,
  customersClient: CustomersClient,
): Promise<McpToolResult> {
  try {
    if (!input.customer_id || input.customer_id.length === 0) {
      return errorResult('VALIDATION_ERROR', 'customer_id is required');
    }

    const customer = await customersClient.getCustomer(input.customer_id);
    return successResult(customer);
  } catch (err) {
    return handleToolError(err);
  }
}

export const getCustomerDefinition = {
  name: 'get_customer',
  description: 'Get full details of a specific customer by their ID',
  inputSchema: getCustomerInputSchema,
  annotations: {
    readOnlyHint: true,
  },
} as const;
