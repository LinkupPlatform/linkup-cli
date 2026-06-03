import { Command, Option } from 'commander';
import type {
  LinkupClient,
  ListResearchParams,
  ResearchMode,
  ResearchParams,
  ResearchReasoningDepth,
  ResearchTask,
  SortDirection,
  TaskSortBy,
} from 'linkup-sdk';
import { resolveGlobals } from '../client';
import { exitWithError, formatErrorLine, printLines } from '../output/errors';
import { formatJson } from '../output/json';
import {
  formatResearchList,
  formatResearchSubmitted,
  formatResearchTask,
} from '../output/research';
import { parseDateOption, parseDomainList, parsePositiveInt } from './option-parsers';
import { queryUsageLines, resolveQueryOrExit } from './query-input';
import {
  buildCommonParams,
  isOptionExplicit,
  loadStructuredSchema,
  SCHEMA_IGNORED_WARNING,
  STRUCTURED_REQUIRES_SCHEMA,
} from './shared-params';

export type ResearchOutputType = 'sourcedAnswer' | 'structured';
export type ResearchCliOutputType = 'sourced-answer' | 'structured';

export const RESEARCH_OUTPUT_CHOICES: ResearchCliOutputType[] = ['sourced-answer', 'structured'];
export const RESEARCH_MODE_CHOICES: ResearchMode[] = ['answer', 'auto', 'investigate', 'research'];
export const REASONING_DEPTH_CHOICES: ResearchReasoningDepth[] = ['S', 'M', 'L', 'XL'];
export const SORT_BY_CHOICES: TaskSortBy[] = ['createdAt', 'updatedAt'];
export const SORT_DIRECTION_CHOICES: SortDirection[] = ['asc', 'desc'];

const OUTPUT_TYPE_MAP: Record<ResearchCliOutputType, ResearchOutputType> = {
  'sourced-answer': 'sourcedAnswer',
  structured: 'structured',
};

const DEFAULT_POLL_INTERVAL_SECONDS = 10;
const DEFAULT_TIMEOUT_SECONDS = 20 * 60;
const DEFAULT_REASONING_DEPTH: ResearchReasoningDepth = 'L';

const pollIntervalOption = new Option(
  '--poll-interval <seconds>',
  'Seconds between status checks when waiting',
)
  .default(DEFAULT_POLL_INTERVAL_SECONDS)
  .argParser((value: string) => parsePositiveInt(value));

const timeoutOption = new Option('--timeout <seconds>', 'Maximum seconds to wait before giving up')
  .default(DEFAULT_TIMEOUT_SECONDS, `${DEFAULT_TIMEOUT_SECONDS} (20 minutes)`)
  .argParser((value: string) => parsePositiveInt(value));

export type ResearchCliOptions = {
  outputType: ResearchOutputType;
  outputTypeExplicit?: boolean;
  schemaFile?: string;
  schema?: string;
  mode?: ResearchMode;
  reasoningDepth?: ResearchReasoningDepth;
  includeDomains?: string[];
  excludeDomains?: string[];
  fromDate?: Date;
  toDate?: Date;
};

export type BuildResearchParamsResult = {
  params: ResearchParams;
  warnings: string[];
};

export type ListResearchCliOptions = {
  page?: number;
  pageSize?: number;
  sortBy?: TaskSortBy;
  sortDirection?: SortDirection;
};

/** Commander-parsed options for the submit action (`--output` maps to outputType). */
type ResearchCommandOptions = {
  output: ResearchCliOutputType;
  schemaFile?: string;
  schema?: string;
  mode?: ResearchMode;
  reasoningDepth?: ResearchReasoningDepth;
  includeDomains?: string[];
  excludeDomains?: string[];
  fromDate?: Date;
  toDate?: Date;
  clipboard?: boolean;
  file?: string;
  wait?: boolean;
  pollInterval: number;
  timeout: number;
};

type ResearchGetCommandOptions = {
  wait?: boolean;
  pollInterval: number;
  timeout: number;
};

type ResearchListCommandOptions = {
  page?: number;
  pageSize?: number;
  sortBy?: TaskSortBy;
  sortDirection?: SortDirection;
};

function buildResearchExtraParams(opts: ResearchCliOptions): Partial<ResearchParams> {
  return {
    ...buildCommonParams(opts),
    ...(opts.mode && { mode: opts.mode }),
    ...(opts.reasoningDepth && { reasoningDepth: opts.reasoningDepth }),
  };
}

