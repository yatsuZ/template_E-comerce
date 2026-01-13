"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.envRoutes = envRoutes;
const logger_js_1 = require("../../utils/logger.js");
async function envRoutes(fastify) {
    fastify.get('/env', async () => {
        const envVars = {
            NODE_ENV: process.env.NODE_ENV,
            PORT: process.env.PORT,
            TEST: process.env.TEST,
            // Ajoute ici les variables que tu veux exposer
        };
        logger_js_1.Logger.info('Variables d\'environnement:');
        console.log(envVars);
        return {
            status: 'ok',
            env: envVars,
        };
    });
}
//# sourceMappingURL=env.js.map