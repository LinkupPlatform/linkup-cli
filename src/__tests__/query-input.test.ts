import { resolveQueryOrExit } from '../commands/query-input';
import type { QueryReaders } from '../input/query';

class ExitError extends Error {
  constructor(public code: number) {
    super(`exit:${code}`);
  }
}

const originalExit = process.exit;

const stubReaders: QueryReaders = {
  clipboard: () => ({ text: '' }),
  interactive: async () => ({ cancelled: false, text: '' }),
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

  it('reads from the clipboard and prints the notice', async () => {
    const readers: QueryReaders = { ...stubReaders, clipboard: () => ({ text: 'pasted text' }) };

    await expect(
      resolveQueryOrExit({ args: [], clipboard: true }, usageLines, readers, true),
    ).resolves.toBe('pasted text');
    expect(errorSpy).toHaveBeenCalledWith('Read 11 characters from clipboard');
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

  it('exits cleanly (code 0) when the interactive prompt is cancelled', async () => {
    const readers: QueryReaders = {
      ...stubReaders,
      interactive: async () => ({ cancelled: true, text: '' }),
    };

    await expect(resolveQueryOrExit({ args: [] }, usageLines, readers, true)).rejects.toMatchObject(
      { code: 0 },
    );
  });

  it('exits with code 1 on a hard resolution error', async () => {
    const readers: QueryReaders = {
      ...stubReaders,
      clipboard: () => ({ error: 'pbpaste not found' }),
    };

    await expect(
      resolveQueryOrExit({ args: [], clipboard: true }, usageLines, readers, true),
    ).rejects.toMatchObject({ code: 1 });
    expect(errorSpy).toHaveBeenCalledWith('Error: pbpaste not found');
  });

  it('exits with code 1 when multiple query sources are provided', async () => {
    await expect(
      resolveQueryOrExit({ args: ['typed'], clipboard: true }, usageLines, stubReaders, true),
    ).rejects.toMatchObject({ code: 1 });
    expect(errorSpy).toHaveBeenCalledWith(
      'Error: Multiple query sources provided: --clipboard, positional query. Use only one.',
    );
  });
});
