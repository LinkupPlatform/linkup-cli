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
  it('returns a query joined from positional args', async () => {
    await expect(
      resolveQueryOrExit({ args: ['hello', 'world'] }, usageLines, stubReaders, true),
    ).resolves.toBe('hello world');
  });

  it('reads from stdin when input is piped', async () => {
    const readers: QueryReaders = { ...stubReaders, stdin: async () => '  piped query\n' };

    await expect(resolveQueryOrExit({ args: [] }, usageLines, readers, false)).resolves.toBe(
      'piped query',
    );
  });

  it('exits with usage (code 1) when no query resolves', async () => {
    await expect(
      resolveQueryOrExit({ args: [] }, usageLines, stubReaders, true),
    ).rejects.toMatchObject({ code: 1 });
    expect(errorSpy).toHaveBeenCalledWith('Error: No query provided');
  });

  it('exits with code 1 when multiple query sources are provided', async () => {
    await expect(
      resolveQueryOrExit({ args: ['typed'], file: '/ignored' }, usageLines, stubReaders, true),
    ).rejects.toMatchObject({ code: 1 });
    expect(errorSpy).toHaveBeenCalledWith(
      'Error: Multiple query sources provided: --file, positional query. Use only one.',
    );
  });
});
