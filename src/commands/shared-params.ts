import type { Command } from 'commander';
import { parseSchemaJson, readSchemaRaw, type SchemaInput } from '../input/schema.js';

const SCHEMA_IGNORED_WARNING =
  'Warning: --schema/--schema-file ignored (only used with --output structured)';
export const STRUCTURED_REQUIRES_SCHEMA = '--output structured requires --schema-file or --schema';

type CommonCliOptions = {
  includeDomains?: string[];
  excludeDomains?: string[];
  fromDate?: Date;
  toDate?: Date;
};

type PaginationSortCliOptions<
  TSortBy extends string = string,
  TSortDirection extends string = string,
> = {
  page?: number;
  pageSize?: number;
  sortBy?: TSortBy;
  sortDirection?: TSortDirection;
};

type SchemaOutputCliOptions<TOutputType extends string> = SchemaInput & {
  outputType: TOutputType;
  outputTypeExplicit?: boolean;
};

function assertDateRange(fromDate?: Date, toDate?: Date): void {
  if (fromDate && toDate && fromDate > toDate) {
    throw new Error('--from-date must be before or equal to --to-date');
  }
}

export function buildCommonParams(opts: CommonCliOptions): CommonCliOptions {
  assertDateRange(opts.fromDate, opts.toDate);

  return {
    ...(opts.excludeDomains?.length && { excludeDomains: opts.excludeDomains }),
    ...(opts.fromDate && { fromDate: opts.fromDate }),
    ...(opts.includeDomains?.length && { includeDomains: opts.includeDomains }),
    ...(opts.toDate && { toDate: opts.toDate }),
  };
}

export function buildPaginationSortParams<TSortBy extends string, TSortDirection extends string>(
  opts: PaginationSortCliOptions<TSortBy, TSortDirection>,
): PaginationSortCliOptions<TSortBy, TSortDirection> {
  return {
    ...(opts.page !== undefined && { page: opts.page }),
    ...(opts.pageSize !== undefined && { pageSize: opts.pageSize }),
    ...(opts.sortBy && { sortBy: opts.sortBy }),
    ...(opts.sortDirection && { sortDirection: opts.sortDirection }),
  };
}

export function hasStructuredSchemaOption(opts: SchemaInput): boolean {
  return Boolean(opts.schemaFile || opts.schema);
}

export function resolveStructuredOutputType<TOutputType extends string>(
  opts: SchemaOutputCliOptions<TOutputType>,
  options: {
    disallowedSchemaOutputType?: TOutputType;
    disallowedSchemaOutputTypeMessage?: string;
  } = {},
): TOutputType | 'structured' {
  const hasSchemaOption = hasStructuredSchemaOption(opts);
  if (!hasSchemaOption) {
    return opts.outputType;
  }

  if (
    options.disallowedSchemaOutputType &&
    opts.outputType === options.disallowedSchemaOutputType
  ) {
    throw new Error(options.disallowedSchemaOutputTypeMessage);
  }

  if (opts.outputType === 'sourcedAnswer' && !opts.outputTypeExplicit) {
    return 'structured';
  }

  return opts.outputType;
}

export function addSchemaIgnoredWarning(
  outputType: string,
  hasSchemaOption: boolean,
  warnings: string[],
): void {
  if (outputType !== 'structured' && hasSchemaOption) {
    warnings.push(SCHEMA_IGNORED_WARNING);
  }
}

export function loadStructuredSchema(opts: SchemaInput): Record<string, unknown> {
  return parseSchemaJson(readSchemaRaw(opts));
}

export function isOptionExplicit(command: Command, name: string): boolean {
  return command.getOptionValueSource(name) !== 'default';
}
