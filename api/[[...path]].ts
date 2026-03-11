import { Hono } from 'hono';
import { app as backendApp } from '../apps/backend/lib/server.js';

const app = new Hono().route('/api', backendApp);
export default app;
