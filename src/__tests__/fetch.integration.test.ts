import { run } from '../cli';
import { captureConsole } from './helpers/capture';
import { createFakeClient, mockGlobals } from './helpers/fake-client';
import { makeTask } from './helpers/fixtures';

describe('fetch command integration', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('maps CLI fetch flags to sdk params and prints formatted output', async () => {
    const fakeClient = createFakeClient();
    fakeClient.fetch.mockResolvedValue({ markdown: '# Title' });
    mockGlobals(fakeClient);
    const { logSpy } = captureConsole();
    await run([
      'node',
      'linkup',
      'fetch',
      'https://example.com',
      '--render-js',
      '--include-raw-html',
      '--extract-images',
    ]);

    expect(fakeClient.fetch).toHaveBeenCalledWith({
      extractImages: true,
      includeRawHtml: true,
      renderJs: true,
      url: 'https://example.com',
    });
    expect(logSpy).toHaveBeenCalledWith('# Title');
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
