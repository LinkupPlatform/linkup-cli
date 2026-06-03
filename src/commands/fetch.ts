import type { Command } from 'commander';
import { getClient } from '../client';
import { reportErrorAndExit } from '../output/errors';

async function runFetch(url: string): Promise<void> {
  try {
    const client = getClient();
    const response = await client.fetch({ url });
    console.log(JSON.stringify(response));
  } catch (error) {
    reportErrorAndExit(error);
  }
}

export function registerFetchCommand(program: Command): void {
  program
    .command('fetch')
    .alias('f')
    .description('Fetch and extract content from a URL')
    .argument('<url>', 'URL to fetch')
    .action(runFetch);
}
