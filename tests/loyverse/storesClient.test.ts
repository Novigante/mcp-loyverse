import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StoresClient } from '../../src/loyverse/storesClient.js';
import type { LoyverseHttpClient } from '../../src/loyverse/httpClient.js';
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

describe('StoresClient', () => {
  let mockHttpClient: { get: ReturnType<typeof vi.fn> };
  let client: StoresClient;

  beforeEach(() => {
    mockHttpClient = { get: vi.fn() };
    client = new StoresClient(mockHttpClient as unknown as LoyverseHttpClient);
  });

  describe('listStores', () => {
    it('calls /stores with no params when none provided', async () => {
      const response: StoresResponse = { stores: [] };
      mockHttpClient.get.mockResolvedValue(response);

      const result = await client.listStores({});

      expect(mockHttpClient.get).toHaveBeenCalledWith('/stores', {});
      expect(result).toEqual(response);
    });

    it('maps camelCase params to snake_case query params', async () => {
      const response: StoresResponse = { stores: [makeStore()] };
      mockHttpClient.get.mockResolvedValue(response);

      const result = await client.listStores({
        storeIds: 'id1,id2',
        createdAtMin: '2025-01-01T00:00:00.000Z',
        createdAtMax: '2025-01-31T23:59:59.999Z',
        updatedAtMin: '2025-01-15T00:00:00.000Z',
        updatedAtMax: '2025-01-20T23:59:59.999Z',
        showDeleted: true,
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/stores', {
        store_ids: 'id1,id2',
        created_at_min: '2025-01-01T00:00:00.000Z',
        created_at_max: '2025-01-31T23:59:59.999Z',
        updated_at_min: '2025-01-15T00:00:00.000Z',
        updated_at_max: '2025-01-20T23:59:59.999Z',
        show_deleted: 'true',
      });
      expect(result.stores).toHaveLength(1);
    });

    it('omits undefined params from query', async () => {
      const response: StoresResponse = { stores: [] };
      mockHttpClient.get.mockResolvedValue(response);

      await client.listStores({ showDeleted: false });

      const params = mockHttpClient.get.mock.calls[0][1] as Record<string, string>;
      expect(params).toEqual({ show_deleted: 'false' });
      expect(params).not.toHaveProperty('store_ids');
    });

    it('propagates errors from httpClient', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Network error'));

      await expect(client.listStores({})).rejects.toThrow('Network error');
    });
  });

  describe('getStore', () => {
    it('calls /stores/{store_id} with the store ID', async () => {
      const store = makeStore({ id: 'abc-123' });
      mockHttpClient.get.mockResolvedValue(store);

      const result = await client.getStore('abc-123');

      expect(mockHttpClient.get).toHaveBeenCalledWith('/stores/abc-123');
      expect(result).toEqual(store);
    });

    it('propagates errors from httpClient', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Not found'));

      await expect(client.getStore('nope')).rejects.toThrow('Not found');
    });
  });
});
