import { password } from '@inquirer/prompts';
import type { Mock } from 'vitest';
import { run } from '../cli.js';
import * as configModule from '../config.js';
import { captureConsole, mockProcessExit } from './helpers/capture.js';

vi.mock('open', () => ({
  __esModule: true,
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@inquirer/prompts', () => ({
  password: vi.fn(),
}));

function mockCreditsResponse(
  response: Partial<Response> & { json?: () => Promise<unknown> },
): void {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(response as Response);
}

describe('auth and config integration', () => {
  const originalApiKey = process.env.LINKUP_API_KEY;

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.LINKUP_API_KEY;
    } else {
      process.env.LINKUP_API_KEY = originalApiKey;
    }
    vi.restoreAllMocks();
  });

  it('prints API key setup guidance when search is invoked without credentials', async () => {
    vi.spyOn(configModule, 'resolveConfig').mockReturnValue({
      apiKey: null,
      configPath: '/tmp/linkup-config',
      source: 'none',
      sourceLabel: '(not configured)',
    });
    const restoreExit = mockProcessExit();
    const { errorSpy } = captureConsole();

    try {
      await expect(run(['node', 'linkup', 'search', 'q'])).rejects.toMatchObject({ code: 1 });
    } finally {
      restoreExit();
    }

    expect(errorSpy).toHaveBeenCalledWith('Error: Linkup API key not configured');
    expect(errorSpy).toHaveBeenCalledWith("\nRun 'linkup setup' to configure your API key");
    expect(errorSpy).toHaveBeenCalledWith('Or set the LINKUP_API_KEY environment variable');
  });

  it('prints environment warning after logout when LINKUP_API_KEY is still set', async () => {
    process.env.LINKUP_API_KEY = 'test-api-key-abcdefghijklmnop';
    vi.spyOn(configModule, 'resolveConfig').mockReturnValue({
      apiKey: process.env.LINKUP_API_KEY,
      configPath: '/tmp/linkup-config',
      source: 'env',
      sourceLabel: 'Environment variable',
    });
    vi.spyOn(configModule, 'clearApiKey').mockReturnValue(true);
    const { logSpy } = captureConsole();
    await run(['node', 'linkup', 'logout']);

    expect(logSpy).toHaveBeenCalledWith('Removed API key from /tmp/linkup-config');
    expect(logSpy).toHaveBeenCalledWith(
      'LINKUP_API_KEY is still set in your environment; unset it to fully log out.',
    );
  });

  it('exits cleanly when setup is cancelled at the API key prompt', async () => {
    (password as Mock).mockRejectedValueOnce(new Error('cancelled'));
    const restoreExit = mockProcessExit();
    const { logSpy } = captureConsole();

    try {
      await expect(run(['node', 'linkup', 'setup'])).rejects.toMatchObject({ code: 0 });
    } finally {
      restoreExit();
    }

    expect(logSpy).toHaveBeenCalledWith('\nSetup cancelled.');
  });

  it('exits with an error when setup cannot save configuration', async () => {
    (password as Mock).mockResolvedValueOnce('test-api-key-abcdefghijklmnop');
    mockCreditsResponse({
      json: async () => ({ balance: 12.34 }),
      ok: true,
      status: 200,
      statusText: 'OK',
    });
    vi.spyOn(configModule, 'saveApiKey').mockImplementation(() => {
      throw new Error('disk full');
    });
    vi.spyOn(configModule, 'getConfigPath').mockReturnValue('/tmp/linkup-config');
    const restoreExit = mockProcessExit();
    const { errorSpy } = captureConsole();

    try {
      await expect(run(['node', 'linkup', 'setup'])).rejects.toMatchObject({ code: 1 });
    } finally {
      restoreExit();
    }

    expect(errorSpy).toHaveBeenCalledWith('Error: Saving config failed: disk full');
  });

  it('exits with an error when setup verification rejects the API key', async () => {
    (password as Mock).mockResolvedValueOnce('invalid-api-key');
    mockCreditsResponse({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });
    const saveSpy = vi.spyOn(configModule, 'saveApiKey');
    const restoreExit = mockProcessExit();
    const { errorSpy } = captureConsole();

    try {
      await expect(run(['node', 'linkup', 'setup'])).rejects.toMatchObject({ code: 1 });
    } finally {
      restoreExit();
    }

    expect(errorSpy).toHaveBeenCalledWith(
      'Error: Invalid API key. Get a valid key at https://app.linkup.so',
    );
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('saves the API key and prints a warning when setup verification has a network error', async () => {
    (password as Mock).mockResolvedValueOnce('test-api-key-abcdefghijklmnop');
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));
    vi.spyOn(configModule, 'saveApiKey').mockImplementation(() => undefined);
    vi.spyOn(configModule, 'getConfigPath').mockReturnValue('/tmp/linkup-config');
    const { errorSpy, logSpy } = captureConsole();

    await run(['node', 'linkup', 'setup']);

    expect(configModule.saveApiKey).toHaveBeenCalledWith('test-api-key-abcdefghijklmnop');
    expect(logSpy).toHaveBeenCalledWith('API key saved to /tmp/linkup-config');
    expect(errorSpy).toHaveBeenCalledWith('Warning: API key verification failed: network down');
    expect(errorSpy).toHaveBeenCalledWith(
      'Your API key was saved. You can test it with \'linkup search "hello"\'',
    );
  });
});
