export function formatJson(response: unknown): string[] {
  return [JSON.stringify(response, null, 2)];
}
