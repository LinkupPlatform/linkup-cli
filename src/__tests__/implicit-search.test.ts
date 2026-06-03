import { Command } from 'commander';
import { applyImplicitSearch, collectKnownCommands } from '../implicit-search';

function knownCommands(): Set<string> {
  const program = new Command();
  program.command('search').alias('s');
  program.command('fetch').alias('f');
  program.command('research').alias('r');
  program.command('setup');
  program.command('config');
  program.command('logout');
  return collectKnownCommands(program);
}

describe('applyImplicitSearch', () => {
  it('inserts search when the first user arg is not a known command', () => {
    expect(applyImplicitSearch(['node', 'linkup', 'hello world'], knownCommands())).toEqual([
      'node',
      'linkup',
      'search',
      'hello world',
    ]);
  });

  it('does not mutate the input argv array', () => {
    const argv = ['node', 'linkup', 'hello'];
    applyImplicitSearch(argv, knownCommands());
    expect(argv).toEqual(['node', 'linkup', 'hello']);
  });

  it('leaves argv unchanged for known commands', () => {
    expect(
      applyImplicitSearch(['node', 'linkup', 'fetch', 'https://example.com'], knownCommands()),
    ).toEqual(['node', 'linkup', 'fetch', 'https://example.com']);
  });

  it('leaves argv unchanged for the research command and its alias', () => {
    expect(
      applyImplicitSearch(['node', 'linkup', 'research', 'my question'], knownCommands()),
    ).toEqual(['node', 'linkup', 'research', 'my question']);
    expect(applyImplicitSearch(['node', 'linkup', 'r', 'my question'], knownCommands())).toEqual([
      'node',
      'linkup',
      'r',
      'my question',
    ]);
  });

  it('leaves argv unchanged when the first arg is a flag', () => {
    expect(applyImplicitSearch(['node', 'linkup', '--help'], knownCommands())).toEqual([
      'node',
      'linkup',
      '--help',
    ]);
  });

  it('inserts search after boolean global flags', () => {
    expect(applyImplicitSearch(['node', 'linkup', '-j', 'hello world'], knownCommands())).toEqual([
      'node',
      'linkup',
      '-j',
      'search',
      'hello world',
    ]);
    expect(
      applyImplicitSearch(['node', 'linkup', '--json', 'hello world'], knownCommands()),
    ).toEqual(['node', 'linkup', '--json', 'search', 'hello world']);
  });

  it('leaves argv unchanged when global flags are followed by a known command', () => {
    expect(
      applyImplicitSearch(
        ['node', 'linkup', '-j', 'fetch', 'https://example.com'],
        knownCommands(),
      ),
    ).toEqual(['node', 'linkup', '-j', 'fetch', 'https://example.com']);
  });

  it('leaves argv unchanged when there is no user arg', () => {
    expect(applyImplicitSearch(['node', 'linkup'], knownCommands())).toEqual(['node', 'linkup']);
  });

  it('derives command aliases from the registered program', () => {
    const commands = knownCommands();

    for (const command of ['search', 's', 'fetch', 'f', 'research', 'r', 'help']) {
      expect(commands.has(command)).toBe(true);
    }
  });
});
