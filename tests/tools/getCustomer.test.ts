import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCustomerHandler } from '../../src/tools/getCustomer.js';
import type { CustomersClient } from '../../src/loyverse/customersClient.js';
import { NotFoundError } from '../../src/loyverse/errors.js';
import type { Customer } from '../../src/loyverse/types/customer.js';

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

describe('getCustomer tool', () => {
  let mockCustomersClient: { getCustomer: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockCustomersClient = { getCustomer: vi.fn() };
  });

  it('returns customer data for valid customer_id', async () => {
    const customer = makeCustomer({ id: 'abc-123', name: 'Carlos Ruiz' });
    mockCustomersClient.getCustomer.mockResolvedValue(customer);

    const result = await getCustomerHandler(
      { customer_id: 'abc-123' },
      mockCustomersClient as unknown as CustomersClient,
    );

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.id).toBe('abc-123');
    expect(data.name).toBe('Carlos Ruiz');
    expect(mockCustomersClient.getCustomer).toHaveBeenCalledWith('abc-123');
  });

  it('returns error when customer_id is empty', async () => {
    const result = await getCustomerHandler(
      { customer_id: '' },
      mockCustomersClient as unknown as CustomersClient,
    );

    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('returns clear error message on 404', async () => {
    mockCustomersClient.getCustomer.mockRejectedValue(
      new NotFoundError('Customer not found'),
    );

    const result = await getCustomerHandler(
      { customer_id: '550e8400-e29b-41d4-a716-446655440099' },
      mockCustomersClient as unknown as CustomersClient,
    );

    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe('NOT_FOUND');
  });

  it('handles unexpected errors gracefully', async () => {
    mockCustomersClient.getCustomer.mockRejectedValue(new Error('Network error'));

    const result = await getCustomerHandler(
      { customer_id: '550e8400-e29b-41d4-a716-446655440000' },
      mockCustomersClient as unknown as CustomersClient,
    );

    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe('INTERNAL_ERROR');
  });
});
