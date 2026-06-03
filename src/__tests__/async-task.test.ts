import type { TaskStatus } from 'linkup-sdk';
import { pollTask } from '../commands/async-task';

type TestTask = {
  id: string;
  status: TaskStatus;
};

function makeTask(status: TaskStatus): TestTask {
  return { id: 'task-1', status };
}

describe('pollTask', () => {
  const noSleep = (): Promise<void> => Promise.resolve();

  it('returns immediately when the task is already completed', async () => {
    const getTask = jest.fn().mockResolvedValue(makeTask('completed'));

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
      .mockResolvedValueOnce(makeTask('pending'))
      .mockResolvedValueOnce(makeTask('processing'))
      .mockResolvedValueOnce(makeTask('failed'));

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
    const getTask = jest.fn().mockResolvedValue(makeTask('pending'));
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
