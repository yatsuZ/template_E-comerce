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
const config_js_1 = require("./core/config.js");
dotenv_1.default.config();
exports.PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';
const start = async () => {
    (0, message_js_1.msg_SERV_START)();
    try {
        const fastify = await (0, fastify_js_1.buildFastify)();
        // Graceful shutdown
        const shutdown = async (signal) => {
            logger_js_1.Logger.warn(`Received ${signal}, shutting down...`);
            try {
                await fastify.close();
                logger_js_1.Logger.success('Fastify server closed');
            }
            catch (err) {
                logger_js_1.Logger.error('Error closing Fastify:', err);
            }
            try {
                config_js_1.db.close();
            }
            catch (err) {
                logger_js_1.Logger.error('Error closing database:', err);
            }
            process.exit(0);
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
        process.on('uncaughtException', shutdown);
        process.on('unhandledRejection', shutdown);
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