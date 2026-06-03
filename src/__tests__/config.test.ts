import { chmodSync, existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  clearApiKey,
  getApiKey,
  maskApiKey,
  readKeyFromFile,
  resolveConfig,
  saveApiKey,
} from '../config';

const ENV_VAR_NAME = 'LINKUP_API_KEY';
const originalEnvKey = process.env[ENV_VAR_NAME];

function tempConfigPath(): string {
  const dir = mkdtempSync(join(tmpdir(), 'linkup-config-test-'));
  return join(dir, 'config');
}

afterEach(() => {
  if (originalEnvKey === undefined) {
    delete process.env[ENV_VAR_NAME];
  } else {
    process.env[ENV_VAR_NAME] = originalEnvKey;
  }
});

describe('readKeyFromFile', () => {
  it('parses api_key= from file and trims the value', () => {
    const configPath = tempConfigPath();
    writeFileSync(configPath, 'api_key=  my-secret-key  \n');

    expect(readKeyFromFile(configPath)).toBe('my-secret-key');
  });

  it('uses the first api_key= line', () => {
    const configPath = tempConfigPath();
    writeFileSync(configPath, 'api_key=first\napi_key=second\n');

    expect(readKeyFromFile(configPath)).toBe('first');
  });

  it('preserves values containing equals signs', () => {
    const configPath = tempConfigPath();
    writeFileSync(configPath, 'api_key=key=with=equals\n');

    expect(readKeyFromFile(configPath)).toBe('key=with=equals');
  });

  it('returns null for missing file', () => {
    const configPath = join(tmpdir(), 'linkup-config-missing', 'config');
    expect(readKeyFromFile(configPath)).toBeNull();
  });

  it('returns null when api_key= has no value', () => {
    const configPath = tempConfigPath();
    writeFileSync(configPath, 'api_key=\n');

    expect(readKeyFromFile(configPath)).toBeNull();
  });

  it('throws on a non-ENOENT read error instead of masking it', () => {
    const configPath = tempConfigPath();
    writeFileSync(configPath, 'api_key=secret\n');
    chmodSync(configPath, 0o000);

    try {
      expect(() => readKeyFromFile(configPath)).toThrow();
    } finally {
      chmodSync(configPath, 0o600);
    }
  });
});

describe('getApiKey', () => {
  it('prefers LINKUP_API_KEY over the config file', () => {
    const configPath = tempConfigPath();
    writeFileSync(configPath, 'api_key=file-key\n');
    process.env[ENV_VAR_NAME] = 'env-key';

    expect(getApiKey(configPath)).toBe('env-key');
  });

  it('falls back to the config file when env var is empty', () => {
    const configPath = tempConfigPath();
    writeFileSync(configPath, 'api_key=file-key\n');
    process.env[ENV_VAR_NAME] = '';

    expect(getApiKey(configPath)).toBe('file-key');
  });

  it('falls back to the config file when env var is whitespace', () => {
    const configPath = tempConfigPath();
    writeFileSync(configPath, 'api_key=file-key\n');
    process.env[ENV_VAR_NAME] = '   ';

    expect(getApiKey(configPath)).toBe('file-key');
  });

  it('returns null when neither env nor file is configured', () => {
    const configPath = tempConfigPath();
    delete process.env[ENV_VAR_NAME];

    expect(getApiKey(configPath)).toBeNull();
  });
});

describe('saveApiKey', () => {
  it('writes api_key= line and creates parent directory', () => {
    const configPath = tempConfigPath();
    saveApiKey('my-secret-key', configPath);

    expect(readFileSync(configPath, 'utf8')).toBe('api_key=my-secret-key\n');
  });

  it('rejects empty keys', () => {
    const configPath = tempConfigPath();

    expect(() => saveApiKey('', configPath)).toThrow(
      'Invalid API key: must be at least 10 characters and single-line.',
    );
  });

  it('rejects keys containing newlines', () => {
    const configPath = tempConfigPath();

    expect(() => saveApiKey('abc\ninjected', configPath)).toThrow(
      'Invalid API key: must be at least 10 characters and single-line.',
    );
  });

  it('trims keys before saving', () => {
    const configPath = tempConfigPath();

    saveApiKey('  my-secret-key  ', configPath);

    expect(readFileSync(configPath, 'utf8')).toBe('api_key=my-secret-key\n');
  });

  it('sets restrictive file and directory permissions on Unix', () => {
    if (process.platform === 'win32') {
      return;
    }

    const configPath = tempConfigPath();
    saveApiKey('my-secret-key', configPath);

    const dirMode = statSync(dirname(configPath)).mode & 0o777;
    const fileMode = statSync(configPath).mode & 0o777;

    expect(dirMode).toBe(0o700);
    expect(fileMode).toBe(0o600);
  });
});

describe('clearApiKey', () => {
  it('removes the saved config file when it exists', () => {
    const configPath = tempConfigPath();
    saveApiKey('my-secret-key', configPath);

    expect(clearApiKey(configPath)).toBe(true);
    expect(existsSync(configPath)).toBe(false);
  });

  it('returns false when no saved config file exists', () => {
    expect(clearApiKey(tempConfigPath())).toBe(false);
  });
});

describe('maskApiKey', () => {
  it('masks keys longer than 12 characters', () => {
    expect(maskApiKey('abcdefghijklmnop')).toBe('abcdefgh...mnop');
  });

  it('fully masks keys of 12 characters or fewer', () => {
    expect(maskApiKey('123456789012')).toBe('************');
    expect(maskApiKey('short')).toBe('**********');
    expect(maskApiKey('')).toBe('**********');
  });
});

describe('resolveConfig', () => {
  it('reports env source when LINKUP_API_KEY is set', () => {
    const configPath = tempConfigPath();
    process.env[ENV_VAR_NAME] = 'env-key';

    expect(resolveConfig(configPath)).toEqual({
      apiKey: 'env-key',
      configPath,
      source: 'env',
      sourceLabel: 'Environment variable',
    });
  });

  it('reports file source when only the config file has a key', () => {
    const configPath = tempConfigPath();
    delete process.env[ENV_VAR_NAME];
    writeFileSync(configPath, 'api_key=file-key\n');

    expect(resolveConfig(configPath)).toEqual({
      apiKey: 'file-key',
      configPath,
      source: 'file',
      sourceLabel: configPath,
    });
  });

  it('reports none when unconfigured', () => {
    const configPath = tempConfigPath();
    delete process.env[ENV_VAR_NAME];

    expect(resolveConfig(configPath)).toEqual({
      apiKey: null,
      configPath,
      source: 'none',
      sourceLabel: '(not configured)',
    });
  });
});
