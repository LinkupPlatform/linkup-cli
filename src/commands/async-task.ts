import { Option } from 'commander';
import type { Task, TaskRequest, TaskStatus } from 'linkup-sdk';
import { printLines } from '../output/errors';
import { formatJson } from '../output/json';
import { startSpinner } from '../output/spinner';
import { formatTask, formatTasksSubmitted } from '../output/tasks';
import { parsePositiveInt } from './option-parsers';

export const DEFAULT_POLL_INTERVAL_SECONDS = 5;
export const DEFAULT_TIMEOUT_SECONDS = 20 * 60;

export type PollTaskStatus = 'completed' | 'failed' | 'timeout';

export type PollableTask = {
  id: string;
  status: TaskStatus;
};

export type PollTaskOptions<TTask extends PollableTask> = {
  getTask: (id: string) => Promise<TTask>;
  id: string;
  intervalMs: number;
  timeoutMs: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

export type PollTaskResult<TTask extends PollableTask> = {
  status: PollTaskStatus;
  task: TTask;
};

export type WaitForTaskOptions<TTask extends PollableTask> = {
  getTask: (id: string) => Promise<TTask>;
  id: string;
  json: boolean;
  label: string;
  pollIntervalSeconds: number;
  timeoutSeconds: number;
};

type GenericTaskClient = {
  createTasks: (requests: TaskRequest[]) => Promise<Task[]>;
  getTask: (id: string) => Promise<Task>;
};

export type AsyncTaskFlowOptions<TParams, TResponse> = {
  async?: boolean;
  buildRequest: (params: TParams) => TaskRequest;
  client: GenericTaskClient;
  formatSync: (response: TResponse) => string[];
  json: boolean;
  params: TParams;
  pollIntervalSeconds?: number;
  runSync: (params: TParams) => Promise<TResponse>;
  timeoutSeconds?: number;
  wait?: boolean;
};

const defaultSleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export function createPollIntervalOption(): Option {
  return new Option('--poll-interval <seconds>', 'Seconds between status checks when waiting')
    .default(DEFAULT_POLL_INTERVAL_SECONDS)
    .argParser((value: string) => parsePositiveInt(value));
}

export function createTimeoutOption(): Option {
  return new Option('--timeout <seconds>', 'Maximum seconds to wait before giving up')
    .default(DEFAULT_TIMEOUT_SECONDS, `${DEFAULT_TIMEOUT_SECONDS} (20 minutes)`)
    .argParser((value: string) => parsePositiveInt(value));
}

export function printTimeoutHint(kind: 'task' | 'research', id: string): void {
  if (kind === 'research') {
    console.error(`Timed out waiting for research ${id}. It is still running; check again with:`);
    console.error(`  linkup research get ${id} --wait`);
    return;
  }

  console.error(`Timed out waiting for task ${id}. It is still running; check again with:`);
  console.error(`  linkup tasks get ${id} --wait`);
}

/**
 * Poll a task until it reaches a terminal state or the timeout elapses.
 * Timers and clock are injectable so the loop can be unit-tested without real delays.
 */
export async function pollTask<TTask extends PollableTask>(
  options: PollTaskOptions<TTask>,
): Promise<PollTaskResult<TTask>> {
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? Date.now;
  const start = now();

  let task = await options.getTask(options.id);

  while (task.status !== 'completed' && task.status !== 'failed') {
    if (now() - start >= options.timeoutMs) {
      return { status: 'timeout', task };
    }
    await sleep(options.intervalMs);
    task = await options.getTask(options.id);
  }

  return { status: task.status as 'completed' | 'failed', task };
}

export async function waitForTask<TTask extends PollableTask>(
  options: WaitForTaskOptions<TTask>,
): Promise<PollTaskResult<TTask>> {
  const stopSpinner = options.json ? () => {} : startSpinner(options.label);
  try {
    return await pollTask({
      getTask: options.getTask,
      id: options.id,
      intervalMs: options.pollIntervalSeconds * 1000,
      timeoutMs: options.timeoutSeconds * 1000,
    });
  } finally {
    stopSpinner();
  }
}

export async function runAsyncTaskFlow<TParams, TResponse>(
  options: AsyncTaskFlowOptions<TParams, TResponse>,
): Promise<void> {
  if (options.wait && !options.async) {
    console.error('Warning: --wait ignored (only used with --async)');
  }

  if (options.async) {
    const [task] = await options.client.createTasks([options.buildRequest(options.params)]);

    if (options.wait) {
      const result = await waitForTask<Task>({
        getTask: id => options.client.getTask(id),
        id: task.id,
        json: options.json,
        label: 'Waiting for task...',
        pollIntervalSeconds: options.pollIntervalSeconds ?? DEFAULT_POLL_INTERVAL_SECONDS,
        timeoutSeconds: options.timeoutSeconds ?? DEFAULT_TIMEOUT_SECONDS,
      });

      if (result.status === 'timeout') {
        printTimeoutHint('task', result.task.id);
      }

      printLines(options.json ? formatJson(result.task) : formatTask(result.task));
      return;
    }

    printLines(options.json ? formatJson(task) : formatTasksSubmitted([task]));
    return;
  }

  const response = await options.runSync(options.params);
  printLines(options.json ? formatJson(response) : options.formatSync(response));
}
