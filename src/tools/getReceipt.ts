import { z } from 'zod';
import type { ReceiptsClient } from '../loyverse/receiptsClient.js';
import { successResult, errorResult, handleToolError, type McpToolResult } from './_shared/toolResult.js';

const getReceiptInputSchema = {
  receipt_number: z.string().min(1).describe('The receipt number to look up'),
};

interface GetReceiptInput {
  receipt_number: string;
}

export async function getReceiptHandler(
  input: GetReceiptInput,
  receiptsClient: ReceiptsClient,
): Promise<McpToolResult> {
  try {
    if (!input.receipt_number || input.receipt_number.length === 0) {
      return errorResult('VALIDATION_ERROR', 'receipt_number is required');
    }

    const receipt = await receiptsClient.getReceipt(input.receipt_number);
    return successResult(receipt);
  } catch (err) {
    return handleToolError(err);
  }
}

export const getReceiptDefinition = {
  name: 'get_receipt',
  description: 'Get full details of a specific receipt by its receipt number',
  inputSchema: getReceiptInputSchema,
  annotations: {
    readOnlyHint: true,
  },
} as const;
