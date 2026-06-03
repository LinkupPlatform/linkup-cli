import { execFileSync } from 'node:child_process';

export type ClipboardResult = { text: string } | { error: string };

type ClipboardCommand = { command: string; args: string[] };

/** Run a clipboard command. Returns its stdout, or null when the binary is missing. */
function run({ command, args }: ClipboardCommand): string | null {
  try {
    return execFileSync(command, args, { encoding: 'utf8' });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    // The tool exists but exited non-zero (e.g. empty selection); surface its stdout.
    const stdout = (error as { stdout?: string | Buffer }).stdout;
    return typeof stdout === 'string' ? stdout : (stdout?.toString() ?? null);
  }
}

/** Read text from the system clipboard, with a per-OS strategy. */
export function readClipboard(): ClipboardResult {
  switch (process.platform) {
    case 'darwin': {
      const out = run({ args: [], command: 'pbpaste' });
      return out === null ? { error: 'pbpaste not found' } : { text: out.trim() };
    }
    case 'linux': {
      const candidates: ClipboardCommand[] = [
        { args: ['-selection', 'clipboard', '-o'], command: 'xclip' },
        { args: ['--clipboard', '--output'], command: 'xsel' },
        { args: [], command: 'wl-paste' },
      ];
      let foundClipboardTool = false;
      for (const candidate of candidates) {
        const out = run(candidate);
        if (out !== null) {
          foundClipboardTool = true;
          if (!out.trim()) {
            continue;
          }
          return { text: out.trim() };
        }
      }
      if (foundClipboardTool) {
        return { text: '' };
      }
      return { error: 'No clipboard tool found. Install xclip, xsel, or wl-clipboard.' };
    }
    case 'win32': {
      const out = run({ args: ['-NoProfile', '-Command', 'Get-Clipboard'], command: 'powershell' });
      return out === null ? { error: 'powershell not found' } : { text: out.trim() };
    }
    default:
      return { error: `Clipboard not supported on ${process.platform}` };
  }
}
