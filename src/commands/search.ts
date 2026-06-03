import { readFileSync } from 'node:fs';
import { Command, Option } from 'commander';
import type { SearchDepth, SearchParams } from 'linkup-sdk';
import { getClient } from '../client';
import { reportErrorAndExit } from '../output/errors';

export type SearchOutputType = 'sourcedAnswer' | 'searchResults' | 'structured';

export type SearchCliOptions = {
  depth: SearchDepth;
  outputType: SearchOutputType;
  schemaFile?: string;
  schema?: string;
};

export type BuildSearchParamsResult = {
  params: SearchParams;
  warnings: string[];
};

export const DEPTH_CHOICES: SearchDepth[] = ['fast', 'standard', 'deep'];
export const OUTPUT_CHOICES: SearchOutputType[] = ['sourcedAnswer', 'searchResults', 'structured'];

/** Commander-parsed options (--output maps to SDK outputType in toSearchCliOptions). */
type SearchCommandOptions = {
  depth: SearchDepth;
  output: SearchOutputType;
  schemaFile?: string;
  schema?: string;
  clipboard?: boolean;
  file?: string;
};

function toSearchCliOptions(options: SearchCommandOptions): SearchCliOptions {
  return {
    depth: options.depth,
    outputType: options.output,
    schema: options.schema,
    schemaFile: options.schemaFile,
  };
}

function readSchemaRaw(opts: SearchCliOptions): string {
  if (opts.schemaFile) {
    try {
      return readFileSync(opts.schemaFile, 'utf8');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Error reading schema file: ${message}`);
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
    throw new Error(`Error: schema is not valid JSON: ${message}`);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Error: schema must be a JSON object');
  }

  return parsed as Record<string, unknown>;
}

export function buildSearchParams(query: string, opts: SearchCliOptions): BuildSearchParamsResult {
  const warnings: string[] = [];
  const hasSchemaOption = Boolean(opts.schemaFile || opts.schema);

  if (opts.outputType === 'structured') {
    if (!hasSchemaOption) {
      throw new Error('Error: --output structured requires --schema-file or --schema');
    }
    const raw = readSchemaRaw(opts);
    const structuredOutputSchema = parseSchemaJson(raw);
    return {
      params: {
        depth: opts.depth,
        outputType: 'structured',
        query,
        structuredOutputSchema,
      },
      warnings,
    };
  }

  if (hasSchemaOption) {
    warnings.push('Warning: --schema/--schema-file ignored (only used with -o structured)');
  }

  if (opts.outputType === 'searchResults') {
    return {
      params: {
        depth: opts.depth,
        outputType: 'searchResults',
        query,
      },
      warnings,
    };
  }

  return {
    params: {
      depth: opts.depth,
      outputType: 'sourcedAnswer',
      query,
    },
    warnings,
  };
}

async function runSearch(queryParts: string[], options: SearchCommandOptions): Promise<void> {
  if (options.clipboard) {
    console.error('Error: --clipboard is not implemented yet');
    process.exit(1);
  }
  if (options.file) {
    console.error('Error: --file is not implemented yet');
    process.exit(1);
  }

  const query = queryParts.join(' ').trim();
  if (!query) {
    console.error('Error: No query provided');
    process.exit(1);
  }

  try {
    const { params, warnings } = buildSearchParams(query, toSearchCliOptions(options));

    for (const warning of warnings) {
      console.error(warning);
    }

    const client = getClient();
    const response = await client.search(params);
    console.log(JSON.stringify(response));
  } catch (error) {
    reportErrorAndExit(error);
  }
}

export function registerSearchCommand(program: Command): void {
  const depthOption = new Option(
    '-d, --depth <depth>',
    `Search depth (${DEPTH_CHOICES.join(' | ')})`,
  )
    .choices(DEPTH_CHOICES)
    .default('standard');

  const outputOption = new Option(
    '-o, --output <type>',
    `Output type (${OUTPUT_CHOICES.join(' | ')})`,
  )
    .choices(OUTPUT_CHOICES)
    .default('sourcedAnswer');

  program
    .command('search')
    .alias('s')
    .description('Search the web')
    .argument('[query...]', 'Search query')
    .addOption(depthOption)
    .addOption(outputOption)
    .option('--schema-file <path>', 'Path to a JSON schema file (required with -o structured)')
    .option('--schema <json>', 'Inline JSON schema string (required with -o structured)')
    .option('-c, --clipboard', 'Read query from clipboard')
    .option('-f, --file <path>', 'Read query from a file')
    .action(runSearch);
}
