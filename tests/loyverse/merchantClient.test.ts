import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MerchantClient } from '../../src/loyverse/merchantClient.js';
import type { LoyverseHttpClient } from '../../src/loyverse/httpClient.js';
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

describe('MerchantClient', () => {
  let mockHttpClient: { get: ReturnType<typeof vi.fn> };
  let client: MerchantClient;

  beforeEach(() => {
    mockHttpClient = { get: vi.fn() };
    client = new MerchantClient(mockHttpClient as unknown as LoyverseHttpClient);
  });

  it('calls /merchant with no params', async () => {
    const merchant = makeMerchant();
    mockHttpClient.get.mockResolvedValue(merchant);

    const result = await client.getMerchant();

    expect(mockHttpClient.get).toHaveBeenCalledWith('/merchant');
    expect(result).toEqual(merchant);
  });

  it('propagates errors from httpClient', async () => {
    mockHttpClient.get.mockRejectedValue(new Error('Unauthorized'));

    await expect(client.getMerchant()).rejects.toThrow('Unauthorized');
  });
});
