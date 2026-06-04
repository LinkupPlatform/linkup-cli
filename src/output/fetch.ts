import type { FetchImage, LinkupFetchResponse } from 'linkup-sdk';

type FetchOutputResponse = LinkupFetchResponse & {
  rawHtml?: string;
  images?: FetchImage[];
};

// Render a fetch response as printable lines.
export function formatFetch(response: FetchOutputResponse): string[] {
  const lines = ['', response.markdown.trim(), ''];

  if (response.rawHtml) {
    lines.push('Raw HTML:', response.rawHtml.trim(), '');
  }

  if (response.images?.length) {
    lines.push('Images:');
    for (const image of response.images) {
      lines.push(`  • ${image.alt || '(no alt text)'}`, `    ${image.url}`);
    }
    lines.push('');
  }

  return lines;
}
