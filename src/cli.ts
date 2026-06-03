import { Command } from 'commander';
import { version } from '../package.json';

const program = new Command();

program
  .name('linkup')
  .description('Linkup CLI — AI-powered web search from your terminal')
  .version(version, '-V, --version');

// Print help when invoked with no subcommand (parity with Python CLI).
program.action(() => program.help());

program.parse();
