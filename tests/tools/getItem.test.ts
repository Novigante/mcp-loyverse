import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getItemHandler } from '../../src/tools/getItem.js';
import type { ItemsClient } from '../../src/loyverse/itemsClient.js';
import { NotFoundError } from '../../src/loyverse/errors.js';
import type { Item } from '../../src/loyverse/types/item.js';

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    handle: 'test-item',
    reference_id: '',
    name: 'Test Item',
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

describe('getItem tool', () => {
  let mockItemsClient: { getItem: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockItemsClient = { getItem: vi.fn() };
  });

  it('returns item data for valid item_id', async () => {
    const item = makeItem({ id: 'abc-123', name: 'Cool Item' });
    mockItemsClient.getItem.mockResolvedValue(item);

    const result = await getItemHandler(
      { item_id: 'abc-123' },
      mockItemsClient as unknown as ItemsClient,
    );

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.id).toBe('abc-123');
    expect(data.name).toBe('Cool Item');
    expect(mockItemsClient.getItem).toHaveBeenCalledWith('abc-123');
  });

  it('returns error when item_id is empty', async () => {
    const result = await getItemHandler(
      { item_id: '' },
      mockItemsClient as unknown as ItemsClient,
    );

    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('returns clear error message on 404', async () => {
    mockItemsClient.getItem.mockRejectedValue(
      new NotFoundError('Item not found'),
    );

    const result = await getItemHandler(
      { item_id: '550e8400-e29b-41d4-a716-446655440099' },
      mockItemsClient as unknown as ItemsClient,
    );

    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe('NOT_FOUND');
  });

  it('handles unexpected errors gracefully', async () => {
    mockItemsClient.getItem.mockRejectedValue(new Error('Network error'));

    const result = await getItemHandler(
      { item_id: '550e8400-e29b-41d4-a716-446655440000' },
      mockItemsClient as unknown as ItemsClient,
    );

    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe('INTERNAL_ERROR');
  });
});
