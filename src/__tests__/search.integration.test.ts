import { run } from '../cli.js';
import { captureConsole } from './helpers/capture.js';
import { createFakeClient, mockGlobals } from './helpers/fake-client.js';
import { makeTask } from './helpers/fixtures.js';

describe('search command integration', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps CLI options to a sync search call and prints JSON output', async () => {
    const fakeClient = createFakeClient();
    fakeClient.search.mockResolvedValue({ answer: 'done', sources: [] });
    mockGlobals(fakeClient);
    const { logSpy } = captureConsole();
    await run(['node', 'linkup', '--json', 'search', 'hello world', '--depth', 'deep']);

    expect(fakeClient.search).toHaveBeenCalledWith({
      depth: 'deep',
      outputType: 'sourcedAnswer',
      query: 'hello world',
    });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"answer": "done"'));
  });

  it('routes --async search requests through tasks.create and prints submitted task JSON', async () => {
    const fakeClient = createFakeClient();
    fakeClient.createTasks.mockResolvedValue([
      makeTask({
        input: { depth: 'standard', outputType: 'sourcedAnswer', query: 'q' },
      }),
    ]);
    mockGlobals(fakeClient);
    const { logSpy } = captureConsole();
    await run(['node', 'linkup', '--json', 'search', 'q', '--async']);

    expect(fakeClient.createTasks).toHaveBeenCalledWith([
      {
        input: { depth: 'standard', outputType: 'sourcedAnswer', query: 'q' },
        type: 'search',
      },
    ]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"id": "task-1"'));
  });
});
