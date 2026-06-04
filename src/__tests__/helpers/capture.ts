export class ExitError extends Error {
  constructor(public code: number) {
    super(`exit:${code}`);
  }
}

export type CapturedConsole = {
  errorSpy: jest.SpyInstance;
  logSpy: jest.SpyInstance;
  restore: () => void;
};

export function captureConsole(): CapturedConsole {
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  return {
    errorSpy,
    logSpy,
    restore: () => {
      logSpy.mockRestore();
      errorSpy.mockRestore();
    },
  };
}

export function mockProcessExit(): () => void {
  const originalExit = process.exit;
  process.exit = ((code?: number) => {
    throw new ExitError(code ?? 0);
  }) as never;
  return () => {
    process.exit = originalExit;
  };
}
