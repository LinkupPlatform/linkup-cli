import { LinkupClient } from 'linkup-sdk';
import { resolveConfig, validateApiKey } from './config';
import { exitWithError } from './output/errors';

export function getClient(apiKeyOverride?: string): LinkupClient {
  const normalizedOverride = apiKeyOverride?.trim();
  if (normalizedOverride) {
    const validationError = validateApiKey(normalizedOverride);
    if (validationError) {
      exitWithError(`Error: ${validationError}`);
    }
    return new LinkupClient({ apiKey: normalizedOverride });
  }

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
