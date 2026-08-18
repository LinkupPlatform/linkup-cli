import { formatFetch } from '../output/fetch.js';

describe('formatFetch', () => {
  it('wraps the extracted markdown in blank lines', () => {
    const lines = formatFetch({
      favicon: 'https://example.com/favicon.ico',
      markdown: '# Title\n\nSome content',
    });

    expect(lines).toEqual([
      '',
      '# Title\n\nSome content',
      '',
      'Favicon: https://example.com/favicon.ico',
      '',
    ]);
  });

  it('trims surrounding whitespace from the markdown', () => {
    const lines = formatFetch({
      favicon: 'https://example.com/favicon.ico',
      markdown: '\n\n  Hello  \n\n',
    });

    expect(lines).toEqual(['', 'Hello', '', 'Favicon: https://example.com/favicon.ico', '']);
  });

  it('renders raw HTML when present', () => {
    const lines = formatFetch({
      favicon: 'https://example.com/favicon.ico',
      markdown: 'Hello',
      rawHtml: '\n<html><body>Hello</body></html>\n',
    });

    expect(lines).toEqual([
      '',
      'Hello',
      '',
      'Favicon: https://example.com/favicon.ico',
      '',
      'Raw HTML:',
      '<html><body>Hello</body></html>',
      '',
    ]);
  });

  it('renders raw content when present', () => {
    const lines = formatFetch({
      favicon: 'https://example.com/favicon.ico',
      markdown: 'Hello',
      rawContent: '\nOriginal page content\n',
    });

    expect(lines).toEqual([
      '',
      'Hello',
      '',
      'Favicon: https://example.com/favicon.ico',
      '',
      'Raw Content:',
      'Original page content',
      '',
    ]);
  });

  it('renders extracted images when present', () => {
    const lines = formatFetch({
      favicon: 'https://example.com/favicon.ico',
      images: [
        { alt: 'Logo', url: 'https://example.com/logo.png' },
        { alt: '', url: 'https://example.com/no-alt.png' },
      ],
      markdown: 'Hello',
    });

    expect(lines).toEqual([
      '',
      'Hello',
      '',
      'Favicon: https://example.com/favicon.ico',
      '',
      'Images:',
      '  • Logo',
      '    https://example.com/logo.png',
      '  • (no alt text)',
      '    https://example.com/no-alt.png',
      '',
    ]);
  });
});
