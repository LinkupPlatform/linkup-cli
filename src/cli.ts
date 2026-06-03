import { Command } from 'commander';
import { version } from '../package.json';
import { registerConfigCommand } from './commands/config';
import { registerFetchCommand } from './commands/fetch';
import { registerSearchCommand } from './commands/search';
import { registerSetupCommand } from './commands/setup';
import { applyImplicitSearch } from './implicit-search';
import { reportErrorAndExit } from './output/errors';

const program = new Command();

program
  .name('linkup')
  .description('Linkup CLI — AI-powered web search from your terminal')
  .version(version, '-V, --version');

registerSearchCommand(program);
registerFetchCommand(program);
registerSetupCommand(program);
registerConfigCommand(program);

program.action(() => program.help());

async function main(): Promise<void> {
  await program.parseAsync(applyImplicitSearch(process.argv));
}

main().catch(error => {
  reportErrorAndExit(error);
});
