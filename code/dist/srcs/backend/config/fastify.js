"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildFastify = buildFastify;
const fastify_1 = __importDefault(require("fastify"));
const static_1 = __importDefault(require("@fastify/static"));
const view_1 = __importDefault(require("@fastify/view"));
const ejs_1 = __importDefault(require("ejs"));
const path_1 = __importDefault(require("path"));
const logger_js_1 = require("../utils/logger.js");
const index_js_1 = require("../routes/index.js");
async function buildFastify() {
    const fastify = (0, fastify_1.default)({
        logger: (0, logger_js_1.showLog)(),
    });
    // Templates EJS
    await fastify.register(view_1.default, {
        engine: { ejs: ejs_1.default },
        root: path_1.default.join(process.cwd(), 'srcs/static/views'),
    });
    // CSS (depuis srcs)
    await fastify.register(static_1.default, {
        root: path_1.default.join(process.cwd(), 'srcs/static/css'),
        prefix: '/static/css/',
    });
    // JS compiles (depuis dist)
    await fastify.register(static_1.default, {
        root: path_1.default.join(process.cwd(), 'dist/static/js'),
        prefix: '/static/js/',
        decorateReply: false,
    });
    // Setup des routes
    await (0, index_js_1.setupRoutes)(fastify);
    return fastify;
}
//# sourceMappingURL=fastify.js.map