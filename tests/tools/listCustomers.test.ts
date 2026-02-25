import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listCustomersHandler } from '../../src/tools/listCustomers.js';
import type { CustomersClient } from '../../src/loyverse/customersClient.js';
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

describe('listCustomers tool', () => {
  let mockCustomersClient: { listCustomers: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockCustomersClient = { listCustomers: vi.fn() };
  });

  it('lists customers with default params', async () => {
    const response: CustomersResponse = { customers: [makeCustomer()], cursor: 'next' };
    mockCustomersClient.listCustomers.mockResolvedValue(response);

    const result = await listCustomersHandler(
      { limit: 50 },
      mockCustomersClient as unknown as CustomersClient,
    );

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.customers).toHaveLength(1);
    expect(data.cursor).toBe('next');
    expect(mockCustomersClient.listCustomers).toHaveBeenCalledWith({
      limit: 50,
      cursor: undefined,
      customerIds: undefined,
      email: undefined,
    });
  });

  it('forwards customer_ids filter to the client', async () => {
    const response: CustomersResponse = { customers: [] };
    mockCustomersClient.listCustomers.mockResolvedValue(response);

    await listCustomersHandler(
      { customer_ids: 'id1,id2', limit: 50 },
      mockCustomersClient as unknown as CustomersClient,
    );

    const callArgs = mockCustomersClient.listCustomers.mock.calls[0][0];
    expect(callArgs.customerIds).toBe('id1,id2');
  });

  it('forwards email filter to the client', async () => {
    const response: CustomersResponse = { customers: [] };
    mockCustomersClient.listCustomers.mockResolvedValue(response);

    await listCustomersHandler(
      { email: 'test@example.com', limit: 50 },
      mockCustomersClient as unknown as CustomersClient,
    );

    const callArgs = mockCustomersClient.listCustomers.mock.calls[0][0];
    expect(callArgs.email).toBe('test@example.com');
  });

  it('forwards pagination params to the client', async () => {
    const response: CustomersResponse = { customers: [] };
    mockCustomersClient.listCustomers.mockResolvedValue(response);

    await listCustomersHandler(
      { limit: 100, cursor: 'abc123' },
      mockCustomersClient as unknown as CustomersClient,
    );

    const callArgs = mockCustomersClient.listCustomers.mock.calls[0][0];
    expect(callArgs.limit).toBe(100);
    expect(callArgs.cursor).toBe('abc123');
  });

  it('handles API errors gracefully', async () => {
    mockCustomersClient.listCustomers.mockRejectedValue(new Error('API timeout'));

    const result = await listCustomersHandler(
      { limit: 50 },
      mockCustomersClient as unknown as CustomersClient,
    );

    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe('INTERNAL_ERROR');
    expect(data.message).toContain('API timeout');
  });
});
