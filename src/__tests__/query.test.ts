import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { QueryReaders } from '../input/query';
import { resolveQuery } from '../input/query';

const stubReaders: QueryReaders = {
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

  it('reads from stdin when input is piped (not a TTY)', async () => {
    const readers: QueryReaders = { ...stubReaders, stdin: async () => '  piped query\n' };

    const result = await resolveQuery({ args: [] }, readers, false);

    expect(result.query).toBe('piped query');
  });

  it('rejects multiple explicit query sources', async () => {
    await expect(
      resolveQuery({ args: ['from', 'args'], file: '/ignored' }, stubReaders, true),
    ).rejects.toThrow('Multiple query sources provided: --file, positional query');
  });
});
