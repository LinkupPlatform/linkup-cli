import { readFileSync } from 'node:fs';
import { Command, InvalidArgumentError, Option } from 'commander';
import type { SearchDepth, SearchParams } from 'linkup-sdk';
import { getClient } from '../client';
import { resolveQuery } from '../input/query';
import { exitWithError, formatErrorLine } from '../output/errors';
import { formatJson } from '../output/json';
import { formatSearch } from '../output/search';

export type SearchOutputType = 'sourcedAnswer' | 'searchResults' | 'structured';
export type SearchCliOutputType = 'sourced-answer' | 'search-results' | 'structured';

export type SearchCliOptions = {
  depth: SearchDepth;
  outputType: SearchOutputType;
  schemaFile?: string;
  schema?: string;
  includeDomains?: string[];
  excludeDomains?: string[];
  fromDate?: Date;
  toDate?: Date;
  includeImages?: boolean;
  maxResults?: number;
};

export type BuildSearchParamsResult = {
  params: SearchParams;
  warnings: string[];
};

export const DEPTH_CHOICES: SearchDepth[] = ['fast', 'standard', 'deep'];
export const OUTPUT_CHOICES: SearchCliOutputType[] = [
  'sourced-answer',
  'search-results',
  'structured',
];

const OUTPUT_TYPE_MAP: Record<SearchCliOutputType, SearchOutputType> = {
  'search-results': 'searchResults',
  'sourced-answer': 'sourcedAnswer',
  structured: 'structured',
};

/** Commander-parsed options (--output maps to SDK outputType in toSearchCliOptions). */
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
  clipboard?: boolean;
  file?: string;
};

type SearchGlobalOptions = {
  apiKey?: string;
  json?: boolean;
};

function toSearchCliOptions(options: SearchCommandOptions): SearchCliOptions {
  return {
    depth: options.depth,
    excludeDomains: options.excludeDomains,
    fromDate: options.fromDate,
    includeDomains: options.includeDomains,
    includeImages: options.includeImages,
    maxResults: options.maxResults,
    outputType: OUTPUT_TYPE_MAP[options.output],
    schema: options.schema,
    schemaFile: options.schemaFile,
    toDate: options.toDate,
  };
}

function parseDomainList(value: string, previous: string[] = []): string[] {
  const domains = value
    .split(',')
    .map(domain => domain.trim())
    .filter(Boolean);

  if (domains.length === 0) {
    throw new InvalidArgumentError('must include at least one domain');
  }

  return [...previous, ...domains];
}

function parseMaxResults(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new InvalidArgumentError('must be a positive integer');
  }
  return parsed;
}

function parseDateOption(optionName: string): (value: string) => Date {
  return (value: string): Date => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new InvalidArgumentError(`${optionName} must be a valid date`);
    }

    return date;
  };
}

