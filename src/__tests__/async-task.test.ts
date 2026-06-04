import type { SearchParams, Task, TaskRequest, TaskStatus } from 'linkup-sdk';
import { pollTask, runAsyncTaskFlow } from '../commands/async-task';
import { captureConsole } from './helpers/capture';
import { makeTask } from './helpers/fixtures';

type TestTask = {
  id: string;
  status: TaskStatus;
};

function makePollTask(status: TaskStatus): TestTask {
  return { id: 'task-1', status };
}

describe('pollTask', () => {
  const noSleep = (): Promise<void> => Promise.resolve();

  it('returns immediately when the task is already completed', async () => {
    const getTask = jest.fn().mockResolvedValue(makePollTask('completed'));

    const result = await pollTask({
      getTask,
      id: 'task-1',
      intervalMs: 10,
      sleep: noSleep,
      timeoutMs: 1000,
    });

    expect(result.status).toBe('completed');
    expect(getTask).toHaveBeenCalledTimes(1);
  });

  it('polls until the task reaches a terminal state', async () => {
    const getTask = jest
      .fn()
      .mockResolvedValueOnce(makePollTask('pending'))
      .mockResolvedValueOnce(makePollTask('processing'))
      .mockResolvedValueOnce(makePollTask('failed'));

    const result = await pollTask({
      getTask,
      id: 'task-1',
      intervalMs: 10,
      sleep: noSleep,
      timeoutMs: 1000,
    });

    expect(result.status).toBe('failed');
    expect(getTask).toHaveBeenCalledTimes(3);
  });

  it('reports a timeout when the deadline elapses before completion', async () => {
    const getTask = jest.fn().mockResolvedValue(makePollTask('pending'));
    let clock = 0;
    const now = (): number => {
      const value = clock;
      clock += 500;
      return value;
    };

    const result = await pollTask({
      getTask,
      id: 'task-1',
      intervalMs: 10,
      now,
      sleep: noSleep,
      timeoutMs: 1000,
    });

    expect(result.status).toBe('timeout');
    expect(result.task.status).toBe('pending');
  });
});

describe('runAsyncTaskFlow', () => {
  type TestResponse = { answer: string };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function makeClient(
    overrides: {
      createTasks?: jest.Mock<Promise<Task[]>, [TaskRequest[]]>;
      getTask?: jest.Mock<Promise<Task>, [string]>;
    } = {},
  ): {
    createTasks: jest.Mock<Promise<Task[]>, [TaskRequest[]]>;
    getTask: jest.Mock<Promise<Task>, [string]>;
  } {
    return {
      createTasks: overrides.createTasks ?? jest.fn<Promise<Task[]>, [TaskRequest[]]>(),
      getTask: overrides.getTask ?? jest.fn<Promise<Task>, [string]>(),
    };
  }

  const params: SearchParams = {
    depth: 'standard',
    outputType: 'sourcedAnswer',
    query: 'hello',
  };
  const buildRequest = jest.fn(
    (requestParams: SearchParams): TaskRequest => ({ input: requestParams, type: 'search' }),
  );
  const formatSync = jest.fn((response: TestResponse): string[] => [`Answer: ${response.answer}`]);

  it('warns and runs synchronously when --wait is used without --async', async () => {
    const client = makeClient();
    const runSync = jest.fn().mockResolvedValue({ answer: 'done' });
    const { errorSpy, logSpy } = captureConsole();

    await runAsyncTaskFlow({
      buildRequest,
      client,
      formatSync,
      json: false,
      params,
      runSync,
      wait: true,
    });

    expect(errorSpy).toHaveBeenCalledWith('Warning: --wait ignored (only used with --async)');
    expect(runSync).toHaveBeenCalledWith(params);
    expect(client.createTasks).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('Answer: done');
  });

  it('submits an async task and prints JSON without waiting', async () => {
    const task = makeTask({ id: 'task-json' });
    const client = makeClient({
      createTasks: jest.fn().mockResolvedValue([task]),
    });
    const runSync = jest.fn();
    const { logSpy } = captureConsole();

    await runAsyncTaskFlow({
      async: true,
      buildRequest,
      client,
      formatSync,
      json: true,
      params,
      runSync,
    });

    expect(client.createTasks).toHaveBeenCalledWith([{ input: params, type: 'search' }]);
    expect(runSync).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"id": "task-json"'));
  });

  it('submits an async task and prints formatted output without waiting', async () => {
    const client = makeClient({
      createTasks: jest.fn().mockResolvedValue([makeTask({ id: 'task-formatted' })]),
    });
    const { logSpy } = captureConsole();

    await runAsyncTaskFlow({
      async: true,
      buildRequest,
      client,
      formatSync,
      json: false,
      params,
      runSync: jest.fn(),
    });

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Task submitted: task-formatted'));
  });

  it('waits for an async task and prints the completed task', async () => {
    const submitted = makeTask({ id: 'task-complete' });
    const completed = makeTask({
      id: 'task-complete',
      output: { answer: 'done', sources: [] },
      status: 'completed',
    });
    const client = makeClient({
      createTasks: jest.fn().mockResolvedValue([submitted]),
      getTask: jest.fn().mockResolvedValue(completed),
    });
    const { logSpy } = captureConsole();

    await runAsyncTaskFlow({
      async: true,
      buildRequest,
      client,
      formatSync,
      json: true,
      params,
      runSync: jest.fn(),
      wait: true,
    });

    expect(client.getTask).toHaveBeenCalledWith('task-complete');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"status": "completed"'));
  });

  it('prints a timeout hint when waiting reaches the timeout', async () => {
    const pending = makeTask({ id: 'task-timeout', status: 'pending' });
    const client = makeClient({
      createTasks: jest.fn().mockResolvedValue([pending]),
      getTask: jest.fn().mockResolvedValue(pending),
    });
    const { errorSpy, logSpy } = captureConsole();

    await runAsyncTaskFlow({
      async: true,
      buildRequest,
      client,
      formatSync,
      json: true,
      params,
      runSync: jest.fn(),
      timeoutSeconds: 0,
      wait: true,
    });

    expect(errorSpy).toHaveBeenCalledWith(
      'Timed out waiting for task task-timeout. It is still running; check again with:',
    );
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"status": "pending"'));
  });
});
