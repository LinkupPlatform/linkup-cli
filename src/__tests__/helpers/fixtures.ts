import type { ResearchTask, Task } from 'linkup-sdk';

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    createdAt: '2026-01-01T00:00:00.000Z',
    error: null,
    id: 'task-1',
    input: { outputType: 'sourcedAnswer', query: 'hello' },
    output: null,
    status: 'pending',
    type: 'search',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as Task;
}

export function makeResearchTask(overrides: Partial<ResearchTask> = {}): ResearchTask {
  return {
    createdAt: '2026-01-01T00:00:00.000Z',
    error: null,
    id: 'research-1',
    input: {
      outputType: 'sourcedAnswer',
      query: 'market outlook',
      reasoningDepth: 'L',
    },
    output: null,
    status: 'pending',
    type: 'research',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as ResearchTask;
}
