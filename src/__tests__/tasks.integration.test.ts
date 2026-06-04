import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from '../cli';
import { captureConsole } from './helpers/capture';
import { createFakeClient, mockGlobals } from './helpers/fake-client';
import { makeTask } from './helpers/fixtures';

describe('tasks command integration', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('parses task JSON from file, creates tasks, and waits for completion', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'linkup-tasks-integration-'));
    const taskFile = join(dir, 'tasks.json');
    writeFileSync(
      taskFile,
      JSON.stringify({
        input: { outputType: 'sourcedAnswer', query: 'hello' },
        type: 'search',
      }),
    );

    const fakeClient = createFakeClient();
    fakeClient.createTasks.mockResolvedValue([
      makeTask({ input: { outputType: 'sourcedAnswer', query: 'hello' } }),
    ]);
    fakeClient.getTask.mockResolvedValue(
      makeTask({
        input: { outputType: 'sourcedAnswer', query: 'hello' },
        output: { answer: 'done', sources: [] },
        status: 'completed',
        updatedAt: '2026-01-01T00:00:01.000Z',
      }),
    );
    mockGlobals(fakeClient);
    const { logSpy } = captureConsole();
    await run(['node', 'linkup', '--json', 'tasks', 'create', '--file', taskFile, '--wait']);

    expect(fakeClient.createTasks).toHaveBeenCalledWith([
      {
        input: { outputType: 'sourcedAnswer', query: 'hello' },
        type: 'search',
      },
    ]);
    expect(fakeClient.getTask).toHaveBeenCalledWith('task-1');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"status": "completed"'));
  });

  it('maps list filters and sorting to sdk params', async () => {
    const fakeClient = createFakeClient();
    fakeClient.listTasks.mockResolvedValue({
      data: [],
      metadata: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      quota: { inFlight: 0, limit: 10 },
    });
    mockGlobals(fakeClient);
    captureConsole();
    await run([
      'node',
      'linkup',
      '--json',
      'tasks',
      'list',
      '--status',
      'pending,processing',
      '--type',
      'search,research',
      '--sort-by',
      'updatedAt',
      '--sort-direction',
      'desc',
    ]);

    expect(fakeClient.listTasks).toHaveBeenCalledWith({
      sortBy: 'updatedAt',
      sortDirection: 'desc',
      status: ['pending', 'processing'],
      type: ['search', 'research'],
    });
  });
});
