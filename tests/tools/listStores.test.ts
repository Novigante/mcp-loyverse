import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listStoresHandler } from '../../src/tools/listStores.js';
import type { StoresClient } from '../../src/loyverse/storesClient.js';
import type { Store, StoresResponse } from '../../src/loyverse/types/store.js';

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

describe('listStores tool', () => {
  let mockStoresClient: { listStores: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockStoresClient = { listStores: vi.fn() };
  });

  it('lists stores with default params', async () => {
    const response: StoresResponse = { stores: [makeStore()] };
    mockStoresClient.listStores.mockResolvedValue(response);

    const result = await listStoresHandler(
      {},
      mockStoresClient as unknown as StoresClient,
    );

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.stores).toHaveLength(1);
    expect(mockStoresClient.listStores).toHaveBeenCalledWith({
      storeIds: undefined,
      showDeleted: undefined,
    });
  });

  it('forwards store_ids filter to the client', async () => {
    const response: StoresResponse = { stores: [] };
    mockStoresClient.listStores.mockResolvedValue(response);

    await listStoresHandler(
      { store_ids: 'id1,id2' },
      mockStoresClient as unknown as StoresClient,
    );

    const callArgs = mockStoresClient.listStores.mock.calls[0][0];
    expect(callArgs.storeIds).toBe('id1,id2');
  });

  it('forwards show_deleted flag', async () => {
    const response: StoresResponse = { stores: [] };
    mockStoresClient.listStores.mockResolvedValue(response);

    await listStoresHandler(
      { show_deleted: true },
      mockStoresClient as unknown as StoresClient,
    );

    const callArgs = mockStoresClient.listStores.mock.calls[0][0];
    expect(callArgs.showDeleted).toBe(true);
  });

  it('handles API errors gracefully', async () => {
    mockStoresClient.listStores.mockRejectedValue(new Error('API timeout'));

    const result = await listStoresHandler(
      {},
      mockStoresClient as unknown as StoresClient,
    );

    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe('INTERNAL_ERROR');
    expect(data.message).toContain('API timeout');
  });
});
