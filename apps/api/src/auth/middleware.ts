import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyToken } from '../lib/jwt.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: { id: string; email: string; name: string };
  }
}

export async function authGuard(req: FastifyRequest, reply: FastifyReply) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return reply.code(401).send({ error: 'Unauthorized' });
  try {
    const payload = await verifyToken(token);
    req.user = { id: payload.sub, email: payload.email, name: payload.name };
  } catch {
    return reply.code(401).send({ error: 'Invalid token' });
  }
}
