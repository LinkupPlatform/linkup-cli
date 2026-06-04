import { password } from '@inquirer/prompts';
import { run } from '../cli';
import * as configModule from '../config';
import { captureConsole, mockProcessExit } from './helpers/capture';

jest.mock('open', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@inquirer/prompts', () => ({
  password: jest.fn(),
}));

describe('auth and config integration', () => {
  const originalApiKey = process.env.LINKUP_API_KEY;

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.LINKUP_API_KEY;
    } else {
      process.env.LINKUP_API_KEY = originalApiKey;
    }
    jest.restoreAllMocks();
  });

  it('prints API key setup guidance when search is invoked without credentials', async () => {
    jest.spyOn(configModule, 'resolveConfig').mockReturnValue({
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
    jest.spyOn(configModule, 'resolveConfig').mockReturnValue({
      apiKey: process.env.LINKUP_API_KEY,
      configPath: '/tmp/linkup-config',
      source: 'env',
      sourceLabel: 'Environment variable',
    });
    jest.spyOn(configModule, 'clearApiKey').mockReturnValue(true);
    const { logSpy } = captureConsole();
    await run(['node', 'linkup', 'logout']);

    expect(logSpy).toHaveBeenCalledWith('Removed API key from /tmp/linkup-config');
    expect(logSpy).toHaveBeenCalledWith(
      'LINKUP_API_KEY is still set in your environment; unset it to fully log out.',
    );
  });

  it('exits cleanly when setup is cancelled at the API key prompt', async () => {
    (password as jest.Mock).mockRejectedValueOnce(new Error('cancelled'));
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
    (password as jest.Mock).mockResolvedValueOnce('test-api-key-abcdefghijklmnop');
    jest.spyOn(configModule, 'saveApiKey').mockImplementation(() => {
      throw new Error('disk full');
    });
    jest.spyOn(configModule, 'getConfigPath').mockReturnValue('/tmp/linkup-config');
    const restoreExit = mockProcessExit();
    const { errorSpy } = captureConsole();

    try {
      await expect(run(['node', 'linkup', 'setup'])).rejects.toMatchObject({ code: 1 });
    } finally {
      restoreExit();
    }

    expect(errorSpy).toHaveBeenCalledWith('Error: Saving config failed: disk full');
  });
});
