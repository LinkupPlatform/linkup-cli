import {
  defaultReaders,
  type QueryInput,
  type QueryReaders,
  type ResolvedQuery,
  resolveQuery,
} from '../input/query';
import { exitWithError, formatErrorLine } from '../output/errors';

export function queryUsageLines(
  commandName: string,
  queryPlaceholder: string,
  extraExamples: string[] = [],
): string[] {
  return [
    'Error: No query provided',
    'Usage:',
    `  linkup ${commandName} "${queryPlaceholder}"`,
    ...extraExamples.map(example => `  ${example}`),
    `  linkup ${commandName} --clipboard        # read from clipboard`,
    `  linkup ${commandName} --file query.txt   # read from file`,
    `  linkup ${commandName}                    # interactive mode`,
  ];
}

/**
 * Resolve a query from any supported source and exit with usage/errors when it
 * cannot be resolved. Shared by the search and research commands so the
 * resolve/cancel/empty/notice contract stays in one place.
 */
export async function resolveQueryOrExit(
  input: QueryInput,
  usageLines: string[],
  readers: QueryReaders = defaultReaders,
  isStdinTTY?: boolean,
): Promise<string> {
  let resolved: ResolvedQuery;
  try {
    resolved = await resolveQuery(input, readers, isStdinTTY);
  } catch (error) {
    exitWithError(formatErrorLine(error));
  }

  if (resolved.cancelled) {
    exitWithError('Cancelled', 0);
  }
  if (!resolved.query) {
    exitWithError(usageLines);
  }

  for (const notice of resolved.notices) {
    console.error(notice);
  }

  return resolved.query;
}
