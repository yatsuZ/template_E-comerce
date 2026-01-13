"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupRoutes = setupRoutes;
const health_js_1 = require("./api/health.js");
const env_js_1 = require("./api/env.js");
async function setupRoutes(fastify) {
    // Routes API
    await fastify.register(health_js_1.healthRoutes, { prefix: '/api' });
    await fastify.register(env_js_1.envRoutes, { prefix: '/api' });
    // Route principale
    fastify.get('/', async (request, reply) => {
        return reply.view('index.ejs');
    });
    // 404 handler
    fastify.setNotFoundHandler(async (request, reply) => {
        if (request.url.startsWith('/api/')) {
            return reply.code(404).send({ success: false, error: 'API endpoint not found' });
        }
        return reply.view('index.ejs');
    });
}
//# sourceMappingURL=index.js.map