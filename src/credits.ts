export const CREDITS_URL = 'https://api.linkup.so/v1/credits/balance';

type VerifyApiKeyResult =
  | { ok: true; balance: number }
  | { ok: false; reason: 'invalid'; status: number }
  | { ok: false; reason: 'network'; message: string };

function formatNetworkError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function readBalance(data: unknown): number {
  if (
    typeof data === 'object' &&
    data !== null &&
    'balance' in data &&
    typeof data.balance === 'number'
  ) {
    return data.balance;
  }

  throw new Error('Credits endpoint returned an invalid response');
}

export async function verifyApiKey(apiKey: string): Promise<VerifyApiKeyResult> {
  try {
    const response = await fetch(CREDITS_URL, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return { balance: readBalance(await response.json()), ok: true };
    }

    if (response.status === 401 || response.status === 403) {
      return { ok: false, reason: 'invalid', status: response.status };
    }

    return {
      message: `Credits endpoint returned ${response.status} ${response.statusText}`,
      ok: false,
      reason: 'network',
    };
  } catch (error) {
    return {
      message: formatNetworkError(error),
      ok: false,
      reason: 'network',
    };
  }
}
