import { Command } from 'commander';
import { version } from '../package.json';
import { registerConfigCommand } from './commands/config';
import { registerFetchCommand } from './commands/fetch';
import { registerLogoutCommand } from './commands/logout';
import { registerResearchCommand } from './commands/research';
import { registerSearchCommand } from './commands/search';
import { registerSetupCommand } from './commands/setup';
import { registerTasksCommand } from './commands/tasks';
import { applyImplicitSearch, collectKnownCommands } from './implicit-search';
import { exitWithError, formatErrorLine } from './output/errors';

const program = new Command();

program
  .name('linkup')
  .description('Linkup CLI — AI-powered web search from your terminal')
  .version(version, '-v, --version')
  .option('-j, --json', 'Print raw JSON responses')
  .addHelpText(
    'after',
    `
Examples:
  linkup "What is the capital of France?"
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

async function main(): Promise<void> {
  // Commander reserves -V by default; keep this CLI's documented -v alias working case-insensitively.
  const argv = process.argv.map((arg, index) => (index === 2 && arg === '-V' ? '--version' : arg));
  await program.parseAsync(applyImplicitSearch(argv, collectKnownCommands(program)));
}

main().catch(error => {
  exitWithError(formatErrorLine(error));
});
