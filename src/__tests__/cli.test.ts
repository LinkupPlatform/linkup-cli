import { execSync } from 'node:child_process';
import { join } from 'node:path';

const bin = join(__dirname, '../../bin/linkup.js');

function runCli(args: string): { stdout: string; stderr: string; status: number } {
  try {
    const stdout = execSync(`node ${bin} ${args}`, {
      encoding: 'utf8',
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
    const output = execSync(`node ${bin} --version`).toString().trim();
    expect(output).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('--help exits 0 and mentions linkup', () => {
    const output = execSync(`node ${bin} --help`).toString();
    expect(output).toContain('linkup');
  });

  it('prints help when invoked with no subcommand', () => {
    const output = execSync(`node ${bin}`).toString();
    expect(output).toContain('Usage:');
    expect(output).toContain('linkup');
  });

  it('search --help lists depth and output choices', () => {
    const output = execSync(`node ${bin} search --help`).toString();
    expect(output).toContain('fast | standard | deep');
    expect(output).toContain('sourcedAnswer | searchResults | structured');
  });

  it('rejects invalid --depth', () => {
    const { status, stderr } = runCli('search "q" -d superdeep');
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/depth|superdeep|choice/i);
  });

  it('rejects invalid --output', () => {
    const { status, stderr } = runCli('search "q" -o garbage');
    expect(status).not.toBe(0);
    expect(stderr).toMatch(/output|garbage|choice/i);
  });

  it('reports --clipboard as not implemented', () => {
    const { status, stderr } = runCli('search -c');
    expect(status).toBe(1);
    expect(stderr).toContain('--clipboard is not implemented yet');
  });

  it('reports --file as not implemented', () => {
    const { status, stderr } = runCli('search -f query.txt');
    expect(status).toBe(1);
    expect(stderr).toContain('--file is not implemented yet');
  });
});
