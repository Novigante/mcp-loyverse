import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getStoreHandler } from '../../src/tools/getStore.js';
import type { StoresClient } from '../../src/loyverse/storesClient.js';
import { NotFoundError } from '../../src/loyverse/errors.js';
import type { Store } from '../../src/loyverse/types/store.js';

function makeStore(overrides: Partial<Store> = {}): Store {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Main Store',
    address: 'Av. Reforma 123',
    city: 'CDMX',
    state: 'CDMX',
    postal_code: '06600',
    country: 'MX',
    phone_number: '+525512345678',
    description: 'Main branch',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

describe('getStore tool', () => {
  let mockStoresClient: { getStore: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockStoresClient = { getStore: vi.fn() };
  });

  it('returns store data for valid store_id', async () => {
    const store = makeStore({ id: 'abc-123', name: 'Branch 2' });
    mockStoresClient.getStore.mockResolvedValue(store);

    const result = await getStoreHandler(
      { store_id: 'abc-123' },
      mockStoresClient as unknown as StoresClient,
    );

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.id).toBe('abc-123');
    expect(data.name).toBe('Branch 2');
    expect(mockStoresClient.getStore).toHaveBeenCalledWith('abc-123');
  });

  it('returns error when store_id is empty', async () => {
    const result = await getStoreHandler(
      { store_id: '' },
      mockStoresClient as unknown as StoresClient,
    );

    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('returns clear error message on 404', async () => {
    mockStoresClient.getStore.mockRejectedValue(
      new NotFoundError('Store not found'),
    );

    const result = await getStoreHandler(
      { store_id: '550e8400-e29b-41d4-a716-446655440099' },
      mockStoresClient as unknown as StoresClient,
    );

    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe('NOT_FOUND');
  });

  it('handles unexpected errors gracefully', async () => {
    mockStoresClient.getStore.mockRejectedValue(new Error('Network error'));

    const result = await getStoreHandler(
      { store_id: '550e8400-e29b-41d4-a716-446655440000' },
      mockStoresClient as unknown as StoresClient,
    );

    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe('INTERNAL_ERROR');
  });
});
