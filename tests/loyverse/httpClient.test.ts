import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LoyverseHttpClient } from '../../src/loyverse/httpClient.js';
import { AuthError, RateLimitError, NotFoundError, LoyverseApiError } from '../../src/loyverse/errors.js';

const TOKEN = 'test-token-abc123';
const BASE_URL = 'https://api.loyverse.com/v1.0';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(status: number, code: string, details: string, field?: string): Response {
  const errors = [{ code, details, ...(field ? { field } : {}) }];
  return new Response(JSON.stringify({ errors }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('LoyverseHttpClient', () => {
  let client: LoyverseHttpClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    client = new LoyverseHttpClient({ baseUrl: BASE_URL, token: TOKEN, retryDelayMs: 1 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('successful GET returns parsed JSON', async () => {
    const data = { items: [{ id: '1', name: 'Coffee' }] };
    fetchMock.mockResolvedValueOnce(jsonResponse(data));

    const result = await client.get('/items');
    expect(result).toEqual(data);
  });

  it('sets Authorization header with Bearer token', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}));

    await client.get('/items');

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers['Authorization']).toBe(`Bearer ${TOKEN}`);
  });

  it('401 throws AuthError without retry', async () => {
    fetchMock.mockResolvedValueOnce(
      errorResponse(401, 'UNAUTHORIZED', 'Invalid token'),
    );

    await expect(client.get('/items')).rejects.toThrow(AuthError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('403 throws AuthError without retry', async () => {
    fetchMock.mockResolvedValueOnce(
      errorResponse(403, 'FORBIDDEN', 'Access denied'),
    );

    await expect(client.get('/items')).rejects.toThrow(AuthError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('429 retries with backoff then succeeds', async () => {
    const data = { items: [] };
    fetchMock
      .mockResolvedValueOnce(errorResponse(429, 'RATE_LIMITED', 'Too many requests'))
      .mockResolvedValueOnce(jsonResponse(data));

    const result = await client.get('/items');
    expect(result).toEqual(data);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('429 exhausts retries then throws RateLimitError', async () => {
    fetchMock.mockResolvedValue(
      errorResponse(429, 'RATE_LIMITED', 'Too many requests'),
    );

    await expect(client.get('/items')).rejects.toThrow(RateLimitError);
    // 1 initial + 3 retries = 4
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('500 retries once then throws', async () => {
    fetchMock.mockResolvedValue(
      errorResponse(500, 'INTERNAL_SERVER_ERROR', 'Server error'),
    );

    await expect(client.get('/items')).rejects.toThrow(LoyverseApiError);
    // 1 initial + 1 retry = 2
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('404 throws NotFoundError', async () => {
    fetchMock.mockResolvedValueOnce(
      errorResponse(404, 'NOT_FOUND', 'Resource not found'),
    );

    await expect(client.get('/items/nonexistent')).rejects.toThrow(NotFoundError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('network error throws with clear message', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

    await expect(client.get('/items')).rejects.toThrow(/network/i);
  });

  it('query params are correctly appended to URL', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}));

    await client.get('/items', { limit: '10', cursor: 'abc123' });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/items?limit=10&cursor=abc123`);
  });

  it('token never appears in error messages', async () => {
    fetchMock.mockResolvedValueOnce(
      errorResponse(401, 'UNAUTHORIZED', 'Invalid token'),
    );

    try {
      await client.get('/items');
    } catch (e) {
      const message = (e as Error).message;
      expect(message).not.toContain(TOKEN);
    }
  });

  it('handles empty params object', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}));

    await client.get('/items', {});

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/items`);
  });
});
