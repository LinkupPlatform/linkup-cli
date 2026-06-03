import { validateSetupKey } from '../commands/setup';

describe('validateSetupKey', () => {
  it('rejects an empty key', () => {
    expect(validateSetupKey('')).toBe(
      'Invalid API key: must be at least 10 characters and single-line.',
    );
  });

  it('rejects keys shorter than 10 characters', () => {
    expect(validateSetupKey('short')).toBe(
      'Invalid API key: must be at least 10 characters and single-line.',
    );
    expect(validateSetupKey('123456789')).toBe(
      'Invalid API key: must be at least 10 characters and single-line.',
    );
  });

  it('rejects keys containing newlines', () => {
    expect(validateSetupKey('1234567890\ninjected')).toBe(
      'Invalid API key: must be at least 10 characters and single-line.',
    );
  });

  it('accepts keys of 10 characters or more', () => {
    expect(validateSetupKey('1234567890')).toBeNull();
    expect(validateSetupKey('a-real-looking-api-key')).toBeNull();
  });
});
