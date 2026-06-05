import { type Command, InvalidArgumentError } from 'commander';
import type { FetchParams, TaskRequest } from 'linkup-sdk';
import { resolveGlobals } from '../client.js';
import { exitWithError, formatErrorLine } from '../output/errors.js';
import { formatFetch } from '../output/fetch.js';
import { formatTaskErrorLine } from '../output/task-errors.js';
import { createPollIntervalOption, createTimeoutOption, runTaskFlow } from './async-task.js';

type FetchCommandOptions = {
  renderJs?: boolean;
  includeRawHtml?: boolean;
  extractImages?: boolean;
  async?: boolean;
  wait?: boolean;
  pollInterval?: number;
  timeout?: number;
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

export function buildFetchTaskRequest(params: FetchParams): TaskRequest {
  return { input: params, type: 'fetch' };
}

async function runFetch(
  url: string,
  options: FetchCommandOptions,
  command: Command,
): Promise<void> {
  try {
    const { client, json } = resolveGlobals(command);
    const params = buildFetchParams(url, options);

    await runTaskFlow({
      async: options.async,
      buildRequest: buildFetchTaskRequest,
      client,
      formatSync: formatFetch,
      json,
      params,
      pollIntervalSeconds: options.pollInterval,
      runSync: fetchParams => client.fetch(fetchParams),
      timeoutSeconds: options.timeout,
      wait: options.wait,
    });
  } catch (error) {
    exitWithError(options.async ? formatTaskErrorLine(error) : formatErrorLine(error));
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
    .option('--async', 'Run the fetch as an asynchronous task')
    .option('-w, --wait', 'Wait for the asynchronous task to complete and print the result')
    .addOption(createPollIntervalOption())
    .addOption(createTimeoutOption())
    .addHelpText(
      'after',
      `
Examples:
  linkup fetch https://example.com
  linkup fetch https://example.com --render-js
  linkup fetch https://example.com --include-raw-html --json
  linkup fetch https://example.com --async --wait
`,
    )
    .action(runFetch);
}
