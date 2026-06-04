import { readFileSync } from 'node:fs';
import { readStdin } from '../utils';
import { type ClipboardResult, readClipboard } from './clipboard';

export type QueryInput = {
  clipboard?: boolean;
  file?: string;
  args: string[];
};

export type ResolvedQuery = {
  query: string;
  notices: string[];
  cancelled?: boolean;
};

export type InteractiveResult = { cancelled: boolean; text: string };

// Injectable readers so the resolver stays unit-testable without real I/O.
export type QueryReaders = {
  clipboard: () => ClipboardResult;
  stdin: () => Promise<string>;
  interactive: () => Promise<InteractiveResult>;
};

async function readInteractive(): Promise<InteractiveResult> {
  try {
    const { input } = await import('@inquirer/prompts');
    const text = await input({ message: 'Enter your query:' });
    return { cancelled: false, text };
  } catch (error) {
    if (error instanceof Error && ['AbortPromptError', 'ExitPromptError'].includes(error.name)) {
      return { cancelled: true, text: '' };
    }
    throw error;
  }
}

export const defaultReaders: QueryReaders = {
  clipboard: readClipboard,
  interactive: readInteractive,
  stdin: readStdin,
};

function assertSingleQuerySource(input: QueryInput): void {
  const sources = [
    input.clipboard ? '--clipboard' : null,
    input.file ? '--file' : null,
    input.args.length > 0 ? 'positional query' : null,
  ].filter((source): source is string => source !== null);

  if (sources.length > 1) {
    throw new Error(`Multiple query sources provided: ${sources.join(', ')}. Use only one.`);
  }
}

// Resolve the search query from one source:
// clipboard, file, positional args, piped stdin, or interactive prompt.
//
// Throws on hard failures (clipboard tool missing/empty, unreadable file).
// Returns an empty `query` when nothing resolved (caller prints usage), or
// `cancelled: true` when the interactive prompt was aborted with Ctrl+C.
export async function resolveQuery(
  input: QueryInput,
  readers: QueryReaders = defaultReaders,
  isStdinTTY: boolean = Boolean(process.stdin.isTTY),
): Promise<ResolvedQuery> {
  const notices: string[] = [];
  assertSingleQuerySource(input);

  if (input.clipboard) {
    const result = readers.clipboard();
    if ('error' in result) {
      throw new Error(result.error);
    }
    if (!result.text) {
      throw new Error('Clipboard is empty');
    }
    notices.push(`Read ${result.text.length} characters from clipboard`);
    return { notices, query: result.text };
  }

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

  const interactive = await readers.interactive();
  if (interactive.cancelled) {
    return { cancelled: true, notices, query: '' };
  }
  return { notices, query: interactive.text.trim() };
}
