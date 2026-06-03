import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const CONFIG_DIR_NAME = '.linkup';
const KEY_PREFIX = 'api_key=';
const MIN_API_KEY_LENGTH = 10;

export type ConfigSource = 'env' | 'file' | 'none';

export type ResolvedConfig = {
  apiKey: string | null;
  source: ConfigSource;
  sourceLabel: string;
  configPath: string;
};

export function getConfigDir(): string {
  return join(homedir(), CONFIG_DIR_NAME);
}

export function getConfigPath(): string {
  return join(getConfigDir(), 'config');
}

export function readKeyFromFile(configPath: string = getConfigPath()): string | null {
  let content: string;
  try {
    content = readFileSync(configPath, 'utf8').trim();
  } catch (error) {
    // A missing config file is expected (key may come from the env var or not be set yet).
    // Any other error (e.g. permissions) is surfaced rather than masked as "not configured".
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }

  for (const line of content.split('\n')) {
    if (line.startsWith(KEY_PREFIX)) {
      const value = line.slice(KEY_PREFIX.length).trim();
      return value || null;
    }
  }
  return null;
}

/**
 * Resolve API key configuration. `LINKUP_API_KEY` takes precedence over `~/.linkup/config`.
 * Prefer the env var for CI, scripts, and other automations; the config file is for local interactive use.
 */
export function resolveConfig(configPath: string = getConfigPath()): ResolvedConfig {
  const envKey = process.env.LINKUP_API_KEY?.trim();
  if (envKey) {
    return {
      apiKey: envKey,
      configPath,
      source: 'env',
      sourceLabel: 'Environment variable',
    };
  }

  const fileKey = readKeyFromFile(configPath);
  if (fileKey) {
    return {
      apiKey: fileKey,
      configPath,
      source: 'file',
      sourceLabel: configPath,
    };
  }

  return {
    apiKey: null,
    configPath,
    source: 'none',
    sourceLabel: '(not configured)',
  };
}

export function getApiKey(configPath: string = getConfigPath()): string | null {
  return resolveConfig(configPath).apiKey;
}

export function validateApiKey(apiKey: string): string | null {
  const normalized = apiKey.trim();
  if (!normalized || normalized.length < MIN_API_KEY_LENGTH || /[\r\n]/.test(apiKey)) {
    return `Invalid API key: must be at least ${MIN_API_KEY_LENGTH} characters and single-line.`;
  }
  return null;
}

function normalizeApiKeyForSave(apiKey: string): string {
  const validationError = validateApiKey(apiKey);
  if (validationError) {
    throw new Error(validationError);
  }
  return apiKey.trim();
}

export function saveApiKey(apiKey: string, configPath: string = getConfigPath()): void {
  const normalizedApiKey = normalizeApiKeyForSave(apiKey);

  const dirMode = 0o700;
  const fileMode = 0o600;
  const dir = dirname(configPath);
  mkdirSync(dir, { mode: dirMode, recursive: true });
  chmodSync(dir, dirMode);

  const tmpPath = `${configPath}.tmp`;
  try {
    writeFileSync(tmpPath, `${KEY_PREFIX}${normalizedApiKey}\n`, {
      encoding: 'utf8',
      mode: fileMode,
    });
    chmodSync(tmpPath, fileMode);
    renameSync(tmpPath, configPath);
  } catch (error) {
    try {
      rmSync(tmpPath, { force: true });
    } catch {
      // Best-effort cleanup.
    }
    throw error;
  }
}

export function clearApiKey(configPath: string = getConfigPath()): boolean {
  if (!existsSync(configPath)) {
    return false;
  }

  rmSync(configPath);
  return true;
}

export function maskApiKey(key: string): string {
  const minLength = 12;
  const prefixLength = 8;
  const suffixLength = 4;

  if (key.length > minLength) {
    return `${key.slice(0, prefixLength)}...${key.slice(-suffixLength)}`;
  }
  return '*'.repeat(Math.max(key.length, MIN_API_KEY_LENGTH));
}
