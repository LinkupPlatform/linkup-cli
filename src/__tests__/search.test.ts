import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSearchParams, buildSearchTaskRequest } from '../commands/search';

describe('buildSearchParams', () => {
  it('maps sourcedAnswer flags to SDK field names', () => {
    const { params, warnings } = buildSearchParams('hello world', {
      depth: 'deep',
      outputType: 'sourcedAnswer',
    });

    expect(params).toEqual({
      depth: 'deep',
      outputType: 'sourcedAnswer',
      query: 'hello world',
    });
    expect(warnings).toEqual([]);
  });

  it('maps searchResults flags to SDK field names', () => {
    const { params } = buildSearchParams('q', {
      depth: 'fast',
      outputType: 'searchResults',
    });

    expect(params).toEqual({
      depth: 'fast',
      outputType: 'searchResults',
      query: 'q',
    });
  });

  it('maps search filtering, date, image, and limit options to SDK fields', () => {
    const fromDate = new Date('2025-01-01');
    const toDate = new Date('2025-01-31');

    const { params, warnings } = buildSearchParams('q', {
      depth: 'deep',
      excludeDomains: ['example.com'],
      fromDate,
      includeDomains: ['linkup.so', 'docs.linkup.so'],
      includeImages: true,
      maxResults: 10,
      outputType: 'searchResults',
      toDate,
    });

    expect(params).toEqual({
      depth: 'deep',
      excludeDomains: ['example.com'],
      fromDate,
      includeDomains: ['linkup.so', 'docs.linkup.so'],
      includeImages: true,
      maxResults: 10,
      outputType: 'searchResults',
      query: 'q',
      toDate,
    });
    expect(warnings).toEqual([]);
  });

  it('maps structured output with inline schema to structuredOutputSchema', () => {
    const { params } = buildSearchParams('q', {
      depth: 'standard',
      outputType: 'structured',
      schema: '{"type":"object","properties":{"name":{"type":"string"}}}',
    });

    expect(params).toEqual({
      depth: 'standard',
      outputType: 'structured',
      query: 'q',
      structuredOutputSchema: {
        properties: { name: { type: 'string' } },
        type: 'object',
      },
    });
  });

  it('reads structuredOutputSchema from --schema-file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'linkup-schema-test-'));
    const schemaPath = join(dir, 'schema.json');
    writeFileSync(schemaPath, '{"type":"object"}');

    const { params } = buildSearchParams('q', {
      depth: 'standard',
      outputType: 'structured',
      schemaFile: schemaPath,
    });

    expect(params).toMatchObject({
      outputType: 'structured',
      structuredOutputSchema: { type: 'object' },
    });
  });

  it('requires schema when outputType is structured', () => {
    expect(() =>
      buildSearchParams('q', {
        depth: 'standard',
        outputType: 'structured',
      }),
    ).toThrow('--output structured requires --schema-file or --schema');
  });

  it('rejects invalid JSON schema', () => {
    expect(() =>
      buildSearchParams('q', {
        depth: 'standard',
        outputType: 'structured',
        schema: '{not json',
      }),
    ).toThrow('Schema is not valid JSON');
  });

  it('rejects JSON that is not an object', () => {
    expect(() =>
      buildSearchParams('q', {
        depth: 'standard',
        outputType: 'structured',
        schema: '[]',
      }),
    ).toThrow('Schema must be a JSON object');
  });

  it('rejects date ranges where fromDate is after toDate', () => {
    expect(() =>
      buildSearchParams('q', {
        depth: 'standard',
        fromDate: new Date('2025-02-01'),
        outputType: 'sourcedAnswer',
        toDate: new Date('2025-01-01'),
      }),
    ).toThrow('--from-date must be before or equal to --to-date');
  });

  it('infers structured output when schema is provided with the default output', () => {
    const { params, warnings } = buildSearchParams('q', {
      depth: 'standard',
      outputType: 'sourcedAnswer',
      schema: '{"type":"object"}',
    });

    expect(params).toEqual({
      depth: 'standard',
      outputType: 'structured',
      query: 'q',
      structuredOutputSchema: { type: 'object' },
    });
    expect(warnings).toEqual([]);
  });

  it('warns when schema is provided with an explicit sourced-answer output', () => {
    const { params, warnings } = buildSearchParams('q', {
      depth: 'standard',
      outputType: 'sourcedAnswer',
      outputTypeExplicit: true,
      schema: '{"type":"object"}',
    });

    expect(params).toEqual({
      depth: 'standard',
      outputType: 'sourcedAnswer',
      query: 'q',
    });
    expect(warnings).toContain(
      'Warning: --schema/--schema-file ignored (only used with --output structured)',
    );
  });

  it('rejects schema with search-results output', () => {
    expect(() =>
      buildSearchParams('q', {
        depth: 'standard',
        outputType: 'searchResults',
        schema: '{"type":"object"}',
      }),
    ).toThrow('--schema/--schema-file cannot be used with --output search-results');
  });

  it('warns and omits search-result-only options for sourced answers', () => {
    const { params, warnings } = buildSearchParams('q', {
      depth: 'standard',
      includeImages: true,
      maxResults: 5,
      outputType: 'sourcedAnswer',
    });

    expect(params).toEqual({
      depth: 'standard',
      outputType: 'sourcedAnswer',
      query: 'q',
    });
    expect(warnings).toEqual([
      'Warning: --include-images ignored (only used with --output search-results)',
      'Warning: --max-results ignored (only used with --output search-results)',
    ]);
  });
});

describe('buildSearchTaskRequest', () => {
  it('wraps search params as a generic task request', () => {
    const { params } = buildSearchParams('hello world', {
      depth: 'deep',
      outputType: 'sourcedAnswer',
    });

    expect(buildSearchTaskRequest(params)).toEqual({
      input: params,
      type: 'search',
    });
  });
});
