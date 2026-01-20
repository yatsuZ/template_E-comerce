import chalk from 'chalk';

type LogLevel = 'debug' | 'info' | 'success' | 'warn' | 'error';
type EnvLevel = 'debug' | 'development' | 'production' | 'test';

const LEVELS: Record<LogLevel, number> = {
  info: 0,
  debug: 1,
  success: 1,
  warn: 2,
  error: 3,
};

const ENV_LEVEL: Record<EnvLevel, number> = {
  development: 0,
  debug: 1,
  production: 2,
  test: 3,
};

let ENV: EnvLevel = (process.env.NODE_ENV as EnvLevel) || 'development';

export function updateENV(newEnv: EnvLevel) {
  ENV = newEnv;
}

export function getENV() : string {
  return ENV;
}

function getCurrentLevel() {
  return ENV_LEVEL[ENV] ?? 1;
}

function canLog(level: LogLevel) {
  return LEVELS[level] >= getCurrentLevel();
}

const locationColor = chalk.green;

const levelColor: Record<LogLevel, chalk.Chalk> = {
  debug: chalk.yellow,
  info: chalk.blue,
  success: chalk.green,
  warn: chalk.gray,
  error: chalk.red,
};

const methodColor: Record<string, chalk.Chalk> = {
  GET: chalk.green,
  POST: chalk.blue,
  PUT: chalk.yellow,
  DELETE: chalk.red,
  PATCH: chalk.cyan,
};

function format(level: LogLevel, location: string, args: any[]) {
  return [
    levelColor[level](`[${level.toUpperCase()}]`),
    locationColor(`[${location}]`),
    ...args,
  ];
}

export const Logger = {
  debug(location: string, ...args: any[]) {
    if (canLog('debug')) console.log(...format('debug', location, args));
  },

  info(location: string, ...args: any[]) {
    if (canLog('info')) console.log(...format('info', location, args));
  },

  success(location: string, ...args: any[]) {
    if (canLog('success')) console.log(...format('success', location, args));
  },

  warn(location: string, ...args: any[]) {
    if (canLog('warn')) console.warn(...format('warn', location, args));
  },

  error(location: string, ...args: any[]) {
    if (canLog('error')) console.error(...format('error', location, args));
  },

  // route(method: string, path: string) {
  // },
};
