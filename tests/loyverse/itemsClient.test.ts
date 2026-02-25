import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ItemsClient } from '../../src/loyverse/itemsClient.js';
import type { LoyverseHttpClient } from '../../src/loyverse/httpClient.js';
import type { Item, ItemsResponse } from '../../src/loyverse/types/item.js';

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    handle: 'test-item',
    reference_id: '',
    item_name: 'Test Item',
    description: 'A test item',
    sku: 'SKU-001',
    image_url: '',
    category_id: null,
    tax_ids: [],
    modifier_ids: [],
    primary_supplier_id: null,
    option1_name: '',
    option2_name: '',
    option3_name: '',
    track_stock: false,
    sold_by_weight: false,
    is_composite: false,
    use_production: false,
    color: 'GREY',
    form: 'SQUARE',
    components: [],
    variants: [],
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

describe('ItemsClient', () => {
  let mockHttpClient: { get: ReturnType<typeof vi.fn> };
  let client: ItemsClient;

  beforeEach(() => {
    mockHttpClient = { get: vi.fn() };
    client = new ItemsClient(mockHttpClient as unknown as LoyverseHttpClient);
  });

  describe('listItems', () => {
    it('calls /items with no params when none provided', async () => {
      const response: ItemsResponse = { items: [] };
      mockHttpClient.get.mockResolvedValue(response);

      const result = await client.listItems({});

      expect(mockHttpClient.get).toHaveBeenCalledWith('/items', {});
      expect(result).toEqual(response);
    });

    it('maps camelCase params to snake_case query params', async () => {
      const response: ItemsResponse = { items: [makeItem()], cursor: 'next' };
      mockHttpClient.get.mockResolvedValue(response);

      const result = await client.listItems({
        itemsIds: 'id1,id2',
        createdAtMin: '2025-01-01T00:00:00.000Z',
        createdAtMax: '2025-01-31T23:59:59.999Z',
        updatedAtMin: '2025-01-15T00:00:00.000Z',
        updatedAtMax: '2025-01-20T23:59:59.999Z',
        showDeleted: true,
        limit: 100,
        cursor: 'prev-cursor',
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/items', {
        items_ids: 'id1,id2',
        created_at_min: '2025-01-01T00:00:00.000Z',
        created_at_max: '2025-01-31T23:59:59.999Z',
        updated_at_min: '2025-01-15T00:00:00.000Z',
        updated_at_max: '2025-01-20T23:59:59.999Z',
        show_deleted: 'true',
        limit: '100',
        cursor: 'prev-cursor',
      });
      expect(result.items).toHaveLength(1);
      expect(result.cursor).toBe('next');
    });

    it('omits undefined params from query', async () => {
      const response: ItemsResponse = { items: [] };
      mockHttpClient.get.mockResolvedValue(response);

      await client.listItems({ limit: 25 });

      const params = mockHttpClient.get.mock.calls[0][1] as Record<string, string>;
      expect(params).toEqual({ limit: '25' });
      expect(params).not.toHaveProperty('items_ids');
      expect(params).not.toHaveProperty('show_deleted');
    });

    it('propagates errors from httpClient', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Network error'));

      await expect(client.listItems({})).rejects.toThrow('Network error');
    });
  });

  describe('getItem', () => {
    it('calls /items/{item_id} with the item ID', async () => {
      const item = makeItem({ id: 'abc-123' });
      mockHttpClient.get.mockResolvedValue(item);

      const result = await client.getItem('abc-123');

      expect(mockHttpClient.get).toHaveBeenCalledWith('/items/abc-123');
      expect(result).toEqual(item);
    });

    it('propagates errors from httpClient', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Not found'));

      await expect(client.getItem('nope')).rejects.toThrow('Not found');
    });
  });
});
