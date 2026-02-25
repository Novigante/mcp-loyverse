import type { LoyverseHttpClient } from './httpClient.js';
import type { Store, StoresResponse } from './types/store.js';

export interface ListStoresParams {
  storeIds?: string;
  createdAtMin?: string;
  createdAtMax?: string;
  updatedAtMin?: string;
  updatedAtMax?: string;
  showDeleted?: boolean;
}

export class StoresClient {
  constructor(private readonly http: LoyverseHttpClient) {}

  async listStores(params: ListStoresParams): Promise<StoresResponse> {
    const query: Record<string, string> = {};

    if (params.storeIds !== undefined) query.store_ids = params.storeIds;
    if (params.createdAtMin !== undefined) query.created_at_min = params.createdAtMin;
    if (params.createdAtMax !== undefined) query.created_at_max = params.createdAtMax;
    if (params.updatedAtMin !== undefined) query.updated_at_min = params.updatedAtMin;
    if (params.updatedAtMax !== undefined) query.updated_at_max = params.updatedAtMax;
    if (params.showDeleted !== undefined) query.show_deleted = String(params.showDeleted);

    return this.http.get<StoresResponse>('/stores', query);
  }

  async getStore(storeId: string): Promise<Store> {
    return this.http.get<Store>(`/stores/${storeId}`);
  }
}
