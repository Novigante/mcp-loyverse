import { z } from 'zod';
import type { ItemsClient } from '../loyverse/itemsClient.js';
import { successResult, errorResult, handleToolError, type McpToolResult } from './_shared/toolResult.js';

const getItemInputSchema = {
  item_id: z.string().min(1).describe('The item UUID to look up'),
};

interface GetItemInput {
  item_id: string;
}

export async function getItemHandler(
  input: GetItemInput,
  itemsClient: ItemsClient,
): Promise<McpToolResult> {
  try {
    if (!input.item_id || input.item_id.length === 0) {
      return errorResult('VALIDATION_ERROR', 'item_id is required');
    }

    const item = await itemsClient.getItem(input.item_id);
    return successResult(item);
  } catch (err) {
    return handleToolError(err);
  }
}

export const getItemDefinition = {
  name: 'get_item',
  description: 'Get full details of a specific item by its ID',
  inputSchema: getItemInputSchema,
  annotations: {
    readOnlyHint: true,
  },
} as const;
