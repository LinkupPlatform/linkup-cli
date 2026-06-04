import {
  addSchemaIgnoredWarning,
  buildCommonParams,
  resolveStructuredOutputType,
} from '../commands/shared-params';

describe('buildCommonParams', () => {
  it('maps shared filters and dates when provided', () => {
    const fromDate = new Date('2025-01-01');
    const toDate = new Date('2025-01-31');

    expect(
      buildCommonParams({
        excludeDomains: ['example.com'],
        fromDate,
        includeDomains: ['linkup.so'],
        toDate,
      }),
    ).toEqual({
      excludeDomains: ['example.com'],
      fromDate,
      includeDomains: ['linkup.so'],
      toDate,
    });
  });

  it('throws when from-date is after to-date', () => {
    expect(() =>
      buildCommonParams({
        fromDate: new Date('2025-02-01'),
        toDate: new Date('2025-01-01'),
      }),
    ).toThrow('--from-date must be before or equal to --to-date');
  });
});

describe('resolveStructuredOutputType', () => {
  it.each([
    {
      expected: 'sourcedAnswer',
      input: { outputType: 'sourcedAnswer' as const },
      name: 'keeps sourcedAnswer without schema',
    },
    {
      expected: 'structured',
      input: {
        outputType: 'sourcedAnswer' as const,
        schema: '{"type":"object"}',
      },
      name: 'infers structured when schema is set on default sourcedAnswer',
    },
    {
      expected: 'sourcedAnswer',
      input: {
        outputType: 'sourcedAnswer' as const,
        outputTypeExplicit: true,
        schema: '{"type":"object"}',
      },
      name: 'keeps explicit sourcedAnswer even when schema is set',
    },
    {
      expected: 'structured',
      input: {
        outputType: 'structured' as const,
        schema: '{"type":"object"}',
      },
      name: 'keeps structured output when schema is set',
    },
  ])('$name', ({ input, expected }) => {
    expect(resolveStructuredOutputType(input)).toBe(expected);
  });

  it('rejects schema with a disallowed output type', () => {
    expect(() =>
      resolveStructuredOutputType(
        {
          outputType: 'searchResults',
          schema: '{"type":"object"}',
        },
        {
          disallowedSchemaOutputType: 'searchResults',
          disallowedSchemaOutputTypeMessage:
            '--schema/--schema-file cannot be used with --output search-results',
        },
      ),
    ).toThrow('--schema/--schema-file cannot be used with --output search-results');
  });
});

describe('addSchemaIgnoredWarning', () => {
  it.each([
    { expected: [], hasSchemaOption: false, outputType: 'sourcedAnswer' },
    { expected: [], hasSchemaOption: true, outputType: 'structured' },
    {
      expected: ['Warning: --schema/--schema-file ignored (only used with --output structured)'],
      hasSchemaOption: true,
      outputType: 'sourcedAnswer',
    },
  ])('handles outputType=$outputType hasSchemaOption=$hasSchemaOption', testCase => {
    const warnings: string[] = [];
    addSchemaIgnoredWarning(testCase.outputType, testCase.hasSchemaOption, warnings);
    expect(warnings).toEqual(testCase.expected);
  });
});
