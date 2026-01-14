import { serve } from '@hono/node-server';
import { app, initiateShutdown } from './server';
import { prisma } from './core/db/prisma';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
  try {
    // db connection
    console.log('connecting to database');
    await prisma.$connect();
    console.log('database connection established');

    console.log(`Starting server on ${HOST}:${PORT}`);
    
    serve({
      fetch: app.fetch,
      port: PORT,
      hostname: HOST,
    }, (info) => {
      console.log(`Api at  http://${HOST}:${info.port}`);
      console.log('Endpoints:');
    });

    // shutdowns
    process.on('SIGTERM', initiateShutdown);
    process.on('SIGINT', initiateShutdown);
    
  } catch (error) {
    console.error('Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
