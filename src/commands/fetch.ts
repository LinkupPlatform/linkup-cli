import { type Command, InvalidArgumentError } from 'commander';
import type { FetchParams } from 'linkup-sdk';
import { resolveGlobals } from '../client';
import { exitWithError, formatErrorLine, printLines } from '../output/errors';
import { formatFetch } from '../output/fetch';
import { formatJson } from '../output/json';

export type FetchCommandOptions = {
  renderJs?: boolean;
  includeRawHtml?: boolean;
  extractImages?: boolean;
};

function parseFetchUrl(value: string): string {
  try {
    new URL(value);
  } catch {
    throw new InvalidArgumentError('must be a valid URL');
  }
  return value;
}

export function buildFetchParams(url: string, options: FetchCommandOptions): FetchParams {
  return {
    url,
    ...(options.renderJs && { renderJs: true }),
    ...(options.includeRawHtml && { includeRawHtml: true }),
    ...(options.extractImages && { extractImages: true }),
  };
}

async function runFetch(
  url: string,
  options: FetchCommandOptions,
  command: Command,
): Promise<void> {
  try {
    const { client, json } = resolveGlobals(command);
    const response = await client.fetch(buildFetchParams(url, options));
    const lines = json ? formatJson(response) : formatFetch(response);
    printLines(lines);
  } catch (error) {
    exitWithError(formatErrorLine(error));
  }
}

export function registerFetchCommand(program: Command): void {
  program
    .command('fetch')
    .alias('f')
    .description('Fetch and extract content from a URL')
    .argument('<url>', 'URL to fetch', parseFetchUrl)
    .option('--render-js', 'Execute JavaScript before extracting content')
    .option('--include-raw-html', 'Include the raw HTML in the response output')
    .option('--extract-images', 'Extract image metadata from the fetched page')
    .addHelpText(
      'after',
      `
Examples:
  linkup fetch https://example.com
  linkup fetch https://example.com --render-js
  linkup fetch https://example.com --include-raw-html --json
`,
    )
    .action(runFetch);
}
