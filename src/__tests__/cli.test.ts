import { execSync } from 'node:child_process';
import { join } from 'node:path';

const bin = join(__dirname, '../../bin/linkup.js');

describe('linkup CLI', () => {
  it('--version prints a semver string and exits 0', () => {
    const output = execSync(`node ${bin} --version`).toString().trim();
    expect(output).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('--help exits 0 and mentions linkup', () => {
    const output = execSync(`node ${bin} --help`).toString();
    expect(output).toContain('linkup');
  });
});
