import type { LoyverseHttpClient } from './httpClient.js';
import type { Item, ItemsResponse } from './types/item.js';

export interface ListItemsParams {
  itemsIds?: string;
  createdAtMin?: string;
  createdAtMax?: string;
  updatedAtMin?: string;
  updatedAtMax?: string;
  showDeleted?: boolean;
  limit?: number;
  cursor?: string;
}

export class ItemsClient {
  constructor(private readonly http: LoyverseHttpClient) {}

  async listItems(params: ListItemsParams): Promise<ItemsResponse> {
    const query: Record<string, string> = {};

    if (params.itemsIds !== undefined) query.items_ids = params.itemsIds;
    if (params.createdAtMin !== undefined) query.created_at_min = params.createdAtMin;
    if (params.createdAtMax !== undefined) query.created_at_max = params.createdAtMax;
    if (params.updatedAtMin !== undefined) query.updated_at_min = params.updatedAtMin;
    if (params.updatedAtMax !== undefined) query.updated_at_max = params.updatedAtMax;
    if (params.showDeleted !== undefined) query.show_deleted = String(params.showDeleted);
    if (params.limit !== undefined) query.limit = String(params.limit);
    if (params.cursor !== undefined) query.cursor = params.cursor;

    return this.http.get<ItemsResponse>('/items', query);
  }

  async getItem(itemId: string): Promise<Item> {
    return this.http.get<Item>(`/items/${itemId}`);
  }
}
