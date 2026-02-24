import { z } from 'zod';
import type { ItemsClient } from '../loyverse/itemsClient.js';
import { successResult, handleToolError, type McpToolResult } from './_shared/toolResult.js';

const listItemsInputSchema = {
  items_ids: z
    .string()
    .optional()
    .describe('Comma-separated item UUIDs to filter'),
  show_deleted: z
    .boolean()
    .optional()
    .describe('Include soft-deleted items (default false)'),
  limit: z.number().int().min(1).max(250).default(50).describe('Results per page (1-250)'),
  cursor: z.string().optional().describe('Pagination cursor from previous response'),
};

interface ListItemsInput {
  items_ids?: string;
  show_deleted?: boolean;
  limit?: number;
  cursor?: string;
}

export async function listItemsHandler(
  input: ListItemsInput,
  itemsClient: ItemsClient,
): Promise<McpToolResult> {
  try {
    const result = await itemsClient.listItems({
      itemsIds: input.items_ids,
      showDeleted: input.show_deleted,
      limit: input.limit,
      cursor: input.cursor,
    });

    return successResult(result);
  } catch (err) {
    return handleToolError(err);
  }
}

export const listItemsDefinition = {
  name: 'list_items',
  description:
    'List items from the catalog. Useful to look up item names, prices, SKUs, and categories.',
  inputSchema: listItemsInputSchema,
  annotations: {
    readOnlyHint: true,
  },
} as const;
