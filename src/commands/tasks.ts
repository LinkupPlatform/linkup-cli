import { readFileSync } from 'node:fs';
import { Command, InvalidArgumentError, Option } from 'commander';
import type {
  ListTasksParams,
  SortDirection,
  Task,
  TaskRequest,
  TaskSortBy,
  TaskStatus,
  TaskType,
} from 'linkup-sdk';
import { resolveGlobals } from '../client';
import { exitWithError, printLines } from '../output/errors';
import { formatJson } from '../output/json';
import { formatTaskErrorLine } from '../output/task-errors';
import {
  formatTask,
  formatTaskList,
  formatTasksQuota,
  formatTasksSubmitted,
} from '../output/tasks';
import { isRecord, readStdin } from '../utils';
import {
  createPollIntervalOption,
  createTimeoutOption,
  type PollTaskResult,
  printTimeoutHint,
  waitForTask,
} from './async-task';
import { parsePositiveInt } from './option-parsers';
import { SORT_BY_CHOICES, SORT_DIRECTION_CHOICES } from './research';
import { buildPaginationSortParams } from './shared-params';

const TASK_STATUS_CHOICES: TaskStatus[] = ['pending', 'processing', 'completed', 'failed'];
const TASK_TYPE_CHOICES: TaskType[] = ['search', 'fetch', 'research'];

type TaskCreateCommandOptions = {
  file?: string;
  wait?: boolean;
  pollInterval: number;
  timeout: number;
};

type TaskGetCommandOptions = {
  wait?: boolean;
  pollInterval: number;
  timeout: number;
};

type TaskListCliOptions = {
  page?: number;
  pageSize?: number;
  sortBy?: TaskSortBy;
  sortDirection?: SortDirection;
  status?: TaskStatus[];
  type?: TaskType[];
};

type TaskListCommandOptions = TaskListCliOptions;

function parseChoiceList<TChoice extends string>(
  value: string,
  choices: readonly TChoice[],
  label: string,
): TChoice[] {
  const values = value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

  if (values.length === 0) {
    throw new InvalidArgumentError(`must include at least one ${label}`);
  }

  const invalid = values.find(item => !choices.includes(item as TChoice));
  if (invalid) {
    throw new InvalidArgumentError(
      `invalid ${label} "${invalid}" (choices: ${choices.join(', ')})`,
    );
  }

  return values as TChoice[];
}

export function parseTaskStatusList(value: string): TaskStatus[] {
  return parseChoiceList(value, TASK_STATUS_CHOICES, 'status');
}

export function parseTaskTypeList(value: string): TaskType[] {
  return parseChoiceList(value, TASK_TYPE_CHOICES, 'type');
}

export function parseTaskRequests(raw: string): TaskRequest[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not parse tasks JSON: ${message}`);
  }

  const requests = Array.isArray(parsed) ? parsed : [parsed];
  if (requests.length === 0) {
    throw new Error('Tasks JSON must include at least one task request');
  }

  for (const request of requests) {
    if (!isRecord(request)) {
      throw new Error('Each task request must be an object');
    }
    if (!TASK_TYPE_CHOICES.includes(request.type as TaskType)) {
      throw new Error('Each task request must have type "search", "fetch", or "research"');
    }
    if (!isRecord(request.input)) {
      throw new Error('Each task request must include an input object');
    }
  }

  return requests as TaskRequest[];
}

export function buildListTasksParams(opts: TaskListCliOptions): ListTasksParams {
  return {
    ...buildPaginationSortParams(opts),
    ...(opts.status && { status: opts.status }),
    ...(opts.type && { type: opts.type }),
  };
}

async function readTaskRequests(options: TaskCreateCommandOptions): Promise<TaskRequest[]> {
  let raw: string;

  if (options.file) {
    try {
      raw = readFileSync(options.file, 'utf8');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Could not read tasks file: ${message}`);
    }
  } else if (!process.stdin.isTTY) {
    raw = await readStdin();
  } else {
    throw new Error('No tasks provided. Pass --file <path> or pipe JSON to stdin.');
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('Tasks JSON is empty');
  }
  return parseTaskRequests(trimmed);
}

