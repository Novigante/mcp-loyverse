import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getMerchantHandler } from '../../src/tools/getMerchant.js';
import type { MerchantClient } from '../../src/loyverse/merchantClient.js';
import type { Merchant } from '../../src/loyverse/types/merchant.js';

function makeMerchant(overrides: Partial<Merchant> = {}): Merchant {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    business_name: 'Taqueria El Paisa',
    email: 'owner@example.com',
    country: 'MX',
    currency: { code: 'MXN', decimal_places: 2 },
    created_at: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('getMerchant tool', () => {
  let mockMerchantClient: { getMerchant: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockMerchantClient = { getMerchant: vi.fn() };
  });

  it('returns merchant profile', async () => {
    const merchant = makeMerchant();
    mockMerchantClient.getMerchant.mockResolvedValue(merchant);

    const result = await getMerchantHandler(
      mockMerchantClient as unknown as MerchantClient,
    );

    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.business_name).toBe('Taqueria El Paisa');
    expect(data.currency.code).toBe('MXN');
    expect(data.currency.decimal_places).toBe(2);
  });

  it('handles API errors gracefully', async () => {
    mockMerchantClient.getMerchant.mockRejectedValue(new Error('Unauthorized'));

    const result = await getMerchantHandler(
      mockMerchantClient as unknown as MerchantClient,
    );

    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0].text);
    expect(data.code).toBe('INTERNAL_ERROR');
    expect(data.message).toContain('Unauthorized');
  });
});
