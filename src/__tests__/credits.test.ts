import { CREDITS_URL, verifyApiKey } from '../credits.js';

function mockFetchResponse(response: Partial<Response> & { json?: () => Promise<unknown> }): void {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(response as Response);
}

describe('verifyApiKey', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the credit balance when verification succeeds', async () => {
    mockFetchResponse({
      json: async () => ({ balance: 123.456 }),
      ok: true,
      status: 200,
      statusText: 'OK',
    });

    await expect(verifyApiKey('test-api-key')).resolves.toEqual({
      balance: 123.456,
      ok: true,
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(CREDITS_URL, {
      headers: {
        Authorization: 'Bearer test-api-key',
      },
    });
  });

  it('returns invalid when the API rejects the key', async () => {
    mockFetchResponse({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    await expect(verifyApiKey('bad-key')).resolves.toEqual({
      ok: false,
      reason: 'invalid',
      status: 401,
    });
  });

  it('returns network when fetch throws', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));

    await expect(verifyApiKey('test-api-key')).resolves.toEqual({
      message: 'network down',
      ok: false,
      reason: 'network',
    });
  });
});
