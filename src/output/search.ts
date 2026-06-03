import type { SearchResults, SourcedAnswer } from 'linkup-sdk';
import type { SearchOutputType } from '../commands/search';
import { isRecord } from '../utils';

const MAX_SOURCES = 5;

function assertSourcedAnswer(response: unknown): asserts response is SourcedAnswer {
  if (!isRecord(response) || typeof response.answer !== 'string') {
    throw new Error('sourcedAnswer response was not in the expected format');
  }

  if (response.sources === undefined) {
    return;
  }

  if (
    !Array.isArray(response.sources) ||
    response.sources.some(
      source =>
        !isRecord(source) || typeof source.name !== 'string' || typeof source.url !== 'string',
    )
  ) {
    throw new Error('sourcedAnswer sources were not in the expected format');
  }
}

function assertSearchResults(response: unknown): asserts response is SearchResults {
  if (!isRecord(response) || !Array.isArray(response.results)) {
    throw new Error('searchResults response was not in the expected format');
  }

  if (
    response.results.some(
      result =>
        !isRecord(result) || typeof result.name !== 'string' || typeof result.url !== 'string',
    )
  ) {
    throw new Error('searchResults items were not in the expected format');
  }
}

/** Render a `sourcedAnswer` response: the markdown answer, then up to 5 sources. */
export function formatSourcedAnswer(response: SourcedAnswer): string[] {
  const lines: string[] = ['', response.answer.trim(), ''];

  const sources = response.sources ?? [];
  if (sources.length > 0) {
    lines.push('Sources:');
    for (const source of sources.slice(0, MAX_SOURCES)) {
      lines.push(`  • ${source.name}`, `    ${source.url}`);
    }
    lines.push('');
  }

  return lines;
}

/** Render a `searchResults` response as a numbered list (name, url, content). */
export function formatSearchResults(response: SearchResults): string[] {
  const lines: string[] = [];

  response.results.forEach((result, index) => {
    lines.push('', `${index + 1}. ${result.name}`, `   ${result.url}`);
    if (result.type === 'text' && result.content) {
      lines.push(`   ${result.content}`);
    }
  });

  lines.push('');
  return lines;
}

/** Render a `structured` response as pretty-printed JSON. */
export function formatStructured(response: unknown): string[] {
  return ['', JSON.stringify(response, null, 2), ''];
}

/** Dispatch to the renderer matching the requested output type. */
export function formatSearch(outputType: SearchOutputType, response: unknown): string[] {
  if (outputType === 'searchResults') {
    assertSearchResults(response);
    return formatSearchResults(response);
  }
  if (outputType === 'structured') {
    return formatStructured(response);
  }
  assertSourcedAnswer(response);
  return formatSourcedAnswer(response);
}
