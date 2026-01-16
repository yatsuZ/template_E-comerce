import chalk from 'chalk';
import { PORT } from '../main.js';

export function msg_SERV_START()
{
  console.log(chalk.magenta('\n========================================'));
  console.log(chalk.magenta('         SERVER STARTING...'));
  console.log(chalk.magenta('========================================\n'));
}

export function msg_SERV_READY()
{
  console.log(chalk.green('\n========================================'));
  console.log(chalk.green('         SERVER READY'));
  console.log(chalk.green('========================================'));
  console.log(chalk.cyan(`\n  Local:   http://localhost:${PORT}`));
  console.log(chalk.cyan(`  API:     http://localhost:${PORT}/api/health\n`));
}
