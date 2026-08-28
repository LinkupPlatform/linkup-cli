import { formatFetch } from '../output/fetch.js';

describe('formatFetch', () => {
  it('wraps the extracted markdown in blank lines', () => {
    const lines = formatFetch({ markdown: '# Title\n\nSome content' });

    expect(lines).toEqual(['', '# Title\n\nSome content', '']);
  });

  it('trims surrounding whitespace from the markdown', () => {
    const lines = formatFetch({ markdown: '\n\n  Hello  \n\n' });

    expect(lines).toEqual(['', 'Hello', '']);
  });

  it('renders structured data when present', () => {
    const lines = formatFetch({
      data: { author: { name: 'Ada' }, title: 'Example' },
      markdown: 'Hello',
    });

    expect(lines).toEqual([
      '',
      'Hello',
      '',
      'Data:',
      '{\n  "author": {\n    "name": "Ada"\n  },\n  "title": "Example"\n}',
      '',
    ]);
  });

  it('renders raw HTML when present', () => {
    const lines = formatFetch({
      markdown: 'Hello',
      rawHtml: '\n<html><body>Hello</body></html>\n',
    });

    expect(lines).toEqual(['', 'Hello', '', 'Raw HTML:', '<html><body>Hello</body></html>', '']);
  });

  it('renders raw content when present', () => {
    const lines = formatFetch({
      markdown: 'Hello',
      rawContent: '\nOriginal page content\n',
    });

    expect(lines).toEqual(['', 'Hello', '', 'Raw Content:', 'Original page content', '']);
  });

  it('renders extracted images when present', () => {
    const lines = formatFetch({
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
      'Images:',
      '  • Logo',
      '    https://example.com/logo.png',
      '  • (no alt text)',
      '    https://example.com/no-alt.png',
      '',
    ]);
  });
});
