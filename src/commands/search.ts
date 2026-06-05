import { Command, Option } from 'commander';
import type { SearchDepth, SearchParams, TaskRequest } from 'linkup-sdk';
import { resolveGlobals } from '../client';
import { exitWithError, formatErrorLine } from '../output/errors';
import { formatSearch } from '../output/search';
import { formatTaskErrorLine } from '../output/task-errors';
import { createPollIntervalOption, createTimeoutOption, runAsyncTaskFlow } from './async-task';
import { parseDateOption, parseDomainList, parsePositiveInt } from './option-parsers';
import { queryUsageLines, resolveQueryOrExit } from './query-input';
import {
  addSchemaIgnoredWarning,
  buildCommonParams,
  hasStructuredSchemaOption,
  isOptionExplicit,
  loadStructuredSchema,
  resolveStructuredOutputType,
  STRUCTURED_REQUIRES_SCHEMA,
} from './shared-params';

export type SearchOutputType = 'sourcedAnswer' | 'searchResults' | 'structured';
type SearchCliOutputType = 'sourced-answer' | 'search-results' | 'structured';

type SearchCliOptions = {
  depth: SearchDepth;
  outputType: SearchOutputType;
  outputTypeExplicit?: boolean;
  schemaFile?: string;
  schema?: string;
  includeDomains?: string[];
  excludeDomains?: string[];
  fromDate?: Date;
  toDate?: Date;
  includeImages?: boolean;
  maxResults?: number;
};

type BuildSearchParamsResult = {
  params: SearchParams;
  warnings: string[];
};

const DEPTH_CHOICES: SearchDepth[] = ['fast', 'standard', 'deep'];
const OUTPUT_CHOICES: SearchCliOutputType[] = ['sourced-answer', 'search-results', 'structured'];

const OUTPUT_TYPE_MAP: Record<SearchCliOutputType, SearchOutputType> = {
  'search-results': 'searchResults',
  'sourced-answer': 'sourcedAnswer',
  structured: 'structured',
};

// Commander-parsed options (--output maps to SDK outputType in toSearchCliOptions).
type SearchCommandOptions = {
  depth: SearchDepth;
  output: SearchCliOutputType;
  schemaFile?: string;
  schema?: string;
  includeDomains?: string[];
  excludeDomains?: string[];
  fromDate?: Date;
  toDate?: Date;
  includeImages?: boolean;
  maxResults?: number;
  file?: string;
  async?: boolean;
  wait?: boolean;
  pollInterval?: number;
  timeout?: number;
};

function toSearchCliOptions(
  options: SearchCommandOptions,
  outputTypeExplicit: boolean,
): SearchCliOptions {
  return {
    depth: options.depth,
    excludeDomains: options.excludeDomains,
    fromDate: options.fromDate,
    includeDomains: options.includeDomains,
    includeImages: options.includeImages,
    maxResults: options.maxResults,
    outputType: OUTPUT_TYPE_MAP[options.output],
    outputTypeExplicit,
    schema: options.schema,
    schemaFile: options.schemaFile,
    toDate: options.toDate,
  };
}

export function buildSearchParams(query: string, opts: SearchCliOptions): BuildSearchParamsResult {
  const warnings: string[] = [];
  const hasSchemaOption = hasStructuredSchemaOption(opts);
  const outputType = resolveStructuredOutputType(opts, {
    disallowedSchemaOutputType: 'searchResults',
    disallowedSchemaOutputTypeMessage:
      '--schema/--schema-file cannot be used with --output search-results',
  });
  const effectiveOpts = { ...opts, outputType };
  addIgnoredOptionWarnings(effectiveOpts, hasSchemaOption, warnings);
  const extraParams = buildSearchExtraParams(effectiveOpts);

  if (outputType === 'structured') {
    if (!hasSchemaOption) {
      throw new Error(STRUCTURED_REQUIRES_SCHEMA);
    }
    return {
      params: {
        depth: opts.depth,
        ...extraParams,
        outputType: 'structured',
        query,
        structuredOutputSchema: loadStructuredSchema(opts),
      },
      warnings,
    };
  }

  return {
    params: {
      depth: opts.depth,
      ...extraParams,
      outputType,
      query,
    },
    warnings,
  };
}

