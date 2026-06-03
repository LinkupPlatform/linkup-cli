import type { Command } from 'commander';
import { resolveConfig } from '../config';
import { formatConfig } from '../output/config';

function runConfig(): void {
  const resolved = resolveConfig();
  for (const line of formatConfig(resolved)) {
    console.log(line);
  }
}

export function registerConfigCommand(program: Command): void {
  program.command('config').alias('c').description('Show configuration').action(runConfig);
}
