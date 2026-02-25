import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReceiptsClient } from '../../src/loyverse/receiptsClient.js';
import type { LoyverseHttpClient } from '../../src/loyverse/httpClient.js';
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

describe('ReceiptsClient', () => {
  let mockHttpClient: { get: ReturnType<typeof vi.fn> };
  let client: ReceiptsClient;

  beforeEach(() => {
    mockHttpClient = { get: vi.fn() };
    client = new ReceiptsClient(mockHttpClient as unknown as LoyverseHttpClient);
  });

  describe('listReceipts', () => {
    it('calls /receipts with no params when none provided', async () => {
      const response: ReceiptsResponse = { receipts: [] };
      mockHttpClient.get.mockResolvedValue(response);

      const result = await client.listReceipts({});

      expect(mockHttpClient.get).toHaveBeenCalledWith('/receipts', {});
      expect(result).toEqual(response);
    });

    it('maps camelCase params to snake_case query params', async () => {
      const response: ReceiptsResponse = { receipts: [makeReceipt()], cursor: 'abc' };
      mockHttpClient.get.mockResolvedValue(response);

      const result = await client.listReceipts({
        createdAtMin: '2025-01-01T00:00:00.000Z',
        createdAtMax: '2025-01-31T23:59:59.999Z',
        storeId: '550e8400-e29b-41d4-a716-446655440000',
        limit: 100,
        cursor: 'prev-cursor',
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/receipts', {
        created_at_min: '2025-01-01T00:00:00.000Z',
        created_at_max: '2025-01-31T23:59:59.999Z',
        store_id: '550e8400-e29b-41d4-a716-446655440000',
        limit: '100',
        cursor: 'prev-cursor',
      });
      expect(result.receipts).toHaveLength(1);
      expect(result.cursor).toBe('abc');
    });

    it('passes receipt_numbers as comma-separated string', async () => {
      const response: ReceiptsResponse = { receipts: [] };
      mockHttpClient.get.mockResolvedValue(response);

      await client.listReceipts({ receiptNumbers: 'R-001,R-002,R-003' });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/receipts', {
        receipt_numbers: 'R-001,R-002,R-003',
      });
    });

    it('omits undefined params from query', async () => {
      const response: ReceiptsResponse = { receipts: [] };
      mockHttpClient.get.mockResolvedValue(response);

      await client.listReceipts({ storeId: '550e8400-e29b-41d4-a716-446655440000' });

      const params = mockHttpClient.get.mock.calls[0][1] as Record<string, string>;
      expect(params).toEqual({ store_id: '550e8400-e29b-41d4-a716-446655440000' });
      expect(params).not.toHaveProperty('created_at_min');
      expect(params).not.toHaveProperty('created_at_max');
      expect(params).not.toHaveProperty('limit');
      expect(params).not.toHaveProperty('cursor');
    });

    it('propagates errors from httpClient', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Network error'));

      await expect(client.listReceipts({})).rejects.toThrow('Network error');
    });
  });

  describe('getReceipt', () => {
    it('calls /receipts/{receipt_number} with the receipt number', async () => {
      const receipt = makeReceipt({ receipt_number: 'R-42' });
      mockHttpClient.get.mockResolvedValue(receipt);

      const result = await client.getReceipt('R-42');

      expect(mockHttpClient.get).toHaveBeenCalledWith('/receipts/R-42');
      expect(result).toEqual(receipt);
    });

    it('propagates errors from httpClient', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Not found'));

      await expect(client.getReceipt('NOPE')).rejects.toThrow('Not found');
    });
  });
});
