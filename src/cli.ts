import { Command } from 'commander';
import pkg from '../package.json' with { type: 'json' };
import { registerConfigCommand } from './commands/config.js';
import { registerFetchCommand } from './commands/fetch.js';
import { registerLogoutCommand } from './commands/logout.js';
import { registerResearchCommand } from './commands/research.js';
import { registerSearchCommand } from './commands/search.js';
import { registerSetupCommand } from './commands/setup.js';
import { registerTasksCommand } from './commands/tasks.js';

export function createCLI(): Command {
  const program = new Command();

  program
    .name('linkup')
    .description('Linkup CLI — AI-powered web search from your terminal')
    .version(pkg.version, '-v, --version')
    .option('-j, --json', 'Print raw JSON responses')
    .addHelpText(
      'after',
      `
Examples:
  linkup search "What is the capital of France?"
  linkup search "latest AI search news" --depth fast
  linkup fetch https://example.com --json
  linkup research "State of the semiconductor market in 2026" --wait
`,
    );

  registerSearchCommand(program);
  registerFetchCommand(program);
  registerResearchCommand(program);
  registerTasksCommand(program);
  registerSetupCommand(program);
  registerConfigCommand(program);
  registerLogoutCommand(program);

  program.action(() => program.help());
  return program;
}

export async function run(argv: string[] = process.argv): Promise<void> {
  const program = createCLI();
  await program.parseAsync(argv);
}
