import type { ResolvedConfig } from '../config.js';
import { formatConfig } from '../output/config.js';

const CONFIG_PATH = '/home/user/.linkup/config';

describe('formatConfig', () => {
  it('masks the key and labels the env source', () => {
    const resolved: ResolvedConfig = {
      apiKey: 'abcdefghijklmnop',
      configPath: CONFIG_PATH,
      source: 'env',
      sourceLabel: 'Environment variable',
    };

    const lines = formatConfig(resolved);

    expect(lines).toContain('API Key      abcdefgh...mnop');
    expect(lines).toContain('Source       Environment variable');
    expect(lines).toContain(`Config File  ${CONFIG_PATH}`);
    expect(lines.some(line => line.includes('linkup setup'))).toBe(false);
  });

  it('uses the config path as the source label for the file source', () => {
    const resolved: ResolvedConfig = {
      apiKey: 'abcdefghijklmnop',
      configPath: CONFIG_PATH,
      source: 'file',
      sourceLabel: CONFIG_PATH,
    };

    const lines = formatConfig(resolved);

    expect(lines).toContain(`Source       ${CONFIG_PATH}`);
  });

  it('shows (not set) and the setup hint when unconfigured', () => {
    const resolved: ResolvedConfig = {
      apiKey: null,
      configPath: CONFIG_PATH,
      source: 'none',
      sourceLabel: '(not configured)',
    };

    const lines = formatConfig(resolved);

    expect(lines).toContain('API Key      (not set)');
    expect(lines).toContain("Run 'linkup setup' to configure your API key");
  });

  it('shows a masked placeholder for keys too short to partially mask', () => {
    const resolved: ResolvedConfig = {
      apiKey: 'shortkey',
      configPath: CONFIG_PATH,
      source: 'file',
      sourceLabel: CONFIG_PATH,
    };

    const lines = formatConfig(resolved);

    expect(lines).toContain('API Key      **********');
  });
});
