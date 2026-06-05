import { runCli, TEST_API_KEY } from './helpers/run-cli.js';

describe('linkup CLI', () => {
  it.each(['--version', '-v'])('%s prints a semver string and exits 0', flag => {
    const { status, stdout } = runCli([flag]);

    expect(status).toBe(0);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it.each([
    {
      args: [],
      excludes: [],
      includes: ['Usage:', 'linkup', 'logout'],
      name: 'root command',
    },
    {
      args: ['--help'],
      excludes: ['--api-key'],
      includes: ['linkup', 'Examples:'],
      name: 'root help',
    },
    {
      args: ['search', '--help'],
      excludes: [],
      includes: ['search', 'Examples:'],
      name: 'search help',
    },
    {
      args: ['fetch', '--help'],
      excludes: [],
      includes: ['url', 'Examples:'],
      name: 'fetch help',
    },
    {
      args: ['research', '--help'],
      excludes: [],
      includes: ['get', 'list', 'Examples:'],
      name: 'research help',
    },
    {
      args: ['tasks', '--help'],
      excludes: [],
      includes: ['create', 'get', 'list'],
      name: 'tasks help',
    },
  ])('$name exits 0 and includes representative help text', ({ args, excludes, includes }) => {
    const { status, stdout } = runCli(args);

    expect(status).toBe(0);
    for (const text of includes) {
      expect(stdout).toContain(text);
    }
    for (const text of excludes) {
      expect(stdout).not.toContain(text);
    }
  });

  it.each([
    {
      args: ['search', 'q', '-d', 'superdeep'],
      expectedError: /depth|superdeep|choice/i,
      name: 'invalid search --depth',
    },
    {
      args: ['search', 'q', '-o', 'garbage'],
      expectedError: /output|garbage|choice/i,
      name: 'invalid search --output',
    },
    {
      args: ['search', 'q', '-o', 'sourcedAnswer'],
      expectedError: /sourcedAnswer|choice/i,
      name: 'old camelCase search --output',
    },
    {
      args: ['search', 'q', '--from-date', 'not-a-date'],
      expectedError: /from-date|valid date/i,
      name: 'invalid search --from-date',
    },
    {
      args: ['search', 'q', '--max-results', '0'],
      expectedError: /max-results|positive integer/i,
      name: 'invalid search --max-results',
    },
    {
      args: ['fetch'],
      expectedError: /url|argument|missing/i,
      name: 'missing fetch url argument',
    },
    {
      args: ['fetch', 'not-a-url'],
      expectedError: /valid URL/i,
      name: 'invalid fetch URL value',
    },
    {
      args: ['research', 'q', '--mode', 'turbo'],
      expectedError: /mode|turbo|choice/i,
      name: 'invalid research --mode',
    },
    {
      args: ['research', 'get'],
      expectedError: /id|argument|missing/i,
      name: 'missing research get id argument',
    },
  ])('rejects $name', ({ args, expectedError }) => {
    const { status, stderr } = runCli(args);

    expect(status).not.toBe(0);
    expect(stderr).toMatch(expectedError);
  });

  it('tasks create requires file or stdin input', () => {
    const { status, stderr } = runCli(['tasks', 'create'], {
      ...process.env,
      LINKUP_API_KEY: TEST_API_KEY,
    });
    expect(status).toBe(1);
    expect(stderr).toMatch(/No tasks provided|Tasks JSON is empty/);
  });
});
