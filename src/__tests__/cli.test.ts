import { execFileSync } from 'node:child_process';
import { DEFAULT_POLL_INTERVAL_SECONDS } from '../commands/async-task';
import { bin, runCli, TEST_API_KEY } from './helpers/run-cli';

describe('linkup CLI', () => {
  it('--version prints a semver string and exits 0', () => {
    const output = execFileSync('node', [bin, '--version']).toString().trim();
    expect(output).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('-v prints a semver string and exits 0', () => {
    const output = execFileSync('node', [bin, '-v']).toString().trim();
    expect(output).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('--help exits 0 and mentions linkup', () => {
    const output = execFileSync('node', [bin, '--help']).toString();
    expect(output).toContain('linkup');
    expect(output).not.toContain('--api-key');
    expect(output).toContain('-j, --json');
    expect(output).toContain('Examples:');
  });

  it('prints help when invoked with no subcommand', () => {
    const output = execFileSync('node', [bin]).toString();
    expect(output).toContain('Usage:');
    expect(output).toContain('linkup');
  });

  it('search --help lists depth and output choices', () => {
    const output = execFileSync('node', [bin, 'search', '--help']).toString();
    expect(output).toMatch(/"fast", "standard",\s+"deep"/);
    expect(output).toContain('"sourced-answer"');
    expect(output).toContain('"search-results"');
    expect(output).toContain('"structured"');
    expect(output).toContain('--include-domains');
    expect(output).toContain('--exclude-domains');
    expect(output).toContain('--from-date');
    expect(output).toContain('--to-date');
    expect(output).toContain('--include-images');
    expect(output).toContain('--max-results');
    expect(output).toContain('--async');
    expect(output).toContain('-w, --wait');
    expect(output).toContain('Examples:');
  });

  it.each([
    {
      args: ['search', 'q', '-d', 'superdeep'],
      expectedError: /depth|superdeep|choice/i,
      name: 'invalid --depth',
    },
    {
      args: ['search', 'q', '-o', 'garbage'],
      expectedError: /output|garbage|choice/i,
      name: 'invalid --output',
    },
    {
      args: ['search', 'q', '-o', 'sourcedAnswer'],
      expectedError: /sourcedAnswer|choice/i,
      name: 'old camelCase --output',
    },
    {
      args: ['search', 'q', '--from-date', 'not-a-date'],
      expectedError: /from-date|valid date/i,
      name: 'invalid --from-date',
    },
    {
      args: ['search', 'q', '--max-results', '0'],
      expectedError: /max-results|positive integer/i,
      name: 'invalid --max-results',
    },
  ])('rejects $name', ({ args, expectedError }) => {
    const { status, stderr } = runCli(args);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(expectedError);
  });

  it('errors when --file points at a missing file', () => {
    const { status, stderr } = runCli(['search', '-f', '/no/such/query.txt'], {
      ...process.env,
      LINKUP_API_KEY: TEST_API_KEY,
    });
    expect(status).toBe(1);
    expect(stderr).toContain('Could not read query file');
  });

  it('prints usage when no query can be resolved', () => {
    const { status, stderr } = runCli(['search'], {
      ...process.env,
      LINKUP_API_KEY: TEST_API_KEY,
    });
    expect(status).toBe(1);
    expect(stderr).toContain('No query provided');
  });

  it('fetch --help documents the url argument', () => {
    const output = execFileSync('node', [bin, 'fetch', '--help']).toString();
    expect(output).toContain('url');
    expect(output).toContain('Fetch');
    expect(output).toContain('--render-js');
    expect(output).toContain('--include-raw-html');
    expect(output).toContain('--extract-images');
    expect(output).toContain('--async');
    expect(output).toContain('-w, --wait');
    expect(output).toContain('Examples:');
  });

  it.each([
    {
      args: ['fetch'],
      expectedError: /url|argument|missing/i,
      name: 'missing url argument',
    },
    {
      args: ['fetch', 'not-a-url'],
      expectedError: /valid URL/i,
      name: 'invalid URL value',
    },
  ])('fetch rejects $name', ({ args, expectedError }) => {
    const { status, stderr } = runCli(args);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(expectedError);
  });

  it('lists logout in root help', () => {
    const output = execFileSync('node', [bin, '--help']).toString();
    expect(output).toContain('logout');
  });

  it('tasks exposes create, get, and list subcommands', () => {
    const output = execFileSync('node', [bin, 'tasks', '--help']).toString();
    expect(output).toContain('create');
    expect(output).toContain('get');
    expect(output).toContain('list');
  });

  it('tasks list rejects invalid status filters', () => {
    const { status, stderr } = runCli(['tasks', 'list', '--status', 'queued']);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/invalid status|queued/i);
  });

  it('tasks create requires file or stdin input', () => {
    const { status, stderr } = runCli(['tasks', 'create'], {
      ...process.env,
      LINKUP_API_KEY: TEST_API_KEY,
    });
    expect(status).toBe(1);
    expect(stderr).toMatch(/No tasks provided|Tasks JSON is empty/);
  });

  it('research --help lists output, mode, reasoning, and wait options', () => {
    const output = execFileSync('node', [bin, 'research', '--help']).toString();
    expect(output).toContain('"sourced-answer"');
    expect(output).toContain('"structured"');
    expect(output).toContain('-m, --mode');
    expect(output).toContain('--reasoning-depth');
    expect(output).toContain('default: "L"');
    expect(output).toContain('-w, --wait');
    expect(output).toContain('--poll-interval');
    expect(output).toContain(`default: ${DEFAULT_POLL_INTERVAL_SECONDS}`);
    expect(output).toContain('--timeout');
    expect(output).toContain('default: 1200 (20 minutes)');
    expect(output).toContain('Examples:');
    expect(output).not.toContain('--reasoning-depth L');
  });

  it('research --help lists the file query source', () => {
    const output = execFileSync('node', [bin, 'research', '--help']).toString();
    expect(output).toContain('--file');
  });

  it('research exposes get and list subcommands', () => {
    const output = execFileSync('node', [bin, 'research', '--help']).toString();
    expect(output).toContain('get');
    expect(output).toContain('list');
  });

  it('research requires a schema for structured output', () => {
    const { status, stderr } = runCli(['research', 'q', '--output', 'structured'], {
      ...process.env,
      LINKUP_API_KEY: TEST_API_KEY,
    });
    expect(status).toBe(1);
    expect(stderr).toContain('--output structured requires --schema-file or --schema');
  });

  it('research prints usage when no query is provided', () => {
    const { status, stderr } = runCli(['research'], {
      ...process.env,
      LINKUP_API_KEY: TEST_API_KEY,
    });
    expect(status).toBe(1);
    expect(stderr).toContain('No query provided');
  });

  it('research rejects invalid --mode', () => {
    const { status, stderr } = runCli(['research', 'q', '--mode', 'turbo']);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/mode|turbo|choice/i);
  });

  it('research get requires an id argument', () => {
    const { status, stderr } = runCli(['research', 'get']);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/id|argument|missing/i);
  });
});
