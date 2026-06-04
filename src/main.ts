import { run } from './cli';
import { exitWithError, formatErrorLine } from './output/errors';

run(process.argv).catch(error => {
  exitWithError(formatErrorLine(error));
});
