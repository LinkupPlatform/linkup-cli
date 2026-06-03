export const KNOWN_COMMANDS = new Set([
  'search',
  's',
  'fetch',
  'f',
  'setup',
  'config',
  'c',
  'logout',
  'help',
]);

/** When the user runs `linkup "some query"` without a subcommand, insert `search`. */
export function applyImplicitSearch(argv: readonly string[]): string[] {
  const result = [...argv];
  const firstArg = result[2];
  if (firstArg && !firstArg.startsWith('-') && !KNOWN_COMMANDS.has(firstArg)) {
    result.splice(2, 0, 'search');
  }
  return result;
}