export function buildResearchParams(
  query: string,
  opts: ResearchCliOptions,
): BuildResearchParamsResult {
  const warnings: string[] = [];
  const hasSchemaOption = Boolean(opts.schemaFile || opts.schema);
  const outputType = resolveResearchOutputType(opts, hasSchemaOption);

  if (outputType !== 'structured' && hasSchemaOption) {
    warnings.push(SCHEMA_IGNORED_WARNING);
  }

  const extraParams = buildResearchExtraParams(opts);

  if (outputType === 'structured') {
    if (!hasSchemaOption) {
      throw new Error(STRUCTURED_REQUIRES_SCHEMA);
    }
    return {
      params: {
        ...extraParams,
        outputType: 'structured',
        query,
        structuredOutputSchema: loadStructuredSchema(opts),
      },
      warnings,
    };
  }

  return {
    params: {
      ...extraParams,
      outputType: 'sourcedAnswer',
      query,
    },
    warnings,
  };
}

function resolveResearchOutputType(
  opts: ResearchCliOptions,
  hasSchemaOption: boolean,
): ResearchOutputType {
  if (hasSchemaOption && opts.outputType === 'sourcedAnswer' && !opts.outputTypeExplicit) {
    return 'structured';
  }
  return opts.outputType;
}

export function buildListResearchParams(opts: ListResearchCliOptions): ListResearchParams {
  return {
    ...(opts.page !== undefined && { page: opts.page }),
    ...(opts.pageSize !== undefined && { pageSize: opts.pageSize }),
    ...(opts.sortBy && { sortBy: opts.sortBy }),
    ...(opts.sortDirection && { sortDirection: opts.sortDirection }),
  };
}

export type PollResearchStatus = 'completed' | 'failed' | 'timeout';

