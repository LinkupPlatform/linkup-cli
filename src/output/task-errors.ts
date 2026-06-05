import { LinkupTaskNotFoundError, LinkupTasksQueueLimitExceededError } from 'linkup-sdk';
import { formatErrorLine } from './errors.js';

export function formatTaskErrorLine(error: unknown, id?: string): string {
  if (error instanceof LinkupTaskNotFoundError) {
    return id ? `Error: Task ${id} not found` : 'Error: Task not found';
  }

  if (error instanceof LinkupTasksQueueLimitExceededError) {
    return 'Error: Tasks queue limit exceeded. Check current queue usage with: linkup tasks list';
  }

  return formatErrorLine(error);
}
