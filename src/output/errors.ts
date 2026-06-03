export function exitWithCode(code: number): never {
  process.exit(code);
}

export function formatError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/^Error:\s*/, '');
}

export function formatErrorLine(error: unknown): string {
  return `Error: ${formatError(error)}`;
}

export function exitWithError(lines: string | string[], code = 1): never {
  for (const line of Array.isArray(lines) ? lines : [lines]) {
    console.error(line);
  }
  exitWithCode(code);
}
