import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildListResearchParams, buildResearchParams } from '../commands/research';

describe('buildResearchParams', () => {
  it('maps a sourced-answer query to SDK fields', () => {
    const { params, warnings } = buildResearchParams('hello world', {
      outputType: 'sourcedAnswer',
      reasoningDepth: 'L',
    });

    expect(params).toEqual({
      outputType: 'sourcedAnswer',
      query: 'hello world',
      reasoningDepth: 'L',
    });
    expect(warnings).toEqual([]);
  });

  it('passes mode and reasoningDepth through', () => {
    const { params } = buildResearchParams('q', {
      mode: 'investigate',
      outputType: 'sourcedAnswer',
      reasoningDepth: 'L',
    });

    expect(params).toEqual({
      mode: 'investigate',
      outputType: 'sourcedAnswer',
      query: 'q',
      reasoningDepth: 'L',
    });
  });

  it('maps filtering and date options to SDK fields', () => {
    const fromDate = new Date('2025-01-01');
    const toDate = new Date('2025-01-31');

    const { params } = buildResearchParams('q', {
      excludeDomains: ['example.com'],
      fromDate,
      includeDomains: ['linkup.so'],
      outputType: 'sourcedAnswer',
      reasoningDepth: 'L',
      toDate,
    });

    expect(params).toEqual({
      excludeDomains: ['example.com'],
      fromDate,
      includeDomains: ['linkup.so'],
      outputType: 'sourcedAnswer',
      query: 'q',
      reasoningDepth: 'L',
      toDate,
    });
  });

  it('maps structured output with inline schema', () => {
    const { params } = buildResearchParams('q', {
      outputType: 'structured',
      reasoningDepth: 'L',
      schema: '{"type":"object","properties":{"summary":{"type":"string"}}}',
    });

    expect(params).toEqual({
      outputType: 'structured',
      query: 'q',
      reasoningDepth: 'L',
      structuredOutputSchema: {
        properties: { summary: { type: 'string' } },
        type: 'object',
      },
    });
  });

  it('reads structuredOutputSchema from --schema-file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'linkup-research-schema-'));
    const schemaPath = join(dir, 'schema.json');
    writeFileSync(schemaPath, '{"type":"object"}');

    const { params } = buildResearchParams('q', {
      outputType: 'structured',
      reasoningDepth: 'L',
      schemaFile: schemaPath,
    });

    expect(params).toMatchObject({
      outputType: 'structured',
      structuredOutputSchema: { type: 'object' },
    });
  });

  it('requires a schema when outputType is structured', () => {
    expect(() => buildResearchParams('q', { outputType: 'structured' })).toThrow(
      '--output structured requires --schema-file or --schema',
    );
  });
});

describe('buildListResearchParams', () => {
  it('omits undefined fields', () => {
    expect(buildListResearchParams({})).toEqual({});
  });

  it('maps pagination and sort options', () => {
    expect(
      buildListResearchParams({
        page: 2,
        pageSize: 25,
        sortBy: 'updatedAt',
        sortDirection: 'asc',
      }),
    ).toEqual({ page: 2, pageSize: 25, sortBy: 'updatedAt', sortDirection: 'asc' });
  });
});
