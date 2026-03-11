"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
exports.initiateShutdown = initiateShutdown;
const hono_1 = require("hono");
const cors_1 = require("hono/cors");
const logger_1 = require("hono/logger");
const pretty_json_1 = require("hono/pretty-json");
const http_exception_1 = require("hono/http-exception");
const games_1 = require("./routes/games");
const agents_1 = require("./routes/agents");
const analytics_1 = require("./routes/analytics");
const rounds_1 = require("./routes/rounds");
const prisma_1 = require("./core/db/prisma");
//create app, middleware
const app = new hono_1.Hono();
exports.app = app;
app.use('*', (0, logger_1.logger)());
app.use('*', (0, cors_1.cors)({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
}));
app.use('*', (0, pretty_json_1.prettyJSON)());
// health endpoint
app.get('/health', async (c) => {
    try {
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        return c.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: 'connected',
        });
    }
    catch (error) {
        return c.json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: error instanceof Error ? error.message : 'Unknown error',
        }, 503);
    }
});
//add routes
app.route('/games', games_1.gamesRouter);
app.route('/agents', agents_1.agentsRouter);
app.route('/rounds', rounds_1.roundsRouter);
app.route('/analytics', analytics_1.analyticsRouter);
// root
app.get('/', (c) => {
    return c.json({
        name: 'El farol API',
        version: '0.1.0',
        endpoints: {
            health: '/health',
            games: '/games',
            agents: '/agents',
            rounds: '/rounds',
            analytics: '/analytics',
        },
    });
});
// Error handling middleware
app.onError((err, c) => {
    console.error(`[Error] ${err.message}`, err.stack);
    if (err instanceof http_exception_1.HTTPException) {
        return c.json({
            error: err.message,
            status: err.status,
        }, err.status);
    }
    return c.json({
        error: 'Internal Server Error',
        message: err.message,
        status: 500,
    }, 500);
});
app.notFound((c) => {
    return c.json({
        error: 'Not Found',
        message: `Route ${c.req.path} not found`,
        status: 404,
    }, 404);
});
let isShuttingDown = false;
function initiateShutdown() {
    if (isShuttingDown)
        return;
    isShuttingDown = true;
    console.log('controlled shutdown');
    prisma_1.prisma.$disconnect()
        .then(() => {
        console.log('db connection closed');
        process.exit(0);
    })
        .catch((err) => {
        console.error('Error during shutdown:', err);
        process.exit(1);
    });
}
