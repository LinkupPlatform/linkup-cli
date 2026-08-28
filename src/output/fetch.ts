import type { FetchImage, LinkupFetchResponse } from 'linkup-sdk';

type FetchOutputResponse = Pick<LinkupFetchResponse, 'markdown'> & {
  data?: Record<string, unknown>;
  rawContent?: string;
  rawHtml?: string;
  images?: FetchImage[];
};

// Render a fetch response as printable lines.
export function formatFetch(response: FetchOutputResponse): string[] {
  const lines = ['', response.markdown.trim(), ''];

  if (response.data) {
    lines.push('Data:', JSON.stringify(response.data, null, 2), '');
  }

  if (response.rawContent) {
    lines.push('Raw Content:', response.rawContent.trim(), '');
  }

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
