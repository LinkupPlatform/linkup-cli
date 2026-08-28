import { buildFetchParams, buildFetchTaskRequest } from '../commands/fetch.js';

describe('buildFetchParams', () => {
  it('maps the URL without optional flags by default', () => {
    expect(buildFetchParams('https://example.com', {})).toEqual({
      url: 'https://example.com',
    });
  });

  it('maps fetch options to SDK field names', () => {
    expect(
      buildFetchParams('https://example.com', {
        extractImages: true,
        includeRawContent: true,
        includeRawHtml: true,
        mode: 'pro',
        renderJs: true,
      }),
    ).toEqual({
      extractImages: true,
      includeRawContent: true,
      includeRawHtml: true,
      mode: 'pro',
      renderJs: true,
      url: 'https://example.com',
    });
  });

  it('maps a schema and instructions for structured extraction', () => {
    expect(
      buildFetchParams('https://example.com', {
        instructions: 'Extract the page title',
        schema: '{"type":"object","properties":{"title":{"type":"string"}}}',
      }),
    ).toEqual({
      instructions: 'Extract the page title',
      schema: {
        properties: {
          title: { type: 'string' },
        },
        type: 'object',
      },
      url: 'https://example.com',
    });
  });

  it('requires a schema when instructions are provided', () => {
    expect(() =>
      buildFetchParams('https://example.com', {
        instructions: 'Extract the page title',
      }),
    ).toThrow('--instructions requires --schema-file or --schema');
  });
});

describe('buildFetchTaskRequest', () => {
  it('wraps fetch params as a generic task request', () => {
    const params = buildFetchParams('https://example.com', { renderJs: true });

    expect(buildFetchTaskRequest(params)).toEqual({
      input: params,
      type: 'fetch',
    });
  });
});
