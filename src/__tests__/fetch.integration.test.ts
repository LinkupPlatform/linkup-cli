import { run } from '../cli.js';
import { captureConsole } from './helpers/capture.js';
import { createFakeClient, mockGlobals } from './helpers/fake-client.js';
import { makeTask } from './helpers/fixtures.js';

describe('fetch command integration', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps CLI fetch flags to sdk params and prints formatted output', async () => {
    const fakeClient = createFakeClient();
    fakeClient.fetch.mockResolvedValue({
      favicon: 'https://example.com/favicon.ico',
      markdown: '# Title',
    });
    mockGlobals(fakeClient);
    const { logSpy } = captureConsole();
    await run([
      'node',
      'linkup',
      'fetch',
      'https://example.com',
      '--mode',
      'pro',
      '--render-js',
      '--include-raw-content',
      '--extract-images',
    ]);

    expect(fakeClient.fetch).toHaveBeenCalledWith({
      extractImages: true,
      includeRawContent: true,
      mode: 'pro',
      renderJs: true,
      url: 'https://example.com',
    });
    expect(logSpy).toHaveBeenCalledWith('# Title');
    expect(logSpy).toHaveBeenCalledWith('Favicon: https://example.com/favicon.ico');
  });

  it('runs async fetch via tasks and prints submitted task in JSON mode', async () => {
    const fakeClient = createFakeClient();
    fakeClient.createTasks.mockResolvedValue([
      makeTask({
        id: 'task-fetch-1',
        input: { url: 'https://example.com' },
        type: 'fetch',
      }),
    ]);
    mockGlobals(fakeClient);
    const { logSpy } = captureConsole();
    await run(['node', 'linkup', '--json', 'fetch', 'https://example.com', '--async']);

    expect(fakeClient.createTasks).toHaveBeenCalledWith([
      {
        input: { url: 'https://example.com' },
        type: 'fetch',
      },
    ]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"id": "task-fetch-1"'));
  });
});
