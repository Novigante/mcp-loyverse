import { z } from 'zod';
import type { StoresClient } from '../loyverse/storesClient.js';
import { successResult, errorResult, handleToolError, type McpToolResult } from './_shared/toolResult.js';

const getStoreInputSchema = {
  store_id: z.string().min(1).describe('The store UUID to look up'),
};

interface GetStoreInput {
  store_id: string;
}

export async function getStoreHandler(
  input: GetStoreInput,
  storesClient: StoresClient,
): Promise<McpToolResult> {
  try {
    if (!input.store_id || input.store_id.length === 0) {
      return errorResult('VALIDATION_ERROR', 'store_id is required');
    }

    const store = await storesClient.getStore(input.store_id);
    return successResult(store);
  } catch (err) {
    return handleToolError(err);
  }
}

export const getStoreDefinition = {
  name: 'get_store',
  description: 'Get full details of a specific store by its ID',
  inputSchema: getStoreInputSchema,
  annotations: {
    readOnlyHint: true,
  },
} as const;
