import { InvalidArgumentError } from 'commander';
import { parseDateOption, parseDomainList, parsePositiveInt } from '../commands/option-parsers';

describe('parsePositiveInt', () => {
  it.each([
    { expected: 1, input: '1' },
    { expected: 42, input: '42' },
    { expected: 1, input: '001' },
  ])('parses $input as $expected', ({ input, expected }) => {
    expect(parsePositiveInt(input)).toBe(expected);
  });

  it.each(['0', '-1', '1.5', 'abc', ''])('rejects %s as not a positive integer', input => {
    expect(() => parsePositiveInt(input)).toThrow(InvalidArgumentError);
    expect(() => parsePositiveInt(input)).toThrow('must be a positive integer');
  });
});

describe('parseDomainList', () => {
  it.each([
    { expected: ['linkup.so'], input: 'linkup.so' },
    { expected: ['a.com', 'b.com'], input: 'a.com,b.com' },
    { expected: ['a.com', 'b.com'], input: ' a.com , b.com ' },
  ])('parses domains from "$input"', ({ input, expected }) => {
    expect(parseDomainList(input)).toEqual(expected);
  });

  it('appends parsed domains after previously provided values', () => {
    expect(parseDomainList('new.com,other.com', ['existing.com'])).toEqual([
      'existing.com',
      'new.com',
      'other.com',
    ]);
  });

  it.each(['', ' , '])('rejects empty domain list input "%s"', input => {
    expect(() => parseDomainList(input)).toThrow(InvalidArgumentError);
    expect(() => parseDomainList(input)).toThrow('must include at least one domain');
  });
});

describe('parseDateOption', () => {
  const parseFromDate = parseDateOption('--from-date');

  it.each([
    '2025-01-01',
    '2025-01-01T00:00:00Z',
  ])('parses valid date "%s" to a Date instance', input => {
    const parsed = parseFromDate(input);
    expect(parsed).toBeInstanceOf(Date);
    expect(Number.isNaN(parsed.getTime())).toBe(false);
  });

  it.each(['not-a-date', ''])('rejects invalid date "%s"', input => {
    expect(() => parseFromDate(input)).toThrow(InvalidArgumentError);
    expect(() => parseFromDate(input)).toThrow('--from-date must be a valid date');
  });
});
