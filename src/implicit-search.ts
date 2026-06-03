import type { Command } from 'commander';

const BOOLEAN_GLOBAL_FLAGS = new Set(['-j', '--json']);

export function collectKnownCommands(program: Command): Set<string> {
  const commands = new Set(['help']);
  for (const command of program.commands) {
    commands.add(command.name());
    for (const alias of command.aliases()) {
      commands.add(alias);
    }
  }
  return commands;
}

function findImplicitSearchInsertIndex(argv: readonly string[]): number | null {
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];

    if (BOOLEAN_GLOBAL_FLAGS.has(arg)) {
      continue;
    }

    return index;
  }

  return null;
}

/** When the user runs `linkup "some query"` without a subcommand, insert `search`. */
export function applyImplicitSearch(
  argv: readonly string[],
  knownCommands: ReadonlySet<string>,
): string[] {
  const result = [...argv];
  const insertIndex = findImplicitSearchInsertIndex(result);
  const firstQueryArg = insertIndex === null ? undefined : result[insertIndex];

  if (
    insertIndex !== null &&
    firstQueryArg &&
    !firstQueryArg.startsWith('-') &&
    !knownCommands.has(firstQueryArg)
  ) {
    result.splice(insertIndex, 0, 'search');
  }
  return result;
}