export function buildSearchTaskRequest(params: SearchParams): TaskRequest {
  return { input: params, type: 'search' };
}

function addIgnoredOptionWarnings(
  opts: SearchCliOptions,
  hasSchemaOption: boolean,
  warnings: string[],
): void {
  addSchemaIgnoredWarning(opts.outputType, hasSchemaOption, warnings);

  if (opts.outputType !== 'searchResults' && opts.includeImages) {
    warnings.push('Warning: --include-images ignored (only used with --output search-results)');
  }

  if (opts.outputType !== 'searchResults' && opts.maxResults !== undefined) {
    warnings.push('Warning: --max-results ignored (only used with --output search-results)');
  }
}

function buildSearchExtraParams(opts: SearchCliOptions): Partial<SearchParams> {
  return {
    ...buildCommonParams(opts),
    ...(opts.outputType === 'searchResults' && opts.includeImages && { includeImages: true }),
    ...(opts.outputType === 'searchResults' &&
      opts.maxResults !== undefined && { maxResults: opts.maxResults }),
  };
}

async function runSearch(
  queryParts: string[],
  options: SearchCommandOptions,
  command: Command,
): Promise<void> {
  const { client, json } = resolveGlobals(command);

  const query = await resolveQueryOrExit(
    {
      args: queryParts,
      file: options.file,
    },
    queryUsageLines('search', 'your query'),
  );

  try {
    const cliOptions = toSearchCliOptions(options, isOptionExplicit(command, 'output'));
    const { params, warnings } = buildSearchParams(query, cliOptions);

    for (const warning of warnings) {
      console.error(warning);
    }

    await runAsyncTaskFlow({
      async: options.async,
      buildRequest: buildSearchTaskRequest,
      client,
      formatSync: response => formatSearch(params.outputType, response),
      json,
      params,
      pollIntervalSeconds: options.pollInterval,
      runSync: searchParams => client.search(searchParams),
      timeoutSeconds: options.timeout,
      wait: options.wait,
    });
  } catch (error) {
    exitWithError(options.async ? formatTaskErrorLine(error) : formatErrorLine(error));
  }
}

export function registerSearchCommand(program: Command): void {
  const depthOption = new Option('-d, --depth <depth>', 'Search depth')
    .choices(DEPTH_CHOICES)
    .default('standard');

  const outputOption = new Option('-o, --output <type>', 'Output type')
    .choices(OUTPUT_CHOICES)
    .default('sourced-answer');

  program
    .command('search')
    .alias('s')
    .description('Search the web')
    .argument('[query...]', 'Search query')
    .addOption(depthOption)
    .addOption(outputOption)
    .option(
      '--schema-file <path>',
      'Path to a JSON schema file (implies --output structured unless --output is set)',
    )
    .option(
      '--schema <json>',
      'Inline JSON schema string (implies --output structured unless --output is set)',
    )
    .option('--include-domains <domains>', 'Comma-separated domains to include', parseDomainList)
    .option('--exclude-domains <domains>', 'Comma-separated domains to exclude', parseDomainList)
    .option(
      '--from-date <date>',
      'Only include results published on or after this date',
      parseDateOption('--from-date'),
    )
    .option(
      '--to-date <date>',
      'Only include results published on or before this date',
      parseDateOption('--to-date'),
    )
    .option('--include-images', 'Request images in search results')
    .option('--max-results <number>', 'Maximum number of search results', parsePositiveInt)
    .option('-f, --file <path>', 'Read query from a file')
    .option('--async', 'Run the search as an asynchronous task')
    .option('-w, --wait', 'Wait for the asynchronous task to complete and print the result')
    .addOption(createPollIntervalOption())
    .addOption(createTimeoutOption())
    .addHelpText(
      'after',
      `
Examples:
  linkup search "What is the capital of France?"
  linkup "What is the capital of France?"
  linkup search "query" --depth deep
  linkup search "query" --output search-results --max-results 10
  linkup search "query" --output structured --schema-file schema.json
  linkup search "query" --async --wait
  echo "query" | linkup search
`,
    )
    .action(runSearch);
}
