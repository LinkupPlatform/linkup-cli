import type { PaginatedTasks, Task } from 'linkup-sdk';
import {
  formatTask,
  formatTaskList,
  formatTasksQuota,
  formatTasksSubmitted,
} from '../output/tasks.js';

function searchTask(overrides: Partial<Task> = {}): Task {
  return {
    createdAt: '2026-01-01T00:00:00.000Z',
    error: null,
    id: 'task-search',
    input: { depth: 'standard', outputType: 'sourcedAnswer', query: 'What is X?' },
    output: null,
    status: 'pending',
    type: 'search',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as Task;
}

function fetchTask(overrides: Partial<Task> = {}): Task {
  return {
    createdAt: '2026-01-01T00:00:00.000Z',
    error: null,
    id: 'task-fetch',
    input: { url: 'https://example.com' },
    output: null,
    status: 'pending',
    type: 'fetch',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as Task;
}

describe('formatTasksSubmitted', () => {
  it('prints a single task id and follow-up commands', () => {
    const lines = formatTasksSubmitted([searchTask()]);

    expect(lines).toContain('Task submitted: task-search');
    expect(lines).toContain('Type: search');
    expect(lines).toContain('  linkup tasks get task-search');
    expect(lines).toContain('  linkup tasks get task-search --wait');
  });

  it('summarizes multiple task ids', () => {
    const lines = formatTasksSubmitted([searchTask(), fetchTask()]);

    expect(lines).toContain('2 tasks submitted:');
    expect(lines.join('\n')).toContain('task-search  [search]  pending');
    expect(lines.join('\n')).toContain('task-fetch  [fetch]  pending');
  });
});

describe('formatTask', () => {
  it('renders completed search output', () => {
    const lines = formatTask(
      searchTask({
        output: { answer: 'The answer.', sources: [] },
        status: 'completed',
      }),
    );

    expect(lines).toContain('Task task-search');
    expect(lines).toContain('Type: search');
    expect(lines).toContain('The answer.');
  });

  it('renders completed fetch output', () => {
    const lines = formatTask(
      fetchTask({
        output: { markdown: '# Title' },
        status: 'completed',
      }),
    );

    expect(lines).toContain('Task task-fetch');
    expect(lines).toContain('Type: fetch');
    expect(lines).toContain('# Title');
  });

  it('prints the error message when failed', () => {
    const lines = formatTask(searchTask({ error: 'rate limited', status: 'failed' }));

    expect(lines).toContain('Error: rate limited');
  });

  it('shows an in-progress hint when still running', () => {
    const lines = formatTask(searchTask({ status: 'processing' }));

    expect(lines).toContain('Status: processing');
    expect(lines.join('\n')).toContain('still in progress');
    expect(lines).toContain('  linkup tasks get task-search --wait');
  });
});

describe('formatTaskList', () => {
  it('reports when there are no tasks', () => {
    const paginated: PaginatedTasks = {
      data: [],
      metadata: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      quota: { inFlight: 0, limit: 10 },
    };

    expect(formatTaskList(paginated)).toContain('No tasks found.');
  });

  it('summarizes tasks and prints pagination info', () => {
    const paginated: PaginatedTasks = {
      data: [searchTask({ id: 'a', status: 'completed' }), fetchTask({ id: 'b' })],
      metadata: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
      quota: { inFlight: 1, limit: 10 },
    };

    const lines = formatTaskList(paginated);

    expect(lines.join('\n')).toContain('a  [search]  [completed]');
    expect(lines.join('\n')).toContain('b  [fetch]  [pending]');
    expect(lines).toContain('Page 1/1 (2 total)');
  });
});

describe('formatTasksQuota', () => {
  it('prints queue usage', () => {
    expect(formatTasksQuota({ inFlight: 3, limit: 10 })).toBe('Queue: 3/10 in flight');
  });
});
