import type { LoyverseHttpClient } from './httpClient.js';
import type { Customer, CustomersResponse } from './types/customer.js';

export interface ListCustomersParams {
  customerIds?: string;
  email?: string;
  createdAtMin?: string;
  createdAtMax?: string;
  updatedAtMin?: string;
  updatedAtMax?: string;
  limit?: number;
  cursor?: string;
}

export class CustomersClient {
  constructor(private readonly http: LoyverseHttpClient) {}

  async listCustomers(params: ListCustomersParams): Promise<CustomersResponse> {
    const query: Record<string, string> = {};

    if (params.customerIds !== undefined) query.customer_ids = params.customerIds;
    if (params.email !== undefined) query.email = params.email;
    if (params.createdAtMin !== undefined) query.created_at_min = params.createdAtMin;
    if (params.createdAtMax !== undefined) query.created_at_max = params.createdAtMax;
    if (params.updatedAtMin !== undefined) query.updated_at_min = params.updatedAtMin;
    if (params.updatedAtMax !== undefined) query.updated_at_max = params.updatedAtMax;
    if (params.limit !== undefined) query.limit = String(params.limit);
    if (params.cursor !== undefined) query.cursor = params.cursor;

    return this.http.get<CustomersResponse>('/customers', query);
  }

  async getCustomer(customerId: string): Promise<Customer> {
    return this.http.get<Customer>(`/customers/${customerId}`);
  }
}
