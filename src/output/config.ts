import { maskApiKey, type ResolvedConfig } from '../config';

const NOT_SET = '(not set)';
const SETUP_HINT = "Run 'linkup setup' to configure your API key";

// Render the resolved configuration as aligned, printable lines (no I/O).
export function formatConfig(resolved: ResolvedConfig): string[] {
  const maskedKey = resolved.apiKey ? maskApiKey(resolved.apiKey) : NOT_SET;

  const rows: Array<[string, string]> = [
    ['API Key', maskedKey],
    ['Source', resolved.sourceLabel],
    ['Config File', resolved.configPath],
  ];

  const labelWidth = Math.max(...rows.map(([label]) => label.length));
  const lines = rows.map(([label, value]) => `${label.padEnd(labelWidth)}  ${value}`);

  if (resolved.source === 'none') {
    lines.push('', SETUP_HINT);
  }

  return lines;
}
