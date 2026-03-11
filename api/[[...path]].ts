import { Hono } from 'hono';
import { app as backendApp } from '../apps/backend/src/server';

const app = new Hono().route('/api', backendApp);
export default app;
