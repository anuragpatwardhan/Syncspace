import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { env } from './lib/env.js';
import { registerAuthRoutes } from './auth/routes.js';
import { registerWorkspaceRoutes } from './workspace/routes.js';
import { attachWsGateway } from './ws/gateway.js';
import { getRedis } from './lib/redis.js';

export async function buildServer() {
  const app = Fastify({ logger: { level: env.NODE_ENV === 'development' ? 'info' : 'warn' } });

  await app.register(cors, {
    origin: [env.WEB_ORIGIN],
    credentials: true,
  });
  await app.register(cookie);

  app.get('/health', async () => ({ ok: true, ts: Date.now() }));

  await registerAuthRoutes(app);
  await registerWorkspaceRoutes(app);

  // warm redis (non-blocking)
  getRedis();

  return app;
}

export async function startServer() {
  const app = await buildServer();
  await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
  attachWsGateway(app.server);
  console.log(`\n  ✦ SyncSpace API ready  →  http://localhost:${env.API_PORT}`);
  console.log(`  ✦ WebSocket gateway    →  ws://localhost:${env.API_PORT}/ws\n`);
}
