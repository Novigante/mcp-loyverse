import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listReceiptsHandler } from '../../src/tools/listReceipts.js';
import type { ReceiptsClient } from '../../src/loyverse/receiptsClient.js';
import type { Receipt, ReceiptsResponse } from '../../src/loyverse/types/receipt.js';

function makeReceipt(overrides: Partial<Receipt> = {}): Receipt {
  return {
    receipt_number: 'R-001',
    receipt_type: 'SALE',
    receipt_date: '2025-01-15T10:00:00.000Z',
    created_at: '2025-01-15T10:00:00.000Z',
    updated_at: '2025-01-15T10:00:00.000Z',
    cancelled_at: null,
    refund_for: null,
    order: '',
    source: 'POS',
    note: '',
    customer_id: null,
    employee_id: '550e8400-e29b-41d4-a716-446655440001',
    store_id: '550e8400-e29b-41d4-a716-446655440000',
    pos_device_id: '550e8400-e29b-41d4-a716-446655440002',
    dining_option: '',
    total_money: 100,
    total_tax: 16,
    total_discount: 0,
    tip: 0,
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

describe('listReceipts tool', () => {
  let mockReceiptsClient: { listReceipts: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockReceiptsClient = { listReceipts: vi.fn() };
  });

  it('processes a date period preset correctly', async () => {
    const response: ReceiptsResponse = {
      receipts: [makeReceipt()],
      cursor: 'next-cursor',
    };
    mockReceiptsClient.listReceipts.mockResolvedValue(response);

    const result = await listReceiptsHandler(
      { period: 'today', limit: 50 },
      mockReceiptsClient as unknown as ReceiptsClient,
      'UTC',
    );

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.receipts).toHaveLength(1);
    expect(data.cursor).toBe('next-cursor');

    // Verify the client was called with resolved date range
    const callArgs = mockReceiptsClient.listReceipts.mock.calls[0][0];
    expect(callArgs.createdAtMin).toBeDefined();
    expect(callArgs.createdAtMax).toBeDefined();
  });

  it('processes explicit from/to date range', async () => {
    const response: ReceiptsResponse = { receipts: [] };
    mockReceiptsClient.listReceipts.mockResolvedValue(response);

    const result = await listReceiptsHandler(
      { from: '2025-01-01T00:00:00Z', to: '2025-01-31T23:59:59Z', limit: 25 },
      mockReceiptsClient as unknown as ReceiptsClient,
      'UTC',
    );

    expect(result.isError).toBeUndefined();
    const callArgs = mockReceiptsClient.listReceipts.mock.calls[0][0];
    expect(callArgs.createdAtMin).toBe('2025-01-01T00:00:00.000Z');
    expect(callArgs.createdAtMax).toBe('2025-01-31T23:59:59.000Z');
    expect(callArgs.limit).toBe(25);
  });

  it('processes receipt_numbers filter without requiring date range', async () => {
    const response: ReceiptsResponse = { receipts: [makeReceipt()] };
    mockReceiptsClient.listReceipts.mockResolvedValue(response);

    const result = await listReceiptsHandler(
      { receipt_numbers: 'R-001,R-002' },
      mockReceiptsClient as unknown as ReceiptsClient,
      'UTC',
    );

    expect(result.isError).toBeUndefined();
    const callArgs = mockReceiptsClient.listReceipts.mock.calls[0][0];
    expect(callArgs.receiptNumbers).toBe('R-001,R-002');
    expect(callArgs.createdAtMin).toBeUndefined();
    expect(callArgs.createdAtMax).toBeUndefined();
  });

  it('returns error when no period, from/to, or receipt_numbers provided', async () => {
    const result = await listReceiptsHandler(
      {},
      mockReceiptsClient as unknown as ReceiptsClient,
      'UTC',
    );

    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('forwards store_id to the client', async () => {
    const storeId = '550e8400-e29b-41d4-a716-446655440000';
    const response: ReceiptsResponse = { receipts: [] };
    mockReceiptsClient.listReceipts.mockResolvedValue(response);

    await listReceiptsHandler(
      { period: 'today', store_id: storeId },
      mockReceiptsClient as unknown as ReceiptsClient,
      'UTC',
    );

    const callArgs = mockReceiptsClient.listReceipts.mock.calls[0][0];
    expect(callArgs.storeId).toBe(storeId);
  });

  it('forwards pagination params to the client', async () => {
    const response: ReceiptsResponse = { receipts: [] };
    mockReceiptsClient.listReceipts.mockResolvedValue(response);

    await listReceiptsHandler(
      { period: 'today', limit: 100, cursor: 'abc123' },
      mockReceiptsClient as unknown as ReceiptsClient,
      'UTC',
    );

    const callArgs = mockReceiptsClient.listReceipts.mock.calls[0][0];
    expect(callArgs.limit).toBe(100);
    expect(callArgs.cursor).toBe('abc123');
  });

  it('handles API errors gracefully', async () => {
    mockReceiptsClient.listReceipts.mockRejectedValue(new Error('API timeout'));

    const result = await listReceiptsHandler(
      { period: 'today' },
      mockReceiptsClient as unknown as ReceiptsClient,
      'UTC',
    );

    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe('INTERNAL_ERROR');
    expect(data.message).toContain('API timeout');
  });
});
