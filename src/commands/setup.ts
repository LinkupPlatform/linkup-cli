import type { Command } from 'commander';
import { LinkupClient } from 'linkup-sdk';
import { getConfigPath, saveApiKey, validateApiKey } from '../config';
import { exitWithCode, exitWithError, formatError, formatErrorLine } from '../output/errors';

const SETUP_URL = 'https://app.linkup.so';

/** Validate the pasted key. Returns an error message, or null when the key is acceptable. */
export function validateSetupKey(apiKey: string): string | null {
  const validationError = validateApiKey(apiKey);
  return validationError;
}

async function runSetup(): Promise<void> {
  console.log("Welcome to Linkup CLI! Let's get you set up.\n");

  console.log('Step 1: Get your API key');
  console.log(`Opening ${SETUP_URL} in your browser...`);
  try {
    const open = (await import('open')).default;
    await open(SETUP_URL);
  } catch {
    // Best-effort: the user can still open the URL manually.
  }
  console.log("(If it didn't open, visit the URL above)\n");

  let apiKey: string;
  try {
    const { password } = await import('@inquirer/prompts');
    apiKey = await password({ message: 'Paste your API key:' });
  } catch {
    // Inquirer throws on Ctrl+C / EOF; treat as a user cancel.
    console.log('\nSetup cancelled.');
    exitWithCode(0);
  }

  const validationError = validateSetupKey(apiKey);
  if (validationError) {
    exitWithError(`Error: ${validationError}`);
  }

  console.log('\nStep 2: Save configuration');
  try {
    saveApiKey(apiKey);
    console.log(`API key saved to ${getConfigPath()}`);
  } catch (error) {
    exitWithError(formatErrorLine(`Saving config failed: ${formatError(error)}`));
  }

  console.log('\nStep 3: Test connection');
  try {
    const client = new LinkupClient({ apiKey });
    await client.search({ depth: 'fast', outputType: 'searchResults', query: 'test' });
    console.log('Connected to Linkup API');
  } catch (error) {
    console.error(`Warning: connection test failed: ${formatError(error)}`);
    console.error('Your API key was saved. You can test it with \'linkup search "hello"\'');
  }

  console.log("\nYou're all set!");
  console.log('Try it out:');
  console.log('  linkup search "What is the capital of France?"');
}

export function registerSetupCommand(program: Command): void {
  program
    .command('setup')
    .description('Interactive setup — configure your API key')
    .action(runSetup);
}
