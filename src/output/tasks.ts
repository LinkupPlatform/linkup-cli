import type { PaginatedTasks, Task, TasksQuota } from 'linkup-sdk';
import { truncate } from '../utils.js';
import { formatFetch } from './fetch.js';
import { formatResearchTask } from './research.js';
import { formatSearch } from './search.js';

const MAX_INPUT_LENGTH = 60;

function formatTaskInput(task: Task): string {
  if (task.type === 'fetch') {
    return task.input.url;
  }
  return task.input.query;
}

function formatIncompleteTask(task: Task): string[] {
  const lines = ['', `Task ${task.id}`, `Type: ${task.type}`, `Status: ${task.status}`];

  if (task.status === 'failed') {
    lines.push('', `Error: ${task.error ?? 'Task failed'}`, '');
    return lines;
  }

  lines.push(
    '',
    'Task is still in progress. Check again later with:',
    `  linkup tasks get ${task.id} --wait`,
    '',
  );
  return lines;
}

// Render a single generic task, including its output when completed.
export function formatTask(task: Task): string[] {
  if (task.status !== 'completed' || !task.output) {
    return formatIncompleteTask(task);
  }

  if (task.type === 'research') {
    return formatResearchTask(task);
  }

  const header = ['', `Task ${task.id}`, `Type: ${task.type}`, `Status: ${task.status}`];
  if (task.type === 'fetch') {
    return [...header, ...formatFetch(task.output)];
  }

  return [...header, ...formatSearch(task.input.outputType, task.output)];
}

// Render the confirmation printed after submitting one or more generic tasks.
export function formatTasksSubmitted(tasks: Task[]): string[] {
  const lines = [''];

  if (tasks.length === 1) {
    const [task] = tasks;
    lines.push(`Task submitted: ${task.id}`, `Type: ${task.type}`, `Status: ${task.status}`, '');
    lines.push(
      'Check the result later with:',
      `  linkup tasks get ${task.id}`,
      `  linkup tasks get ${task.id} --wait`,
      '',
    );
    return lines;
  }

  lines.push(`${tasks.length} tasks submitted:`);
  for (const task of tasks) {
    lines.push(`  ${task.id}  [${task.type}]  ${task.status}`);
  }
  lines.push(
    '',
    'Check a result later with:',
    '  linkup tasks get <id>',
    '  linkup tasks get <id> --wait',
    '',
  );
  return lines;
}

// Render a paginated list of generic tasks as a compact summary.
export function formatTaskList(paginated: PaginatedTasks): string[] {
  const { data, metadata } = paginated;

  if (data.length === 0) {
    return ['', 'No tasks found.', ''];
  }

  const lines = [''];
  for (const task of data) {
    lines.push(
      `${task.id}  [${task.type}]  [${task.status}]  ${task.createdAt}`,
      `  ${truncate(formatTaskInput(task), MAX_INPUT_LENGTH)}`,
      '',
    );
  }

  lines.push(`Page ${metadata.page}/${metadata.totalPages} (${metadata.total} total)`, '');
  return lines;
}

export function formatTasksQuota(quota: TasksQuota): string {
  return `Queue: ${quota.inFlight}/${quota.limit} in flight`;
}
