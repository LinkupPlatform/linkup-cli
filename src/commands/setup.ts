import type { Command } from 'commander';

function runSetup(): void {
  console.error('Setup is not implemented yet.');
}

export function registerSetupCommand(program: Command): void {
  program
    .command('setup')
    .description('Interactive setup — configure your API key')
    .action(runSetup);
}
