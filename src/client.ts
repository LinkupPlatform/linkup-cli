import type { Command } from 'commander';
import { LinkupClient } from 'linkup-sdk';
import { resolveConfig } from './config';
import { exitWithError } from './output/errors';

export type GlobalOptions = {
  json?: boolean;
};

export type ResolvedGlobals = {
  client: LinkupClient;
  json: boolean;
};

export function getClient(): LinkupClient {
  const { apiKey } = resolveConfig();
  if (!apiKey) {
    exitWithError([
      'Error: Linkup API key not configured',
      "\nRun 'linkup setup' to configure your API key",
      'Or set the LINKUP_API_KEY environment variable',
    ]);
  }

  return new LinkupClient({ apiKey });
}

export function resolveGlobals(command: Command): ResolvedGlobals {
  const globalOptions = command.optsWithGlobals<GlobalOptions>();
  return {
    client: getClient(),
    json: Boolean(globalOptions.json),
  };
}