function readSchemaRaw(opts: SearchCliOptions): string {
  if (opts.schemaFile) {
    try {
      return readFileSync(opts.schemaFile, 'utf8');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Could not read schema file: ${message}`);
    }
  }
  return opts.schema ?? '';
}

function parseSchemaJson(raw: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof SyntaxError ? error.message : String(error);
    throw new Error(`Schema is not valid JSON: ${message}`);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Schema must be a JSON object');
  }

  return parsed as Record<string, unknown>;
}

export function buildSearchParams(query: string, opts: SearchCliOptions): BuildSearchParamsResult {
  const warnings: string[] = [];
  const hasSchemaOption = Boolean(opts.schemaFile || opts.schema);
  addIgnoredOptionWarnings(opts, hasSchemaOption, warnings);
  const extraParams = buildSearchExtraParams(opts);

  if (opts.outputType === 'structured') {
    if (!hasSchemaOption) {
      throw new Error('--output structured requires --schema-file or --schema');
    }
    const raw = readSchemaRaw(opts);
    const structuredOutputSchema = parseSchemaJson(raw);
    return {
      params: {
        depth: opts.depth,
        ...extraParams,
        outputType: 'structured',
        query,
        structuredOutputSchema,
      },
      warnings,
    };
  }

  if (opts.outputType === 'searchResults') {
    return {
      params: {
        depth: opts.depth,
        ...extraParams,
        outputType: 'searchResults',
        query,
      },
      warnings,
    };
  }

  return {
    params: {
      depth: opts.depth,
      ...extraParams,
      outputType: 'sourcedAnswer',
      query,
    },
    warnings,
  };
}

function addIgnoredOptionWarnings(
  opts: SearchCliOptions,
  hasSchemaOption: boolean,
  warnings: string[],
): void {
  if (opts.outputType !== 'structured' && hasSchemaOption) {
    warnings.push('Warning: --schema/--schema-file ignored (only used with --output structured)');
  }

  if (opts.outputType !== 'searchResults' && opts.includeImages) {
    warnings.push('Warning: --include-images ignored (only used with --output search-results)');
  }

  if (opts.outputType !== 'searchResults' && opts.maxResults !== undefined) {
    warnings.push('Warning: --max-results ignored (only used with --output search-results)');
  }
}

function buildSearchExtraParams(opts: SearchCliOptions): Partial<SearchParams> {
  if (opts.fromDate && opts.toDate && opts.fromDate > opts.toDate) {
    throw new Error('--from-date must be before or equal to --to-date');
  }

  return {
    ...(opts.excludeDomains?.length && { excludeDomains: opts.excludeDomains }),
    ...(opts.fromDate && { fromDate: opts.fromDate }),
    ...(opts.includeDomains?.length && { includeDomains: opts.includeDomains }),
    ...(opts.outputType === 'searchResults' && opts.includeImages && { includeImages: true }),
    ...(opts.outputType === 'searchResults' &&
      opts.maxResults !== undefined && { maxResults: opts.maxResults }),
    ...(opts.toDate && { toDate: opts.toDate }),
  };
}

function searchUsageLines(): string[] {
  return [
    'Error: No query provided',
    'Usage:',
    '  linkup search "your query"',
    '  linkup search --clipboard        # read from clipboard',
    '  linkup search --file query.txt   # read from file',
    '  linkup search                    # interactive mode',
  ];
}

async function runSearch(
  queryParts: string[],
  options: SearchCommandOptions,
  command: Command,
): Promise<void> {
  const globalOptions = command.optsWithGlobals<SearchGlobalOptions>();
  const client = getClient(globalOptions.apiKey);

  let resolved: Awaited<ReturnType<typeof resolveQuery>>;
  try {
    resolved = await resolveQuery({
      args: queryParts,
      clipboard: options.clipboard,
      file: options.file,
    });
  } catch (error) {
    exitWithError(formatErrorLine(error));
  }

  if (resolved.cancelled) {
    exitWithError('Cancelled', 0);
  }

  if (!resolved.query) {
    exitWithError(searchUsageLines());
  }

  for (const notice of resolved.notices) {
    console.error(notice);
  }

  try {
    const cliOptions = toSearchCliOptions(options);
    const { params, warnings } = buildSearchParams(resolved.query, cliOptions);

    for (const warning of warnings) {
      console.error(warning);
    }

    const response = await client.search(params);
    const lines = globalOptions.json
      ? formatJson(response)
      : formatSearch(cliOptions.outputType, response);
    for (const line of lines) {
      console.log(line);
    }
  } catch (error) {
    exitWithError(formatErrorLine(error));
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
      'Path to a JSON schema file (required with --output structured)',
    )
    .option('--schema <json>', 'Inline JSON schema string (required with --output structured)')
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
    .option('--max-results <number>', 'Maximum number of search results', parseMaxResults)
    .option('-c, --clipboard', 'Read query from clipboard')
    .option('-f, --file <path>', 'Read query from a file')
    .addHelpText(
      'after',
      `
Examples:
  linkup search "What is the capital of France?"
  linkup "What is the capital of France?"
  linkup search "query" --depth deep
  linkup search "query" --output search-results --max-results 10
  linkup search "query" --output structured --schema-file schema.json
  echo "query" | linkup search
`,
    )
    .action(runSearch);
}
