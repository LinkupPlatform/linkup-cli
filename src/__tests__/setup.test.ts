import { validateApiKey } from '../config';

describe('validateApiKey', () => {
  it('rejects an empty key', () => {
    expect(validateApiKey('')).toBe(
      'Invalid API key: must be at least 10 characters and single-line.',
    );
  });

  it('rejects keys shorter than 10 characters', () => {
    expect(validateApiKey('short')).toBe(
      'Invalid API key: must be at least 10 characters and single-line.',
    );
    expect(validateApiKey('123456789')).toBe(
      'Invalid API key: must be at least 10 characters and single-line.',
    );
  });

  it('rejects keys containing newlines', () => {
    expect(validateApiKey('1234567890\ninjected')).toBe(
      'Invalid API key: must be at least 10 characters and single-line.',
    );
  });

  it('accepts keys of 10 characters or more', () => {
    expect(validateApiKey('1234567890')).toBeNull();
    expect(validateApiKey('a-real-looking-api-key')).toBeNull();
  });
});
