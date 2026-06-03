import { InvalidArgumentError } from 'commander';

export function parseDomainList(value: string, previous: string[] = []): string[] {
  const domains = value
    .split(',')
    .map(domain => domain.trim())
    .filter(Boolean);

  if (domains.length === 0) {
    throw new InvalidArgumentError('must include at least one domain');
  }

  return [...previous, ...domains];
}

export function parseDateOption(optionName: string): (value: string) => Date {
  return (value: string): Date => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new InvalidArgumentError(`${optionName} must be a valid date`);
    }

    return date;
  };
}

export function parsePositiveInt(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new InvalidArgumentError('must be a positive integer');
  }
  return parsed;
}
