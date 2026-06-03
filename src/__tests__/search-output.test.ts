import type { SearchResults, SourcedAnswer } from 'linkup-sdk';
import { formatJson } from '../output/json';
import {
  formatSearch,
  formatSearchResults,
  formatSourcedAnswer,
  formatStructured,
} from '../output/search';

describe('formatSourcedAnswer', () => {
  it('renders the answer and lists sources', () => {
    const response: SourcedAnswer = {
      answer: 'The answer.',
      sources: [
        { favicon: 'f', name: 'First', snippet: 's', url: 'https://a.example' },
        { favicon: 'f', name: 'Second', snippet: 's', url: 'https://b.example' },
      ],
    };

    const lines = formatSourcedAnswer(response);

    expect(lines).toEqual([
      '',
      'The answer.',
      '',
      'Sources:',
      '  • First',
      '    https://a.example',
      '  • Second',
      '    https://b.example',
      '',
    ]);
  });

  it('caps the source list at five entries', () => {
    const sources = Array.from({ length: 8 }, (_, i) => ({
      favicon: 'f',
      name: `Source ${i}`,
      snippet: 's',
      url: `https://example/${i}`,
    }));

    const lines = formatSourcedAnswer({ answer: 'a', sources });

    expect(lines.filter(line => line.startsWith('  • '))).toHaveLength(5);
  });

  it('omits the Sources section when there are none', () => {
    const lines = formatSourcedAnswer({ answer: 'a', sources: [] });

    expect(lines).toEqual(['', 'a', '']);
  });
});

describe('formatSearchResults', () => {
  it('numbers results and includes content for text results only', () => {
    const response: SearchResults = {
      results: [
        { content: 'Body', favicon: 'f', name: 'Doc', type: 'text', url: 'https://doc.example' },
        { name: 'Pic', type: 'image', url: 'https://pic.example' },
      ],
    };

    const lines = formatSearchResults(response);

    expect(lines).toContain('1. Doc');
    expect(lines).toContain('   https://doc.example');
    expect(lines).toContain('   Body');
    expect(lines).toContain('2. Pic');
    expect(lines).toContain('   https://pic.example');
  });
});

describe('formatStructured', () => {
  it('pretty-prints the structured payload as JSON', () => {
    const lines = formatStructured({ name: 'value', nested: { ok: true } });

    expect(lines[0]).toBe('');
    expect(lines[1]).toBe(JSON.stringify({ name: 'value', nested: { ok: true } }, null, 2));
    expect(lines[2]).toBe('');
  });
});

describe('formatJson', () => {
  it('pretty-prints raw response JSON', () => {
    expect(formatJson({ answer: 'ok', sources: [] })).toEqual([
      JSON.stringify({ answer: 'ok', sources: [] }, null, 2),
    ]);
  });
});

describe('formatSearch', () => {
  it('dispatches by output type', () => {
    expect(formatSearch('structured', { a: 1 })).toEqual(['', '{\n  "a": 1\n}', '']);
    expect(formatSearch('searchResults', { results: [] })).toEqual(['']);
    expect(formatSearch('sourcedAnswer', { answer: 'x', sources: [] })).toEqual(['', 'x', '']);
  });

  it('throws a clear error for invalid sourcedAnswer responses', () => {
    expect(() => formatSearch('sourcedAnswer', { sources: [] })).toThrow(
      'sourcedAnswer response was not in the expected format',
    );
  });

  it('throws a clear error for invalid searchResults responses', () => {
    expect(() => formatSearch('searchResults', { results: [{ name: 'Missing URL' }] })).toThrow(
      'searchResults items were not in the expected format',
    );
  });
});
