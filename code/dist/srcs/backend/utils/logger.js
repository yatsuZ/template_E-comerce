"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
exports.showLog = showLog;
const chalk_1 = __importDefault(require("chalk"));
const isDev = process.env.NODE_ENV !== 'production';
exports.Logger = {
    info: (...args) => {
        if (isDev)
            console.log(chalk_1.default.blue('[INFO]'), ...args);
    },
    success: (...args) => {
        if (isDev)
            console.log(chalk_1.default.green('[OK]'), ...args);
    },
    warn: (...args) => {
        if (isDev)
            console.log(chalk_1.default.yellow('[WARN]'), ...args);
    },
    error: (...args) => {
        console.log(chalk_1.default.red('[ERROR]'), ...args);
    },
    debug: (...args) => {
        if (isDev)
            console.log(chalk_1.default.gray('[DEBUG]'), ...args);
    },
    server: (message) => {
        console.log(chalk_1.default.magenta('[SERVER]'), message);
    },
    route: (method, path) => {
        const methodColor = {
            GET: chalk_1.default.green,
            POST: chalk_1.default.blue,
            PUT: chalk_1.default.yellow,
            DELETE: chalk_1.default.red,
            PATCH: chalk_1.default.cyan,
        }[method] || chalk_1.default.white;
        if (isDev)
            console.log(chalk_1.default.gray('[ROUTE]'), methodColor(method.padEnd(6)), path);
    },
};
function showLog() {
    if (process.env.NODE_ENV === 'production')
        return false;
    return {
        level: 'info',
        transport: {
            target: 'pino-pretty',
            options: { colorize: true }
        }
    };
}
//# sourceMappingURL=logger.js.map