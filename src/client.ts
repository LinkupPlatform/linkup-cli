import { LinkupClient } from 'linkup-sdk';
import { resolveConfig } from './config';

export function getClient(): LinkupClient {
  const { apiKey } = resolveConfig();
  if (!apiKey) {
    console.error('Error: Linkup API key not configured');
    console.error("\nRun 'linkup setup' to configure your API key");
    console.error('Or set the LINKUP_API_KEY environment variable');
    process.exit(1);
  }

  return new LinkupClient({ apiKey });
}
