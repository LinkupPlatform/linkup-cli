import type { Command } from 'commander';
import { parseSchemaJson, readSchemaRaw, type SchemaInput } from '../input/schema';

export const SCHEMA_IGNORED_WARNING =
  'Warning: --schema/--schema-file ignored (only used with --output structured)';
export const STRUCTURED_REQUIRES_SCHEMA = '--output structured requires --schema-file or --schema';

export type CommonCliOptions = {
  includeDomains?: string[];
  excludeDomains?: string[];
  fromDate?: Date;
  toDate?: Date;
};

export function assertDateRange(fromDate?: Date, toDate?: Date): void {
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

export function loadStructuredSchema(opts: SchemaInput): Record<string, unknown> {
  return parseSchemaJson(readSchemaRaw(opts));
}

export function isOptionExplicit(command: Command, name: string): boolean {
  return command.getOptionValueSource(name) !== 'default';
}
