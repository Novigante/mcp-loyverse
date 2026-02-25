import { describe, it, expect, vi, beforeEach } from 'vitest';
import { salesSummaryHandler } from '../../src/tools/salesSummary.js';
import type { ReceiptsClient } from '../../src/loyverse/receiptsClient.js';
import type { MerchantClient } from '../../src/loyverse/merchantClient.js';
import type { Receipt, ReceiptsResponse } from '../../src/loyverse/types/receipt.js';
import type { ReceiptLineItem } from '../../src/loyverse/types/receipt.js';

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

describe('salesSummaryHandler', () => {
  let mockReceiptsClient: { listReceipts: ReturnType<typeof vi.fn> };
  let mockMerchantClient: { getMerchant: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockReceiptsClient = { listReceipts: vi.fn() };
    mockMerchantClient = {
      getMerchant: vi.fn().mockResolvedValue({
        id: 'merchant-1',
        business_name: 'Test Biz',
        email: 'test@test.com',
        country: 'MX',
        currency: { code: 'MXN', decimal_places: 2 },
      }),
    };
  });

  it('returns correct summary shape for a period', async () => {
    const receipts: Receipt[] = [
      makeReceipt({ total_money: 100, total_discount: 20, total_tax: 16, tip: 10 }),
      makeReceipt({ receipt_number: 'R-002', total_money: 200, total_discount: 30, total_tax: 32, tip: 20 }),
    ];
    const response: ReceiptsResponse = { receipts };
    mockReceiptsClient.listReceipts.mockResolvedValue(response);

    const result = await salesSummaryHandler(
      { period: 'today' },
      mockReceiptsClient as unknown as ReceiptsClient,
      mockMerchantClient as unknown as MerchantClient,
      'America/Mexico_City',
    );

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.totalSales).toBe(300);
    expect(data.receiptCount).toBe(2);
    expect(data.averageTicket).toBe(150);
    expect(data.grossSales).toBe(350);
    expect(data.totalDiscounts).toBe(50);
    expect(data.totalTax).toBe(48);
    expect(data.totalTips).toBe(30);
    expect(data.currency).toBe('MXN');
    expect(data.period.from).toBeDefined();
    expect(data.period.to).toBeDefined();
  });

  it('handles empty period (no sales)', async () => {
    const response: ReceiptsResponse = { receipts: [] };
    mockReceiptsClient.listReceipts.mockResolvedValue(response);

    const result = await salesSummaryHandler(
      { period: 'today' },
      mockReceiptsClient as unknown as ReceiptsClient,
      mockMerchantClient as unknown as MerchantClient,
      'UTC',
    );

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.totalSales).toBe(0);
    expect(data.receiptCount).toBe(0);
    expect(data.averageTicket).toBe(0);
  });

  it('handles period with only refunds', async () => {
    const receipts: Receipt[] = [
      makeReceipt({ receipt_type: 'REFUND', total_money: 50 }),
      makeReceipt({ receipt_number: 'R-002', receipt_type: 'REFUND', total_money: 30 }),
    ];
    const response: ReceiptsResponse = { receipts };
    mockReceiptsClient.listReceipts.mockResolvedValue(response);

    const result = await salesSummaryHandler(
      { period: 'today' },
      mockReceiptsClient as unknown as ReceiptsClient,
      mockMerchantClient as unknown as MerchantClient,
      'UTC',
    );

    const data = JSON.parse(result.content[0].text);
    expect(data.totalSales).toBe(0);
    expect(data.receiptCount).toBe(0);
  });

  it('forwards store_id correctly', async () => {
    const response: ReceiptsResponse = { receipts: [makeReceipt()] };
    mockReceiptsClient.listReceipts.mockResolvedValue(response);

    await salesSummaryHandler(
      { period: 'today', store_id: 'store-123' },
      mockReceiptsClient as unknown as ReceiptsClient,
      mockMerchantClient as unknown as MerchantClient,
      'UTC',
    );

    const callArgs = mockReceiptsClient.listReceipts.mock.calls[0][0];
    expect(callArgs.storeId).toBe('store-123');
  });

  it('requires date period or explicit range', async () => {
    const result = await salesSummaryHandler(
      {},
      mockReceiptsClient as unknown as ReceiptsClient,
      mockMerchantClient as unknown as MerchantClient,
      'UTC',
    );

    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('works with explicit from/to range', async () => {
    const receipts: Receipt[] = [makeReceipt({ total_money: 500 })];
    const response: ReceiptsResponse = { receipts };
    mockReceiptsClient.listReceipts.mockResolvedValue(response);

    const result = await salesSummaryHandler(
      { from: '2025-06-01T00:00:00.000Z', to: '2025-06-30T23:59:59.999Z' },
      mockReceiptsClient as unknown as ReceiptsClient,
      mockMerchantClient as unknown as MerchantClient,
      'UTC',
    );

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.totalSales).toBe(500);
  });
});
