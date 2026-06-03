import type { Command } from 'commander';

function runConfig(): void {
  console.error('Config is not implemented yet.');
}

export function registerConfigCommand(program: Command): void {
  program.command('config').alias('c').description('Show configuration').action(runConfig);
}
