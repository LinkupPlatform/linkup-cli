import { readFileSync } from 'node:fs';
import { readStdin } from '../utils';

export type QueryInput = {
  file?: string;
  args: string[];
};

export type ResolvedQuery = {
  query: string;
  notices: string[];
};

// Injectable readers so the resolver stays unit-testable without real I/O.
export type QueryReaders = {
  stdin: () => Promise<string>;
};

export const defaultReaders: QueryReaders = {
  stdin: readStdin,
};

function assertSingleQuerySource(input: QueryInput): void {
  const sources = [
    input.file ? '--file' : null,
    input.args.length > 0 ? 'positional query' : null,
  ].filter((source): source is string => source !== null);

  if (sources.length > 1) {
    throw new Error(`Multiple query sources provided: ${sources.join(', ')}. Use only one.`);
  }
}

// Resolve the search query from one source:
// file, positional args, or piped stdin.
//
// Throws on hard failures (unreadable file).
// Returns an empty `query` when nothing resolved (caller prints usage).
export async function resolveQuery(
  input: QueryInput,
  readers: QueryReaders = defaultReaders,
  isStdinTTY: boolean = Boolean(process.stdin.isTTY),
): Promise<ResolvedQuery> {
  const notices: string[] = [];
  assertSingleQuerySource(input);

  if (input.file) {
    let content: string;
    try {
      content = readFileSync(input.file, 'utf8');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Could not read query file: ${message}`);
    }
    notices.push(`Read query from ${input.file}`);
    return { notices, query: content.trim() };
  }

  if (input.args.length > 0) {
    return { notices, query: input.args.join(' ').trim() };
  }

  if (!isStdinTTY) {
    const stdin = await readers.stdin();
    return { notices, query: stdin.trim() };
  }

  return { notices, query: '' };
}
