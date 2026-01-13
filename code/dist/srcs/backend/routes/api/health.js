"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRoutes = healthRoutes;
async function healthRoutes(fastify) {
    fastify.get('/health', async () => {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        };
    });
}
//# sourceMappingURL=health.js.map