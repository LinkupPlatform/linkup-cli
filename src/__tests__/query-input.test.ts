import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveQueryOrExit } from '../commands/query-input';
import type { QueryReaders } from '../input/query';

class ExitError extends Error {
  constructor(public code: number) {
    super(`exit:${code}`);
  }
}

const originalExit = process.exit;

const stubReaders: QueryReaders = {
  stdin: async () => '',
};

const usageLines = ['Error: No query provided'];

let errorSpy: jest.SpyInstance;

beforeEach(() => {
  process.exit = ((code?: number) => {
    throw new ExitError(code ?? 0);
  }) as never;
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  process.exit = originalExit;
  jest.restoreAllMocks();
});

describe('resolveQueryOrExit', () => {
  it('prints notices and returns the resolved query', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'linkup-query-input-test-'));
    const filePath = join(dir, 'query.txt');
    writeFileSync(filePath, '  what is linkup?  \n');

    await expect(
      resolveQueryOrExit({ args: [], file: filePath }, usageLines, stubReaders, true),
    ).resolves.toBe('what is linkup?');
    expect(errorSpy).toHaveBeenCalledWith(`Read query from ${filePath}`);
  });

  it('exits with usage (code 1) when no query resolves', async () => {
    await expect(
      resolveQueryOrExit({ args: [] }, usageLines, stubReaders, true),
    ).rejects.toMatchObject({ code: 1 });
    expect(errorSpy).toHaveBeenCalledWith('Error: No query provided');
  });

  it('exits with a formatted error when query resolution fails', async () => {
    await expect(
      resolveQueryOrExit({ args: ['typed'], file: '/ignored' }, usageLines, stubReaders, true),
    ).rejects.toMatchObject({ code: 1 });
    expect(errorSpy).toHaveBeenCalledWith(
      'Error: Multiple query sources provided: --file, positional query. Use only one.',
    );
  });
});
