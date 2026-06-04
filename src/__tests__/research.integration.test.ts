import { run } from '../cli';
import { captureConsole, mockProcessExit } from './helpers/capture';
import { createFakeClient, mockGlobals } from './helpers/fake-client';
import { makeResearchTask } from './helpers/fixtures';

describe('research command integration', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('submits structured research and waits for completion', async () => {
    const fakeClient = createFakeClient();
    fakeClient.research.mockResolvedValue(
      makeResearchTask({
        input: {
          outputType: 'structured',
          query: 'market outlook',
          reasoningDepth: 'L',
          structuredOutputSchema: { type: 'object' },
        },
      }),
    );
    fakeClient.getResearch.mockResolvedValue(
      makeResearchTask({
        input: {
          outputType: 'structured',
          query: 'market outlook',
          reasoningDepth: 'L',
          structuredOutputSchema: { type: 'object' },
        },
        output: { summary: 'done' },
        status: 'completed',
        updatedAt: '2026-01-01T00:00:01.000Z',
      }),
    );
    mockGlobals(fakeClient);
    const { logSpy } = captureConsole();
    await run([
      'node',
      'linkup',
      '--json',
      'research',
      'market outlook',
      '--output',
      'structured',
      '--schema',
      '{"type":"object"}',
      '--wait',
    ]);

    expect(fakeClient.research).toHaveBeenCalledWith({
      outputType: 'structured',
      query: 'market outlook',
      reasoningDepth: 'L',
      structuredOutputSchema: { type: 'object' },
    });
    expect(fakeClient.getResearch).toHaveBeenCalledWith('research-1');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"status": "completed"'));
  });

  it('maps list pagination and sort options', async () => {
    const fakeClient = createFakeClient();
    fakeClient.listResearch.mockResolvedValue({
      data: [],
      metadata: { page: 2, pageSize: 5, total: 0, totalPages: 0 },
    });
    mockGlobals(fakeClient);
    captureConsole();
    await run([
      'node',
      'linkup',
      '--json',
      'research',
      'list',
      '--page',
      '2',
      '--page-size',
      '5',
      '--sort-by',
      'updatedAt',
      '--sort-direction',
      'asc',
    ]);

    expect(fakeClient.listResearch).toHaveBeenCalledWith({
      page: 2,
      pageSize: 5,
      sortBy: 'updatedAt',
      sortDirection: 'asc',
    });
  });

  it('prints a formatted error line and exits with code 1 when submit fails', async () => {
    const fakeClient = createFakeClient();
    fakeClient.research.mockRejectedValue(new Error('service unavailable'));
    mockGlobals(fakeClient);
    const restoreExit = mockProcessExit();
    const { restore } = captureConsole();

    try {
      await expect(run(['node', 'linkup', 'research', 'q'])).rejects.toMatchObject({ code: 1 });
    } finally {
      restore();
      restoreExit();
    }
  });
});
