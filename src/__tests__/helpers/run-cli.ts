import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const bin = fileURLToPath(new URL('../../../bin/linkup.js', import.meta.url));
export const TEST_API_KEY = 'test-api-key-abcdefghijklmnop';

type CliResult = {
  stdout: string;
  stderr: string;
  status: number;
};

export function runCli(args: string[], env: NodeJS.ProcessEnv = process.env): CliResult {
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
