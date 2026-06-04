import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

export const bin = join(__dirname, '../../../bin/linkup.js');
export const TEST_API_KEY = 'test-api-key-abcdefghijklmnop';

export type CliResult = {
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
