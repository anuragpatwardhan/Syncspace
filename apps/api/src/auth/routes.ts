import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { signToken } from '../lib/jwt.js';
import { authGuard } from './middleware.js';
import { registerGoogleRoutes } from './google.js';

const signupSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(80),
  password: z.string().min(8).max(200),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post('/auth/signup', async (req, reply) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input', issues: parsed.error.issues });
    const { email, name, password } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return reply.code(409).send({ error: 'Email already registered' });
    const user = await prisma.user.create({
      data: { email, name, passwordHash: await hashPassword(password) },
    });
    const token = await signToken({ sub: user.id, email: user.email, name: user.name });
    return reply.send({
      token,
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
    });
  });

  app.post('/auth/login', async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input' });
    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) return reply.code(401).send({ error: 'Invalid credentials' });
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return reply.code(401).send({ error: 'Invalid credentials' });
    const token = await signToken({ sub: user.id, email: user.email, name: user.name });
    return reply.send({
      token,
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
    });
  });

  app.get('/auth/me', { preHandler: authGuard }, async (req) => {
    const u = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!u) return { user: null };
    return { user: { id: u.id, email: u.email, name: u.name, avatarUrl: u.avatarUrl } };
  });

  await registerGoogleRoutes(app);
}
