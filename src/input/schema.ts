import { readFileSync } from 'node:fs';

export type SchemaInput = {
  schemaFile?: string;
  schema?: string;
};

export function readSchemaRaw(opts: SchemaInput): string {
  if (opts.schemaFile) {
    try {
      return readFileSync(opts.schemaFile, 'utf8');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Could not read schema file: ${message}`);
    }
  }
  return opts.schema ?? '';
}

export function parseSchemaJson(raw: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof SyntaxError ? error.message : String(error);
    throw new Error(`Schema is not valid JSON: ${message}`);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Schema must be a JSON object');
  }

  return parsed as Record<string, unknown>;
}
