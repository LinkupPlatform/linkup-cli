import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LinkupClient } from 'linkup-sdk';
import { getClient } from '../client.js';
import * as config from '../config.js';

const ENV_VAR_NAME = 'LINKUP_API_KEY';
const originalEnvKey = process.env[ENV_VAR_NAME];
const originalExit = process.exit;

function tempConfigPath(): string {
  const dir = mkdtempSync(join(tmpdir(), 'linkup-client-test-'));
  return join(dir, 'config');
}

afterEach(() => {
  if (originalEnvKey === undefined) {
    delete process.env[ENV_VAR_NAME];
  } else {
    process.env[ENV_VAR_NAME] = originalEnvKey;
  }
  process.exit = originalExit;
  vi.restoreAllMocks();
});

describe('getClient', () => {
  it('returns a LinkupClient when an API key is configured', () => {
    process.env[ENV_VAR_NAME] = 'test-api-key-abcdefghijklmnop';

    const client = getClient();
    expect(client).toBeInstanceOf(LinkupClient);
  });

  it('exits with code 1 when no API key is configured', () => {
    const configPath = tempConfigPath();
    delete process.env[ENV_VAR_NAME];
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const exitMock = vi.fn() as never;
    process.exit = exitMock;

    vi.spyOn(config, 'resolveConfig').mockReturnValue({
      apiKey: null,
      configPath,
      source: 'none',
      sourceLabel: '(not configured)',
    });

    getClient();

    expect(exitMock).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalled();
  });
});
