import type { PaginatedResearchTasks, ResearchTask } from 'linkup-sdk';
import {
  formatResearchList,
  formatResearchSubmitted,
  formatResearchTask,
} from '../output/research';

function baseTask(overrides: Partial<ResearchTask> = {}): ResearchTask {
  return {
    createdAt: '2026-01-01T00:00:00.000Z',
    error: null,
    id: 'task-123',
    input: { outputType: 'sourcedAnswer', query: 'What is X?' },
    output: null,
    status: 'pending',
    type: 'research',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as ResearchTask;
}

describe('formatResearchSubmitted', () => {
  it('prints the task id and follow-up commands', () => {
    const lines = formatResearchSubmitted(baseTask());

    expect(lines).toContain('Research task submitted: task-123');
    expect(lines).toContain('Status: pending');
    expect(lines).toContain('  linkup research get task-123');
    expect(lines).toContain('  linkup research get task-123 --wait');
  });
});

describe('formatResearchTask', () => {
  it('renders a sourced-answer output when completed', () => {
    const lines = formatResearchTask(
      baseTask({
        output: { answer: 'The answer.', sources: [] },
        status: 'completed',
      }),
    );

    expect(lines).toContain('Research task-123');
    expect(lines).toContain('Status: completed');
    expect(lines).toContain('The answer.');
  });

  it('renders structured output as JSON when completed', () => {
    const lines = formatResearchTask(
      baseTask({
        input: {
          outputType: 'structured',
          query: 'q',
          structuredOutputSchema: { type: 'object' },
        },
        output: { summary: 'hi' },
        status: 'completed',
      }),
    );

    expect(lines.join('\n')).toContain('"summary": "hi"');
  });

  it('prints the error message when failed', () => {
    const lines = formatResearchTask(baseTask({ error: 'rate limited', status: 'failed' }));

    expect(lines).toContain('Error: rate limited');
  });

  it('shows an in-progress hint when still running', () => {
    const lines = formatResearchTask(baseTask({ status: 'processing' }));

    expect(lines).toContain('Status: processing');
    expect(lines.join('\n')).toContain('still in progress');
    expect(lines).toContain('  linkup research get task-123 --wait');
  });
});

describe('formatResearchList', () => {
  it('reports when there are no tasks', () => {
    const paginated: PaginatedResearchTasks = {
      data: [],
      metadata: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
    };

    expect(formatResearchList(paginated)).toContain('No research tasks found.');
  });

  it('summarizes tasks and prints pagination info', () => {
    const paginated: PaginatedResearchTasks = {
      data: [baseTask({ id: 'a', status: 'completed' }), baseTask({ id: 'b', status: 'pending' })],
      metadata: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
    };

    const lines = formatResearchList(paginated);

    expect(lines.join('\n')).toContain('a  [completed]');
    expect(lines.join('\n')).toContain('b  [pending]');
    expect(lines).toContain('Page 1/1 (2 total)');
  });

  it('truncates long queries', () => {
    const longQuery = 'x'.repeat(120);
    const paginated: PaginatedResearchTasks = {
      data: [baseTask({ input: { outputType: 'sourcedAnswer', query: longQuery } })],
      metadata: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    };

    const lines = formatResearchList(paginated);
    const queryLine = lines.find(line => line.includes('xxx'));

    expect(queryLine).toBeDefined();
    expect(queryLine?.endsWith('...')).toBe(true);
    expect((queryLine ?? '').length).toBeLessThan(longQuery.length);
  });
});
