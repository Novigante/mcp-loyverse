import type { MerchantClient } from '../loyverse/merchantClient.js';
import { successResult, handleToolError, type McpToolResult } from './_shared/toolResult.js';

export async function getMerchantHandler(
  merchantClient: MerchantClient,
): Promise<McpToolResult> {
  try {
    const merchant = await merchantClient.getMerchant();
    return successResult(merchant);
  } catch (err) {
    return handleToolError(err);
  }
}

export const getMerchantDefinition = {
  name: 'get_merchant',
  description:
    'Get merchant profile including business name and currency settings (code and decimal places)',
  annotations: {
    readOnlyHint: true,
  },
} as const;
