"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_server_1 = require("@hono/node-server");
const server_1 = require("./server");
const prisma_1 = require("./core/db/prisma");
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
async function main() {
    try {
        // db connection
        console.log('connecting to database');
        await prisma_1.prisma.$connect();
        console.log('database connection established');
        console.log(`Starting server on ${HOST}:${PORT}`);
        (0, node_server_1.serve)({
            fetch: server_1.app.fetch,
            port: PORT,
            hostname: HOST,
        }, (info) => {
            console.log(`Api at  http://${HOST}:${info.port}`);
            console.log('Endpoints:');
        });
        // shutdowns
        process.on('SIGTERM', server_1.initiateShutdown);
        process.on('SIGINT', server_1.initiateShutdown);
    }
    catch (error) {
        console.error('Failed to start server:', error);
        await prisma_1.prisma.$disconnect();
        process.exit(1);
    }
}
main();
