import { run } from './cli.js';
import { exitWithError, formatErrorLine } from './output/errors.js';

run(process.argv).catch(error => {
  exitWithError(formatErrorLine(error));
});
