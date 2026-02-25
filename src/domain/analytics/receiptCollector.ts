import type { ReceiptsClient, ListReceiptsParams } from '../../loyverse/receiptsClient.js';
import type { Receipt } from '../../loyverse/types/receipt.js';
import type { Logger } from '../../config/logger.js';

const DEFAULT_MAX_RECEIPTS = 10_000;
const PAGE_SIZE = 250;

export interface CollectReceiptsParams {
  createdAtMin?: string;
  createdAtMax?: string;
  storeId?: string;
  maxReceipts?: number;
}

/**
 * Fetches all receipts within a date range, handling pagination automatically.
 * Stops at maxReceipts (default 10,000) to prevent runaway fetches.
 */
export async function collectAllReceipts(
  receiptsClient: ReceiptsClient,
  params: CollectReceiptsParams,
  logger?: Logger,
): Promise<Receipt[]> {
  const maxReceipts = params.maxReceipts ?? DEFAULT_MAX_RECEIPTS;
  const allReceipts: Receipt[] = [];
  let cursor: string | undefined;
  let page = 1;

  do {
    const listParams: ListReceiptsParams = {
      createdAtMin: params.createdAtMin,
      createdAtMax: params.createdAtMax,
      storeId: params.storeId,
      limit: PAGE_SIZE,
      cursor,
    };

    logger?.debug(`Fetching receipts page ${page}`, { page });

    const response = await receiptsClient.listReceipts(listParams);

    allReceipts.push(...response.receipts);
    cursor = response.cursor;
    page += 1;

    if (allReceipts.length >= maxReceipts) {
      logger?.warn('Safety limit reached', { count: allReceipts.length, max: maxReceipts });
      break;
    }
  } while (cursor);

  return allReceipts;
}
