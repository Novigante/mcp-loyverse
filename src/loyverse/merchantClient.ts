import type { LoyverseHttpClient } from './httpClient.js';
import type { Merchant } from './types/merchant.js';

export class MerchantClient {
  constructor(private readonly http: LoyverseHttpClient) {}

  async getMerchant(): Promise<Merchant> {
    return this.http.get<Merchant>('/merchant');
  }
}
