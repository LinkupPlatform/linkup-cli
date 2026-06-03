import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSearchParams } from '../commands/search';

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
    ).toThrow('schema is not valid JSON');
  });

  it('rejects JSON that is not an object', () => {
    expect(() =>
      buildSearchParams('q', {
        depth: 'standard',
        outputType: 'structured',
        schema: '[]',
      }),
    ).toThrow('schema must be a JSON object');
  });

  it('warns when schema is provided without structured output', () => {
    const { params, warnings } = buildSearchParams('q', {
      depth: 'standard',
      outputType: 'sourcedAnswer',
      schema: '{"type":"object"}',
    });

    expect(params).toEqual({
      depth: 'standard',
      outputType: 'sourcedAnswer',
      query: 'q',
    });
    expect(warnings).toContain(
      'Warning: --schema/--schema-file ignored (only used with -o structured)',
    );
  });
});
