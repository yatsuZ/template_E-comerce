"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PORT = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const fastify_js_1 = require("./config/fastify.js");
const logger_js_1 = require("./utils/logger.js");
const message_js_1 = require("./utils/message.js");
const shutdown_js_1 = require("./utils/shutdown.js");
dotenv_1.default.config();
exports.PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';
const start = async () => {
    (0, message_js_1.msg_SERV_START)();
    try {
        const fastify = await (0, fastify_js_1.buildFastify)();
        // Graceful shutdown
        process.on('SIGINT', () => (0, shutdown_js_1.shutdown)(fastify, 'SIGINT'));
        process.on('SIGTERM', () => (0, shutdown_js_1.shutdown)(fastify, 'SIGTERM'));
        process.on('uncaughtException', (err) => (0, shutdown_js_1.shutdown)(fastify, 'uncaughtException', err));
        process.on('unhandledRejection', (reason) => (0, shutdown_js_1.shutdown)(fastify, 'unhandledRejection', reason));
        await fastify.listen({ port: exports.PORT, host: HOST });
        (0, message_js_1.msg_SERV_READY)();
        logger_js_1.Logger.success('Fastify server running');
    }
    catch (err) {
        logger_js_1.Logger.error('Failed to start server:', err);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=main.js.map