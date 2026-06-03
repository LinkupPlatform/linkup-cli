/** Print a user-facing error message and exit with code 1. */
export function reportErrorAndExit(error: unknown): never {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
