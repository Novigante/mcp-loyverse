import type { LoyverseHttpClient } from './httpClient.js';
import type { Receipt, ReceiptsResponse } from './types/receipt.js';

export interface ListReceiptsParams {
  createdAtMin?: string;
  createdAtMax?: string;
  storeId?: string;
  receiptNumbers?: string;
  limit?: number;
  cursor?: string;
}

export class ReceiptsClient {
  constructor(private readonly http: LoyverseHttpClient) {}

  async listReceipts(params: ListReceiptsParams): Promise<ReceiptsResponse> {
    const query: Record<string, string> = {};

    if (params.createdAtMin !== undefined) query.created_at_min = params.createdAtMin;
    if (params.createdAtMax !== undefined) query.created_at_max = params.createdAtMax;
    if (params.storeId !== undefined) query.store_id = params.storeId;
    if (params.receiptNumbers !== undefined) query.receipt_numbers = params.receiptNumbers;
    if (params.limit !== undefined) query.limit = String(params.limit);
    if (params.cursor !== undefined) query.cursor = params.cursor;

    return this.http.get<ReceiptsResponse>('/receipts', query);
  }

  async getReceipt(receiptNumber: string): Promise<Receipt> {
    return this.http.get<Receipt>(`/receipts/${receiptNumber}`);
  }
}
