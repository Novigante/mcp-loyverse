import { describe, it, expect, vi, beforeEach } from 'vitest';
import { collectAllReceipts } from '../../../src/domain/analytics/receiptCollector.js';
import type { ReceiptsClient } from '../../../src/loyverse/receiptsClient.js';
import type { Receipt, ReceiptsResponse } from '../../../src/loyverse/types/receipt.js';

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
    line_items: [],
    total_discounts: [],
    total_taxes: [],
    payments: [],
    ...overrides,
  };
}

describe('collectAllReceipts', () => {
  let mockReceiptsClient: { listReceipts: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockReceiptsClient = { listReceipts: vi.fn() };
  });

  it('fetches multiple pages until no cursor', async () => {
    const page1: ReceiptsResponse = {
      receipts: [makeReceipt({ receipt_number: 'R-001' })],
      cursor: 'cursor-2',
    };
    const page2: ReceiptsResponse = {
      receipts: [makeReceipt({ receipt_number: 'R-002' })],
      cursor: 'cursor-3',
    };
    const page3: ReceiptsResponse = {
      receipts: [makeReceipt({ receipt_number: 'R-003' })],
    };

    mockReceiptsClient.listReceipts
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2)
      .mockResolvedValueOnce(page3);

    const receipts = await collectAllReceipts(
      mockReceiptsClient as unknown as ReceiptsClient,
      { createdAtMin: '2025-06-01T00:00:00.000Z', createdAtMax: '2025-06-30T23:59:59.999Z' },
    );

    expect(receipts).toHaveLength(3);
    expect(mockReceiptsClient.listReceipts).toHaveBeenCalledTimes(3);

    // Verify first call passes date range params
    const firstCallArgs = mockReceiptsClient.listReceipts.mock.calls[0][0];
    expect(firstCallArgs.createdAtMin).toBe('2025-06-01T00:00:00.000Z');
    expect(firstCallArgs.createdAtMax).toBe('2025-06-30T23:59:59.999Z');
    expect(firstCallArgs.limit).toBe(250);
    expect(firstCallArgs.cursor).toBeUndefined();

    // Verify second call passes cursor
    const secondCallArgs = mockReceiptsClient.listReceipts.mock.calls[1][0];
    expect(secondCallArgs.cursor).toBe('cursor-2');
  });

  it('stops at safety limit', async () => {
    // Create a response that returns 3 receipts per page
    const makePageResponse = (cursor?: string): ReceiptsResponse => ({
      receipts: [
        makeReceipt({ receipt_number: `R-${Math.random()}` }),
        makeReceipt({ receipt_number: `R-${Math.random()}` }),
        makeReceipt({ receipt_number: `R-${Math.random()}` }),
      ],
      cursor,
    });

    // Always return a cursor so pagination would continue forever
    mockReceiptsClient.listReceipts.mockImplementation(async () =>
      makePageResponse('next-cursor'),
    );

    const receipts = await collectAllReceipts(
      mockReceiptsClient as unknown as ReceiptsClient,
      { maxReceipts: 5 },
    );

    // Should stop after 2 pages (6 receipts >= 5 limit)
    expect(receipts.length).toBeLessThanOrEqual(6);
    expect(receipts.length).toBeGreaterThanOrEqual(3);
  });

  it('passes storeId filter correctly', async () => {
    const response: ReceiptsResponse = { receipts: [makeReceipt()] };
    mockReceiptsClient.listReceipts.mockResolvedValue(response);

    await collectAllReceipts(
      mockReceiptsClient as unknown as ReceiptsClient,
      { storeId: 'store-123' },
    );

    const callArgs = mockReceiptsClient.listReceipts.mock.calls[0][0];
    expect(callArgs.storeId).toBe('store-123');
  });

  it('returns empty array when no receipts exist', async () => {
    const response: ReceiptsResponse = { receipts: [] };
    mockReceiptsClient.listReceipts.mockResolvedValue(response);

    const receipts = await collectAllReceipts(
      mockReceiptsClient as unknown as ReceiptsClient,
      {},
    );

    expect(receipts).toEqual([]);
    expect(mockReceiptsClient.listReceipts).toHaveBeenCalledTimes(1);
  });
});
