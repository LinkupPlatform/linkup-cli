import type { Command } from 'commander';
import { clearApiKey, resolveConfig } from '../config';
import { exitWithError, formatErrorLine } from '../output/errors';

function runLogout(): void {
  const resolved = resolveConfig();

  try {
    const removed = clearApiKey(resolved.configPath);
    if (removed) {
      console.log(`Removed API key from ${resolved.configPath}`);
    } else {
      console.log(`No saved API key found at ${resolved.configPath}`);
    }
  } catch (error) {
    exitWithError(formatErrorLine(error));
  }

  if (resolved.source === 'env') {
    console.log('LINKUP_API_KEY is still set in your environment; unset it to fully log out.');
  }
}

export function registerLogoutCommand(program: Command): void {
  program.command('logout').description('Remove the saved API key').action(runLogout);
}
