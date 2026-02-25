import { z } from 'zod';
import type { StoresClient } from '../loyverse/storesClient.js';
import { successResult, handleToolError, type McpToolResult } from './_shared/toolResult.js';

const listStoresInputSchema = {
  store_ids: z
    .string()
    .optional()
    .describe('Comma-separated store UUIDs to filter'),
  show_deleted: z
    .boolean()
    .optional()
    .describe('Include soft-deleted stores (default false)'),
};

interface ListStoresInput {
  store_ids?: string;
  show_deleted?: boolean;
}

export async function listStoresHandler(
  input: ListStoresInput,
  storesClient: StoresClient,
): Promise<McpToolResult> {
  try {
    const result = await storesClient.listStores({
      storeIds: input.store_ids,
      showDeleted: input.show_deleted,
    });

    return successResult(result);
  } catch (err) {
    return handleToolError(err);
  }
}

export const listStoresDefinition = {
  name: 'list_stores',
  description:
    'List all stores. The stores endpoint does not support pagination — all stores are returned at once.',
  inputSchema: listStoresInputSchema,
  annotations: {
    readOnlyHint: true,
  },
} as const;
