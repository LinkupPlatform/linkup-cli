import { buildFetchParams, buildFetchTaskRequest } from '../commands/fetch';

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
        includeRawHtml: true,
        renderJs: true,
      }),
    ).toEqual({
      extractImages: true,
      includeRawHtml: true,
      renderJs: true,
      url: 'https://example.com',
    });
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
