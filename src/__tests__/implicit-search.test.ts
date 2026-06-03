import { applyImplicitSearch } from '../implicit-search';

describe('applyImplicitSearch', () => {
  it('inserts search when the first user arg is not a known command', () => {
    expect(applyImplicitSearch(['node', 'linkup', 'hello world'])).toEqual([
      'node',
      'linkup',
      'search',
      'hello world',
    ]);
  });

  it('does not mutate the input argv array', () => {
    const argv = ['node', 'linkup', 'hello'];
    applyImplicitSearch(argv);
    expect(argv).toEqual(['node', 'linkup', 'hello']);
  });

  it('leaves argv unchanged for known commands', () => {
    expect(applyImplicitSearch(['node', 'linkup', 'fetch', 'https://example.com'])).toEqual([
      'node',
      'linkup',
      'fetch',
      'https://example.com',
    ]);
  });

  it('leaves argv unchanged when the first arg is a flag', () => {
    expect(applyImplicitSearch(['node', 'linkup', '--help'])).toEqual(['node', 'linkup', '--help']);
  });

  it('leaves argv unchanged when there is no user arg', () => {
    expect(applyImplicitSearch(['node', 'linkup'])).toEqual(['node', 'linkup']);
  });
});
