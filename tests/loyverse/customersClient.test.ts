import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomersClient } from '../../src/loyverse/customersClient.js';
import type { LoyverseHttpClient } from '../../src/loyverse/httpClient.js';
import type { Customer, CustomersResponse } from '../../src/loyverse/types/customer.js';

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    customer_code: 'C001',
    name: 'Maria Lopez',
    email: 'maria@example.com',
    phone_number: '+525512345678',
    address: 'Calle 1',
    city: 'CDMX',
    region: 'CDMX',
    postal_code: '06600',
    country_code: 'MX',
    note: '',
    first_visit: '2025-01-01T00:00:00.000Z',
    last_visit: '2025-06-01T00:00:00.000Z',
    total_visits: 10,
    total_points: 100,
    total_money_spent: 5000,
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-06-01T00:00:00.000Z',
    permanent_deletion_at: null,
    ...overrides,
  };
}

describe('CustomersClient', () => {
  let mockHttpClient: { get: ReturnType<typeof vi.fn> };
  let client: CustomersClient;

  beforeEach(() => {
    mockHttpClient = { get: vi.fn() };
    client = new CustomersClient(mockHttpClient as unknown as LoyverseHttpClient);
  });

  describe('listCustomers', () => {
    it('calls /customers with no params when none provided', async () => {
      const response: CustomersResponse = { customers: [] };
      mockHttpClient.get.mockResolvedValue(response);

      const result = await client.listCustomers({});

      expect(mockHttpClient.get).toHaveBeenCalledWith('/customers', {});
      expect(result).toEqual(response);
    });

    it('maps camelCase params to snake_case query params', async () => {
      const response: CustomersResponse = { customers: [makeCustomer()], cursor: 'next' };
      mockHttpClient.get.mockResolvedValue(response);

      const result = await client.listCustomers({
        customerIds: 'id1,id2',
        email: 'test@example.com',
        createdAtMin: '2025-01-01T00:00:00.000Z',
        createdAtMax: '2025-01-31T23:59:59.999Z',
        updatedAtMin: '2025-01-15T00:00:00.000Z',
        updatedAtMax: '2025-01-20T23:59:59.999Z',
        limit: 100,
        cursor: 'prev-cursor',
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/customers', {
        customer_ids: 'id1,id2',
        email: 'test@example.com',
        created_at_min: '2025-01-01T00:00:00.000Z',
        created_at_max: '2025-01-31T23:59:59.999Z',
        updated_at_min: '2025-01-15T00:00:00.000Z',
        updated_at_max: '2025-01-20T23:59:59.999Z',
        limit: '100',
        cursor: 'prev-cursor',
      });
      expect(result.customers).toHaveLength(1);
      expect(result.cursor).toBe('next');
    });

    it('omits undefined params from query', async () => {
      const response: CustomersResponse = { customers: [] };
      mockHttpClient.get.mockResolvedValue(response);

      await client.listCustomers({ limit: 25 });

      const params = mockHttpClient.get.mock.calls[0][1] as Record<string, string>;
      expect(params).toEqual({ limit: '25' });
      expect(params).not.toHaveProperty('customer_ids');
      expect(params).not.toHaveProperty('email');
    });

    it('propagates errors from httpClient', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Network error'));

      await expect(client.listCustomers({})).rejects.toThrow('Network error');
    });
  });

  describe('getCustomer', () => {
    it('calls /customers/{customer_id} with the customer ID', async () => {
      const customer = makeCustomer({ id: 'abc-123' });
      mockHttpClient.get.mockResolvedValue(customer);

      const result = await client.getCustomer('abc-123');

      expect(mockHttpClient.get).toHaveBeenCalledWith('/customers/abc-123');
      expect(result).toEqual(customer);
    });

    it('propagates errors from httpClient', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Not found'));

      await expect(client.getCustomer('nope')).rejects.toThrow('Not found');
    });
  });
});
