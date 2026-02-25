import { describe, it, expect, vi, beforeEach } from 'vitest';
import { topSellingItemsHandler } from '../../src/tools/topSellingItems.js';
import type { ReceiptsClient } from '../../src/loyverse/receiptsClient.js';
import type { Receipt, ReceiptsResponse, ReceiptLineItem } from '../../src/loyverse/types/receipt.js';

function makeLineItem(overrides: Partial<ReceiptLineItem> = {}): ReceiptLineItem {
  return {
    id: 'line-1',
    item_id: 'item-1',
    variant_id: 'var-1',
    item_name: 'Taco',
    variant_name: 'Regular',
    sku: 'SKU-001',
    quantity: 1,
    price: 50,
    gross_total_money: 50,
    total_money: 50,
    cost: 20,
    cost_total: 20,
    line_note: '',
    total_discount: 0,
    line_taxes: [],
    line_discounts: [],
    line_modifiers: [],
    ...overrides,
  };
}

function makeReceipt(overrides: Partial<Receipt> = {}): Receipt {
  return {
    receipt_number: 'R-001',
    receipt_type: 'SALE',
    receipt_date: '2025-06-01T12:00:00.000Z',
    created_at: '2025-06-01T12:00:00.000Z',
    updated_at: '2025-06-01T12:00:00.000Z',
    cancelled_at: null,
    refund_for: null,
    order: '',
    source: 'POS',
    note: '',
    customer_id: null,
    employee_id: 'emp-1',
    store_id: 'store-1',
    pos_device_id: 'pos-1',
    dining_option: 'DINE_IN',
    total_money: 100,
    total_tax: 16,
    total_discount: 0,
    gross_sales: 100,
    tip: 10,
    surcharge: 0,
    points_earned: 0,
    points_deducted: 0,
    points_balance: 0,
    line_items: [makeLineItem()],
    total_discounts: [],
    total_taxes: [],
    payments: [],
    ...overrides,
  };
}

describe('topSellingItemsHandler', () => {
  let mockReceiptsClient: { listReceipts: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockReceiptsClient = { listReceipts: vi.fn() };
  });

  it('returns correct ranking by quantity', async () => {
    const receipts: Receipt[] = [
      makeReceipt({
        line_items: [
          makeLineItem({ item_id: 'item-A', item_name: 'Taco', quantity: 5, total_money: 250 }),
          makeLineItem({ item_id: 'item-B', item_name: 'Burrito', quantity: 2, total_money: 160 }),
        ],
      }),
      makeReceipt({
        receipt_number: 'R-002',
        line_items: [
          makeLineItem({ item_id: 'item-A', item_name: 'Taco', quantity: 3, total_money: 150 }),
        ],
      }),
    ];
    const response: ReceiptsResponse = { receipts };
    mockReceiptsClient.listReceipts.mockResolvedValue(response);

    const result = await topSellingItemsHandler(
      { period: 'today', metric: 'quantity' },
      mockReceiptsClient as unknown as ReceiptsClient,
      'UTC',
    );

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.items).toHaveLength(2);
    expect(data.items[0].itemId).toBe('item-A');
    expect(data.items[0].totalQuantity).toBe(8);
    expect(data.items[1].itemId).toBe('item-B');
    expect(data.items[1].totalQuantity).toBe(2);
    expect(data.period.from).toBeDefined();
    expect(data.period.to).toBeDefined();
  });

  it('returns correct ranking by sales_amount', async () => {
    const receipts: Receipt[] = [
      makeReceipt({
        line_items: [
          makeLineItem({ item_id: 'item-A', item_name: 'Taco', quantity: 10, total_money: 100 }),
          makeLineItem({ item_id: 'item-B', item_name: 'Lobster', quantity: 1, total_money: 500 }),
        ],
      }),
    ];
    const response: ReceiptsResponse = { receipts };
    mockReceiptsClient.listReceipts.mockResolvedValue(response);

    const result = await topSellingItemsHandler(
      { period: 'today', metric: 'sales_amount' },
      mockReceiptsClient as unknown as ReceiptsClient,
      'UTC',
    );

    const data = JSON.parse(result.content[0].text);
    expect(data.items[0].itemId).toBe('item-B');
    expect(data.items[0].totalSales).toBe(500);
    expect(data.items[1].itemId).toBe('item-A');
  });

  it('applies limit correctly', async () => {
    const receipts: Receipt[] = [
      makeReceipt({
        line_items: [
          makeLineItem({ item_id: 'item-A', item_name: 'A', quantity: 10 }),
          makeLineItem({ item_id: 'item-B', item_name: 'B', quantity: 8 }),
          makeLineItem({ item_id: 'item-C', item_name: 'C', quantity: 6 }),
          makeLineItem({ item_id: 'item-D', item_name: 'D', quantity: 4 }),
          makeLineItem({ item_id: 'item-E', item_name: 'E', quantity: 2 }),
        ],
      }),
    ];
    const response: ReceiptsResponse = { receipts };
    mockReceiptsClient.listReceipts.mockResolvedValue(response);

    const result = await topSellingItemsHandler(
      { period: 'today', limit: 3 },
      mockReceiptsClient as unknown as ReceiptsClient,
      'UTC',
    );

    const data = JSON.parse(result.content[0].text);
    expect(data.items).toHaveLength(3);
    expect(data.items[0].itemId).toBe('item-A');
    expect(data.items[2].itemId).toBe('item-C');
  });

  it('returns empty array for empty period', async () => {
    const response: ReceiptsResponse = { receipts: [] };
    mockReceiptsClient.listReceipts.mockResolvedValue(response);

    const result = await topSellingItemsHandler(
      { period: 'today' },
      mockReceiptsClient as unknown as ReceiptsClient,
      'UTC',
    );

    const data = JSON.parse(result.content[0].text);
    expect(data.items).toEqual([]);
  });

  it('requires date period or explicit range', async () => {
    const result = await topSellingItemsHandler(
      {},
      mockReceiptsClient as unknown as ReceiptsClient,
      'UTC',
    );

    expect(result.isError).toBe(true);
  });
});
