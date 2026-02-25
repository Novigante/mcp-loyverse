import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getReceiptHandler } from '../../src/tools/getReceipt.js';
import type { ReceiptsClient } from '../../src/loyverse/receiptsClient.js';
import { NotFoundError } from '../../src/loyverse/errors.js';
import type { Receipt } from '../../src/loyverse/types/receipt.js';

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

describe('getReceipt tool', () => {
  let mockReceiptsClient: { getReceipt: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockReceiptsClient = { getReceipt: vi.fn() };
  });

  it('returns receipt data for valid receipt_number', async () => {
    const receipt = makeReceipt({ receipt_number: 'R-42' });
    mockReceiptsClient.getReceipt.mockResolvedValue(receipt);

    const result = await getReceiptHandler(
      { receipt_number: 'R-42' },
      mockReceiptsClient as unknown as ReceiptsClient,
    );

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.receipt_number).toBe('R-42');
    expect(mockReceiptsClient.getReceipt).toHaveBeenCalledWith('R-42');
  });

  it('returns error when receipt_number is empty', async () => {
    const result = await getReceiptHandler(
      { receipt_number: '' },
      mockReceiptsClient as unknown as ReceiptsClient,
    );

    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('returns clear error message on 404', async () => {
    mockReceiptsClient.getReceipt.mockRejectedValue(
      new NotFoundError('Receipt not found'),
    );

    const result = await getReceiptHandler(
      { receipt_number: 'NOPE' },
      mockReceiptsClient as unknown as ReceiptsClient,
    );

    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe('NOT_FOUND');
  });

  it('handles unexpected errors gracefully', async () => {
    mockReceiptsClient.getReceipt.mockRejectedValue(new Error('Network error'));

    const result = await getReceiptHandler(
      { receipt_number: 'R-001' },
      mockReceiptsClient as unknown as ReceiptsClient,
    );

    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe('INTERNAL_ERROR');
  });
});
