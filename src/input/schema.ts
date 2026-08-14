import { readFileSync } from 'node:fs';

export type ObjectSchema = Record<string, unknown> & { type: 'object' };

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

export function parseSchemaJson(raw: string): ObjectSchema {
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

  if (!('type' in parsed) || parsed.type !== 'object') {
    throw new Error('Schema root must have type "object"');
  }

  return parsed as ObjectSchema;
}
