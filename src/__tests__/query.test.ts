import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { QueryReaders } from '../input/query';
import { resolveQuery } from '../input/query';

const stubReaders: QueryReaders = {
  clipboard: () => ({ text: '' }),
  interactive: async () => ({ cancelled: false, text: '' }),
  stdin: async () => '',
};

describe('resolveQuery', () => {
  it('joins positional args with spaces', async () => {
    const result = await resolveQuery({ args: ['hello', 'world'] }, stubReaders, true);

    expect(result).toEqual({ notices: [], query: 'hello world' });
  });

  it('reads and trims a query from a file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'linkup-query-test-'));
    const filePath = join(dir, 'query.txt');
    writeFileSync(filePath, '  what is linkup?  \n');

    const result = await resolveQuery({ args: [], file: filePath }, stubReaders, true);

    expect(result.query).toBe('what is linkup?');
    expect(result.notices).toContain(`Read query from ${filePath}`);
  });

  it('throws a friendly error when the file cannot be read', async () => {
    await expect(
      resolveQuery({ args: [], file: '/no/such/file.txt' }, stubReaders, true),
    ).rejects.toThrow('Could not read query file');
  });

  it('reads from the clipboard and reports the character count', async () => {
    const readers: QueryReaders = { ...stubReaders, clipboard: () => ({ text: 'pasted text' }) };

    const result = await resolveQuery({ args: [], clipboard: true }, readers, true);

    expect(result.query).toBe('pasted text');
    expect(result.notices).toContain('Read 11 characters from clipboard');
  });

  it('errors when the clipboard is empty', async () => {
    const readers: QueryReaders = { ...stubReaders, clipboard: () => ({ text: '' }) };

    await expect(resolveQuery({ args: [], clipboard: true }, readers, true)).rejects.toThrow(
      'Clipboard is empty',
    );
  });

  it('surfaces clipboard tool errors', async () => {
    const readers: QueryReaders = {
      ...stubReaders,
      clipboard: () => ({ error: 'pbpaste not found' }),
    };

    await expect(resolveQuery({ args: [], clipboard: true }, readers, true)).rejects.toThrow(
      'pbpaste not found',
    );
  });

  it('reads from stdin when input is piped (not a TTY)', async () => {
    const readers: QueryReaders = { ...stubReaders, stdin: async () => '  piped query\n' };

    const result = await resolveQuery({ args: [] }, readers, false);

    expect(result.query).toBe('piped query');
  });

  it('falls back to the interactive prompt on a TTY', async () => {
    const readers: QueryReaders = {
      ...stubReaders,
      interactive: async () => ({ cancelled: false, text: 'typed query' }),
    };

    const result = await resolveQuery({ args: [] }, readers, true);

    expect(result.query).toBe('typed query');
  });

  it('flags interactive cancellation', async () => {
    const readers: QueryReaders = {
      ...stubReaders,
      interactive: async () => ({ cancelled: true, text: '' }),
    };

    const result = await resolveQuery({ args: [] }, readers, true);

    expect(result.cancelled).toBe(true);
    expect(result.query).toBe('');
  });

  it('rejects multiple explicit query sources', async () => {
    const readers: QueryReaders = { ...stubReaders, clipboard: () => ({ text: 'from clipboard' }) };

    await expect(
      resolveQuery({ args: ['from', 'args'], clipboard: true, file: '/ignored' }, readers, true),
    ).rejects.toThrow('Multiple query sources provided: --clipboard, --file, positional query');
  });
});
