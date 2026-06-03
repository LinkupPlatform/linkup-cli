import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const bin = join(__dirname, '../../bin/linkup.js');
const TEST_API_KEY = 'test-api-key-abcdefghijklmnop';

function runCli(
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): { stdout: string; stderr: string; status: number } {
  try {
    const stdout = execFileSync('node', [bin, ...args], {
      encoding: 'utf8',
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { status: 0, stderr: '', stdout };
  } catch (error) {
    const execError = error as {
      status?: number;
      stdout?: string;
      stderr?: string;
    };
    return {
      status: execError.status ?? 1,
      stderr: execError.stderr ?? '',
      stdout: execError.stdout ?? '',
    };
  }
}

describe('linkup CLI', () => {
  it('--version prints a semver string and exits 0', () => {
    const output = execFileSync('node', [bin, '--version']).toString().trim();
    expect(output).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('-v prints a semver string and exits 0', () => {
    const output = execFileSync('node', [bin, '-v']).toString().trim();
    expect(output).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('-V remains supported for version output', () => {
    const output = execFileSync('node', [bin, '-V']).toString().trim();
    expect(output).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('--help exits 0 and mentions linkup', () => {
    const output = execFileSync('node', [bin, '--help']).toString();
    expect(output).toContain('linkup');
    expect(output).toContain('--api-key');
    expect(output).toContain('--json');
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
    expect(output).toContain('Examples:');
  });

  it('rejects invalid --depth', () => {
    const { status, stderr } = runCli(['search', 'q', '-d', 'superdeep']);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/depth|superdeep|choice/i);
  });

  it('rejects invalid --output', () => {
    const { status, stderr } = runCli(['search', 'q', '-o', 'garbage']);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/output|garbage|choice/i);
  });

  it('rejects the old camelCase --output values', () => {
    const { status, stderr } = runCli(['search', 'q', '-o', 'sourcedAnswer']);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/sourcedAnswer|choice/i);
  });

  it('rejects invalid --from-date', () => {
    const { status, stderr } = runCli(['search', 'q', '--from-date', 'not-a-date']);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/from-date|valid date/i);
  });

  it('rejects invalid --max-results', () => {
    const { status, stderr } = runCli(['search', 'q', '--max-results', '0']);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/max-results|positive integer/i);
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
    expect(output).toContain('Examples:');
  });

  it('fetch requires a url argument', () => {
    const { status, stderr } = runCli(['fetch']);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/url|argument|missing/i);
  });

  it('fetch rejects invalid URLs', () => {
    const { status, stderr } = runCli(['fetch', 'not-a-url']);
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/valid URL/i);
  });

  it('lists logout in root help', () => {
    const output = execFileSync('node', [bin, '--help']).toString();
    expect(output).toContain('logout');
  });
});
