import { Command } from 'commander';
import { version } from '../package.json';
import { registerConfigCommand } from './commands/config';
import { registerFetchCommand } from './commands/fetch';
import { registerLogoutCommand } from './commands/logout';
import { registerSearchCommand } from './commands/search';
import { registerSetupCommand } from './commands/setup';
import { applyImplicitSearch } from './implicit-search';
import { exitWithError, formatErrorLine } from './output/errors';

const program = new Command();

program
  .name('linkup')
  .description('Linkup CLI — AI-powered web search from your terminal')
  .version(version, '-v, --version')
  .option('--api-key <key>', 'Use an API key for this command (overrides config and env)')
  .option('--json', 'Print raw JSON responses')
  .addHelpText(
    'after',
    `
Examples:
  linkup "What is the capital of France?"
  linkup search "latest AI search news" --depth fast
  linkup fetch https://example.com --json
`,
  );

registerSearchCommand(program);
registerFetchCommand(program);
registerSetupCommand(program);
registerConfigCommand(program);
registerLogoutCommand(program);

program.action(() => program.help());

async function main(): Promise<void> {
  const argv = process.argv.map((arg, index) => (index === 2 && arg === '-V' ? '--version' : arg));
  await program.parseAsync(applyImplicitSearch(argv));
}

main().catch(error => {
  exitWithError(formatErrorLine(error));
});
