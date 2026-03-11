import { Hono } from 'hono';
// @ts-expect-error - backend compiles to CJS, no .d.ts emitted
import { app as backendApp } from '../apps/backend/lib/server.js';

const app = new Hono().route('/api', backendApp);
export default app;
