import type { Command } from 'commander';
import { resolveConfig } from '../config.js';
import { formatConfig } from '../output/config.js';
import { printLines } from '../output/errors.js';

function runConfig(): void {
  const resolved = resolveConfig();
  printLines(formatConfig(resolved));
}

export function registerConfigCommand(program: Command): void {
  program.command('config').description('Show configuration').action(runConfig);
}
