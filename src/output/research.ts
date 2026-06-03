import type { PaginatedResearchTasks, ResearchTask, SourcedAnswer } from 'linkup-sdk';
import { truncate } from '../utils';
import { formatSourcedAnswer, formatStructured } from './search';

const MAX_QUERY_LENGTH = 60;

/** Render the confirmation printed after submitting a research task (async default). */
export function formatResearchSubmitted(task: ResearchTask): string[] {
  return [
    '',
    `Research task submitted: ${task.id}`,
    `Status: ${task.status}`,
    '',
    'Check the result later with:',
    `  linkup research get ${task.id}`,
    `  linkup research get ${task.id} --wait`,
    '',
  ];
}

/** Render a single research task, including its output when completed. */
export function formatResearchTask(task: ResearchTask): string[] {
  const lines = ['', `Research ${task.id}`, `Status: ${task.status}`];

  if (task.status === 'completed' && task.output) {
    if (task.input.outputType === 'structured') {
      lines.push(...formatStructured(task.output));
    } else {
      lines.push(...formatSourcedAnswer(task.output as SourcedAnswer));
    }
    return lines;
  }

  if (task.status === 'failed') {
    lines.push('', `Error: ${task.error ?? 'Research failed'}`, '');
    return lines;
  }

  lines.push(
    '',
    'Research is still in progress. Check again later with:',
    `  linkup research get ${task.id} --wait`,
    '',
  );
  return lines;
}

/** Render a paginated list of research tasks as a compact summary. */
export function formatResearchList(paginated: PaginatedResearchTasks): string[] {
  const { data, metadata } = paginated;

  if (data.length === 0) {
    return ['', 'No research tasks found.', ''];
  }

  const lines = [''];
  for (const task of data) {
    lines.push(
      `${task.id}  [${task.status}]  ${task.createdAt}`,
      `  ${truncate(task.input.query, MAX_QUERY_LENGTH)}`,
      '',
    );
  }

  lines.push(`Page ${metadata.page}/${metadata.totalPages} (${metadata.total} total)`, '');
  return lines;
}
