import { validateSetupKey } from '../commands/setup';

describe('validateSetupKey', () => {
  it('rejects an empty key', () => {
    expect(validateSetupKey('')).toBe('Error: Invalid API key');
  });

  it('rejects keys shorter than 10 characters', () => {
    expect(validateSetupKey('short')).toBe('Error: Invalid API key');
    expect(validateSetupKey('123456789')).toBe('Error: Invalid API key');
  });

  it('accepts keys of 10 characters or more', () => {
    expect(validateSetupKey('1234567890')).toBeNull();
    expect(validateSetupKey('a-real-looking-api-key')).toBeNull();
  });
});
