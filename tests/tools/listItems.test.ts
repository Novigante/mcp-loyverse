import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listItemsHandler } from '../../src/tools/listItems.js';
import type { ItemsClient } from '../../src/loyverse/itemsClient.js';
import type { Item, ItemsResponse } from '../../src/loyverse/types/item.js';

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    handle: 'test-item',
    reference_id: '',
    item_name: 'Test Item',
    description: '',
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

describe('listItems tool', () => {
  let mockItemsClient: { listItems: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockItemsClient = { listItems: vi.fn() };
  });

  it('lists items with default params', async () => {
    const response: ItemsResponse = { items: [makeItem()], cursor: 'next' };
    mockItemsClient.listItems.mockResolvedValue(response);

    const result = await listItemsHandler(
      { limit: 50 },
      mockItemsClient as unknown as ItemsClient,
    );

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.items).toHaveLength(1);
    expect(data.cursor).toBe('next');
    expect(mockItemsClient.listItems).toHaveBeenCalledWith({
      limit: 50,
      cursor: undefined,
      itemsIds: undefined,
      showDeleted: undefined,
    });
  });

  it('forwards items_ids filter to the client', async () => {
    const response: ItemsResponse = { items: [] };
    mockItemsClient.listItems.mockResolvedValue(response);

    await listItemsHandler(
      { items_ids: 'id1,id2', limit: 50 },
      mockItemsClient as unknown as ItemsClient,
    );

    const callArgs = mockItemsClient.listItems.mock.calls[0][0];
    expect(callArgs.itemsIds).toBe('id1,id2');
  });

  it('forwards pagination params to the client', async () => {
    const response: ItemsResponse = { items: [] };
    mockItemsClient.listItems.mockResolvedValue(response);

    await listItemsHandler(
      { limit: 100, cursor: 'abc123' },
      mockItemsClient as unknown as ItemsClient,
    );

    const callArgs = mockItemsClient.listItems.mock.calls[0][0];
    expect(callArgs.limit).toBe(100);
    expect(callArgs.cursor).toBe('abc123');
  });

  it('forwards show_deleted flag', async () => {
    const response: ItemsResponse = { items: [] };
    mockItemsClient.listItems.mockResolvedValue(response);

    await listItemsHandler(
      { show_deleted: true, limit: 50 },
      mockItemsClient as unknown as ItemsClient,
    );

    const callArgs = mockItemsClient.listItems.mock.calls[0][0];
    expect(callArgs.showDeleted).toBe(true);
  });

  it('handles API errors gracefully', async () => {
    mockItemsClient.listItems.mockRejectedValue(new Error('API timeout'));

    const result = await listItemsHandler(
      { limit: 50 },
      mockItemsClient as unknown as ItemsClient,
    );

    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe('INTERNAL_ERROR');
    expect(data.message).toContain('API timeout');
  });
});