async function waitForGenericTask(
  id: string,
  options: TaskCreateCommandOptions | TaskGetCommandOptions,
  getTask: (id: string) => Promise<Task>,
  json: boolean,
): Promise<PollTaskResult<Task>> {
  return waitForTask({
    getTask,
    id,
    json,
    label: 'Waiting for task...',
    pollIntervalSeconds: options.pollInterval,
    timeoutSeconds: options.timeout,
  });
}

function printGenericTaskResult(result: PollTaskResult<Task>, json: boolean): void {
  if (result.status === 'timeout') {
    printTimeoutHint('task', result.task.id);
  }

  const lines = json ? formatJson(result.task) : formatTask(result.task);
  printLines(lines);
}

async function runTasksCreate(options: TaskCreateCommandOptions, command: Command): Promise<void> {
  const { client, json } = resolveGlobals(command);

  try {
    const requests = await readTaskRequests(options);
    const tasks = await client.createTasks(requests);

    if (options.wait) {
      const results = [];
      for (const task of tasks) {
        results.push(await waitForGenericTask(task.id, options, id => client.getTask(id), json));
      }

      if (json) {
        printLines(formatJson(results.map(result => result.task)));
        return;
      }

      for (const result of results) {
        printGenericTaskResult(result, json);
      }
      return;
    }

    const lines = json ? formatJson(tasks) : formatTasksSubmitted(tasks);
    printLines(lines);
  } catch (error) {
    exitWithError(formatTaskErrorLine(error));
  }
}

async function runTasksGet(
  id: string,
  options: TaskGetCommandOptions,
  command: Command,
): Promise<void> {
  const { client, json } = resolveGlobals(command);

  try {
    if (options.wait) {
      const result = await waitForGenericTask(id, options, taskId => client.getTask(taskId), json);
      printGenericTaskResult(result, json);
      return;
    }

    const task = await client.getTask(id);
    const lines = json ? formatJson(task) : formatTask(task);
    printLines(lines);
  } catch (error) {
    exitWithError(formatTaskErrorLine(error, id));
  }
}

async function runTasksList(options: TaskListCommandOptions, command: Command): Promise<void> {
  const { client, json } = resolveGlobals(command);

  try {
    const result = await client.listTasks(buildListTasksParams(options));
    if (!json) {
      console.error(formatTasksQuota(result.quota));
    }

    const lines = json ? formatJson(result) : formatTaskList(result);
    printLines(lines);
  } catch (error) {
    exitWithError(formatTaskErrorLine(error));
  }
}

export function registerTasksCommand(program: Command): void {
  const tasks = program.command('tasks').alias('t').description('Manage asynchronous tasks');

  tasks
    .command('create')
    .description('Create one or more asynchronous tasks from JSON')
    .option('-f, --file <path>', 'Read task requests from a JSON file')
    .option('-w, --wait', 'Wait for submitted tasks to complete and print the results')
    .addOption(createPollIntervalOption())
    .addOption(createTimeoutOption())
    .addHelpText(
      'after',
      `
Examples:
  linkup tasks create --file tasks.json
  cat tasks.json | linkup tasks create
  linkup tasks create --file tasks.json --wait
`,
    )
    .action(runTasksCreate);

  tasks
    .command('get')
    .description('Fetch a task by id')
    .argument('<id>', 'Task id')
    .option('-w, --wait', 'Poll until the task completes')
    .addOption(createPollIntervalOption())
    .addOption(createTimeoutOption())
    .action(runTasksGet);

  tasks
    .command('list')
    .description('List recent tasks')
    .option('--page <number>', 'Page number', parsePositiveInt)
    .option('--page-size <number>', 'Results per page', parsePositiveInt)
    .option('--status <statuses>', 'Comma-separated statuses to include', parseTaskStatusList)
    .option('--type <types>', 'Comma-separated task types to include', parseTaskTypeList)
    .addOption(new Option('--sort-by <field>', 'Sort field').choices(SORT_BY_CHOICES))
    .addOption(
      new Option('--sort-direction <direction>', 'Sort direction').choices(SORT_DIRECTION_CHOICES),
    )
    .action(runTasksList);
}
