import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { HTTPException } from 'hono/http-exception';

import { gamesRouter } from './routes/games';
import { agentsRouter } from './routes/agents';
import { analyticsRouter } from './routes/analytics';
import { roundsRouter } from './routes/rounds';
import { prisma } from './core/db/prisma';

//create app, middleware
const app = new Hono();
app.use('*', logger());
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));
app.use('*', prettyJSON());

// health endpoint
app.get('/health', async (c) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error) {
    return c.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 503);
  }
});

//add routes
app.route('/games', gamesRouter);
app.route('/agents', agentsRouter);
app.route('/rounds', roundsRouter);
app.route('/analytics', analyticsRouter);

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
  
  if (err instanceof HTTPException) {
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

export function initiateShutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('controlled shutdown');
  prisma.$disconnect()
    .then(() => {
      console.log('db connection closed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error during shutdown:', err);
      process.exit(1);
    });
}

export { app };