export type PollResearchOptions = {
  getResearch: (id: string) => Promise<ResearchTask>;
  id: string;
  intervalMs: number;
  timeoutMs: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

export type PollResearchResult = {
  status: PollResearchStatus;
  task: ResearchTask;
};

const defaultSleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Poll a research task until it reaches a terminal state or the timeout elapses.
 * Timers and clock are injectable so the loop can be unit-tested without real delays.
 */
export async function pollResearch(options: PollResearchOptions): Promise<PollResearchResult> {
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? Date.now;
  const start = now();

  let task = await options.getResearch(options.id);

  while (task.status !== 'completed' && task.status !== 'failed') {
    if (now() - start >= options.timeoutMs) {
      return { status: 'timeout', task };
    }
    await sleep(options.intervalMs);
    task = await options.getResearch(options.id);
  }

  return { status: task.status as 'completed' | 'failed', task };
}

function toResearchCliOptions(
  options: ResearchCommandOptions,
  outputTypeExplicit: boolean,
): ResearchCliOptions {
  return {
    excludeDomains: options.excludeDomains,
    fromDate: options.fromDate,
    includeDomains: options.includeDomains,
    mode: options.mode,
    outputType: OUTPUT_TYPE_MAP[options.output],
    outputTypeExplicit,
    reasoningDepth: options.reasoningDepth,
    schema: options.schema,
    schemaFile: options.schemaFile,
    toDate: options.toDate,
  };
}

type WaitForResearchOptions = {
  client: Pick<LinkupClient, 'getResearch'>;
  id: string;
  pollIntervalSeconds: number;
  timeoutSeconds: number;
  json: boolean;
};

function startSpinner(label: string): () => void {
  if (!process.stderr.isTTY) {
    process.stderr.write(`${label}\n`);
    return () => {};
  }

  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let index = 0;
  const timer = setInterval(() => {
    index = (index + 1) % frames.length;
    process.stderr.write(`\r${frames[index]} ${label}`);
  }, 80);

  return () => {
    clearInterval(timer);
    process.stderr.write('\r\u001b[K');
  };
}

async function waitForResearch(options: WaitForResearchOptions): Promise<PollResearchResult> {
  const stopSpinner = options.json ? () => {} : startSpinner('Researching...');
  try {
    return await pollResearch({
      getResearch: id => options.client.getResearch(id),
      id: options.id,
      intervalMs: options.pollIntervalSeconds * 1000,
      timeoutMs: options.timeoutSeconds * 1000,
    });
  } finally {
    stopSpinner();
  }
}

function printTaskResult(result: PollResearchResult, json: boolean): void {
  if (result.status === 'timeout') {
    console.error(
      `Timed out waiting for research ${result.task.id}. It is still running; check again with:`,
    );
    console.error(`  linkup research get ${result.task.id} --wait`);
  }

  const lines = json ? formatJson(result.task) : formatResearchTask(result.task);
  printLines(lines);
}

async function runResearchSubmit(
  queryParts: string[],
  options: ResearchCommandOptions,
  command: Command,
): Promise<void> {
  const { client, json } = resolveGlobals(command);

  const query = await resolveQueryOrExit(
    {
      args: queryParts,
      clipboard: options.clipboard,
      file: options.file,
    },
    queryUsageLines('research', 'your research question', [
      'linkup research "your research question" --wait',
    ]),
  );

  try {
    const cliOptions = toResearchCliOptions(options, isOptionExplicit(command, 'output'));
    const { params, warnings } = buildResearchParams(query, cliOptions);
    for (const warning of warnings) {
      console.error(warning);
    }

    const task = await client.research(params);

    if (options.wait) {
      const result = await waitForResearch({
        client,
        id: task.id,
        json,
        pollIntervalSeconds: options.pollInterval,
        timeoutSeconds: options.timeout,
      });
      printTaskResult(result, json);
      return;
    }

    const lines = json ? formatJson(task) : formatResearchSubmitted(task);
    printLines(lines);
  } catch (error) {
    exitWithError(formatErrorLine(error));
  }
}

async function runResearchGet(
  id: string,
  options: ResearchGetCommandOptions,
  command: Command,
): Promise<void> {
  const { client, json } = resolveGlobals(command);

  try {
    if (options.wait) {
      const result = await waitForResearch({
        client,
        id,
        json,
        pollIntervalSeconds: options.pollInterval,
        timeoutSeconds: options.timeout,
      });
      printTaskResult(result, json);
      return;
    }

    const task = await client.getResearch(id);
    const lines = json ? formatJson(task) : formatResearchTask(task);
    printLines(lines);
  } catch (error) {
    exitWithError(formatErrorLine(error));
  }
}

async function runResearchList(
  options: ResearchListCommandOptions,
  command: Command,
): Promise<void> {
  const { client, json } = resolveGlobals(command);

  try {
    const params = buildListResearchParams({
      page: options.page,
      pageSize: options.pageSize,
      sortBy: options.sortBy,
      sortDirection: options.sortDirection,
    });
    const result = await client.listResearch(params);
    const lines = json ? formatJson(result) : formatResearchList(result);
    printLines(lines);
  } catch (error) {
    exitWithError(formatErrorLine(error));
  }
}

export function registerResearchCommand(program: Command): void {
  const outputOption = new Option('-o, --output <type>', 'Output type')
    .choices(RESEARCH_OUTPUT_CHOICES)
    .default('sourced-answer');
  const modeOption = new Option('-m, --mode <mode>', 'Research mode/effort profile').choices(
    RESEARCH_MODE_CHOICES,
  );
  const reasoningOption = new Option(
    '--reasoning-depth <depth>',
    'Reasoning depth within the selected mode',
  )
    .choices(REASONING_DEPTH_CHOICES)
    .default(DEFAULT_REASONING_DEPTH);

  const research = program
    .command('research')
    .alias('r')
    .description('Run an asynchronous research task')
    .argument('[query...]', 'Research query')
    .addOption(outputOption)
    .option(
      '--schema-file <path>',
      'Path to a JSON schema file (implies --output structured unless --output is set)',
    )
    .option(
      '--schema <json>',
      'Inline JSON schema string (implies --output structured unless --output is set)',
    )
    .addOption(modeOption)
    .addOption(reasoningOption)
    .option('--include-domains <domains>', 'Comma-separated domains to include', parseDomainList)
    .option('--exclude-domains <domains>', 'Comma-separated domains to exclude', parseDomainList)
    .option(
      '--from-date <date>',
      'Only include results published on or after this date',
      parseDateOption('--from-date'),
    )
    .option(
      '--to-date <date>',
      'Only include results published on or before this date',
      parseDateOption('--to-date'),
    )
    .option('-c, --clipboard', 'Read query from clipboard')
    .option('-f, --file <path>', 'Read query from a file')
    .option('-w, --wait', 'Wait for the task to complete and print the result')
    .addOption(pollIntervalOption)
    .addOption(timeoutOption)
    .addHelpText(
      'after',
      `
Examples:
  linkup research "State of the semiconductor market in 2026"
  linkup research "..." --wait
  linkup research "..." --mode investigate --wait
  linkup research "..." --output structured --schema-file schema.json --wait
  linkup research get <id>
  linkup research get <id> --wait --json
  linkup research list --page 1 --page-size 10
`,
    )
    .action(runResearchSubmit);

  research
    .command('get')
    .description('Fetch a research task by id')
    .argument('<id>', 'Research task id')
    .option('-w, --wait', 'Poll until the task completes')
    .addOption(pollIntervalOption)
    .addOption(timeoutOption)
    .action(runResearchGet);

  research
    .command('list')
    .description('List recent research tasks')
    .option('--page <number>', 'Page number', parsePositiveInt)
    .option('--page-size <number>', 'Results per page', parsePositiveInt)
    .addOption(new Option('--sort-by <field>', 'Sort field').choices(SORT_BY_CHOICES))
    .addOption(
      new Option('--sort-direction <direction>', 'Sort direction').choices(SORT_DIRECTION_CHOICES),
    )
    .action(runResearchList);
}
