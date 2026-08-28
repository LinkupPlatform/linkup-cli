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
    fakeClient.fetch.mockResolvedValue({ markdown: '# Title' });
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
  });

  it('maps structured extraction options and prints extracted data', async () => {
    const fakeClient = createFakeClient();
    fakeClient.fetch.mockResolvedValue({
      data: { title: 'Example Domain' },
      markdown: '# Example Domain',
    });
    mockGlobals(fakeClient);
    const { logSpy } = captureConsole();
    await run([
      'node',
      'linkup',
      'fetch',
      'https://example.com',
      '--schema',
      '{"type":"object","properties":{"title":{"type":"string"}}}',
      '--instructions',
      'Extract the page title',
    ]);

    expect(fakeClient.fetch).toHaveBeenCalledWith({
      instructions: 'Extract the page title',
      schema: {
        properties: {
          title: { type: 'string' },
        },
        type: 'object',
      },
      url: 'https://example.com',
    });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"title": "Example Domain"'));
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
