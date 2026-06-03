import { execFileSync } from 'node:child_process';
import { readClipboard } from '../input/clipboard';

jest.mock('node:child_process', () => ({
  execFileSync: jest.fn(),
}));

const execFileSyncMock = execFileSync as unknown as jest.Mock;
const originalPlatform = process.platform;

function setPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', {
    configurable: true,
    value: platform,
  });
}

function missingBinaryError(): NodeJS.ErrnoException {
  const error = new Error('not found') as NodeJS.ErrnoException;
  error.code = 'ENOENT';
  return error;
}

afterEach(() => {
  execFileSyncMock.mockReset();
  setPlatform(originalPlatform);
});

describe('readClipboard', () => {
  it('reads from pbpaste on macOS', () => {
    setPlatform('darwin');
    execFileSyncMock.mockReturnValue(' copied text\n');

    expect(readClipboard()).toEqual({ text: 'copied text' });
    expect(execFileSyncMock).toHaveBeenCalledWith('pbpaste', [], { encoding: 'utf8' });
  });

  it('tries the next Linux clipboard tool when an installed tool returns empty output', () => {
    setPlatform('linux');
    execFileSyncMock.mockImplementation((command: string) => {
      if (command === 'xclip') {
        return '';
      }
      if (command === 'xsel') {
        throw missingBinaryError();
      }
      return 'wayland clipboard\n';
    });

    expect(readClipboard()).toEqual({ text: 'wayland clipboard' });
    expect(execFileSyncMock).toHaveBeenCalledTimes(3);
  });

  it('reports an empty Linux clipboard when tools exist but have no text', () => {
    setPlatform('linux');
    execFileSyncMock.mockReturnValue('');

    expect(readClipboard()).toEqual({ text: '' });
  });

  it('reports missing Linux clipboard tools', () => {
    setPlatform('linux');
    execFileSyncMock.mockImplementation(() => {
      throw missingBinaryError();
    });

    expect(readClipboard()).toEqual({
      error: 'No clipboard tool found. Install xclip, xsel, or wl-clipboard.',
    });
  });
});
