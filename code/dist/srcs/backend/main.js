"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const dotenv_1 = __importDefault(require("dotenv"));
const fastify_js_1 = require("./config/fastify.js");
const logger_js_1 = require("./utils/logger.js");
dotenv_1.default.config();
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';
const start = async () => {
    console.log(chalk_1.default.magenta('\n========================================'));
    console.log(chalk_1.default.magenta('         SERVER STARTING...'));
    console.log(chalk_1.default.magenta('========================================\n'));
    try {
        const fastify = await (0, fastify_js_1.buildFastify)();
        await fastify.listen({ port: PORT, host: HOST });
        console.log(chalk_1.default.green('\n========================================'));
        console.log(chalk_1.default.green('         SERVER READY'));
        console.log(chalk_1.default.green('========================================'));
        console.log(chalk_1.default.cyan(`\n  Local:   http://localhost:${PORT}`));
        console.log(chalk_1.default.cyan(`  API:     http://localhost:${PORT}/api/health\n`));
        logger_js_1.Logger.success('Fastify server running');
    }
    catch (err) {
        logger_js_1.Logger.error('Failed to start server:', err);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=main.js.map