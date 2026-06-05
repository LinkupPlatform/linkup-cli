import type { Command } from 'commander';
import { getConfigPath, saveApiKey } from '../config.js';
import { verifyApiKey } from '../credits.js';
import { exitWithCode, exitWithError, formatError } from '../output/errors.js';

const SETUP_URL = 'https://app.linkup.so';

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

  apiKey = apiKey.trim();

  console.log('\nStep 2: Verify API key');
  const verification = await verifyApiKey(apiKey);
  if (!verification.ok && verification.reason === 'invalid') {
    exitWithError('Error: Invalid API key. Get a valid key at https://app.linkup.so');
  }
  if (verification.ok) {
    console.log(`Verified: ${verification.balance} credits available`);
  }

  console.log('\nStep 3: Save configuration');
  try {
    saveApiKey(apiKey);
    console.log(`API key saved to ${getConfigPath()}`);
  } catch (error) {
    exitWithError(`Error: Saving config failed: ${formatError(error)}`);
  }

  if (!verification.ok && verification.reason === 'network') {
    console.error(`Warning: API key verification failed: ${verification.message}`);
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
