import type { Command } from 'commander';
import { resolveConfig } from '../config';
import { formatConfig } from '../output/config';
import { printLines } from '../output/errors';

function runConfig(): void {
  const resolved = resolveConfig();
  printLines(formatConfig(resolved));
}

export function registerConfigCommand(program: Command): void {
  program.command('config').description('Show configuration').action(runConfig);
}
