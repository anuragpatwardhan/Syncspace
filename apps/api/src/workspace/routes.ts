import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authGuard } from '../auth/middleware.js';

const createSchema = z.object({ name: z.string().min(1).max(80) });

export async function registerWorkspaceRoutes(app: FastifyInstance) {
  app.get('/workspaces', { preHandler: authGuard }, async (req) => {
    const userId = req.user!.id;
    const memberships = await prisma.membership.findMany({
      where: { userId },
      include: { workspace: { include: { _count: { select: { memberships: true } } } } },
      orderBy: { workspace: { updatedAt: 'desc' } },
    });
    return {
      workspaces: memberships.map((m) => ({
        id: m.workspace.id,
        name: m.workspace.name,
        ownerId: m.workspace.ownerId,
        createdAt: m.workspace.createdAt.toISOString(),
        updatedAt: m.workspace.updatedAt.toISOString(),
        memberCount: m.workspace._count.memberships,
        role: m.role,
      })),
    };
  });

  app.post('/workspaces', { preHandler: authGuard }, async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid name' });
    const userId = req.user!.id;
    const ws = await prisma.workspace.create({
      data: {
        name: parsed.data.name,
        ownerId: userId,
        memberships: { create: { userId, role: 'owner' } },
      },
    });
    return reply.send({ workspace: { id: ws.id, name: ws.name, ownerId: ws.ownerId } });
  });

  app.get('/workspaces/:id', { preHandler: authGuard }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const userId = req.user!.id;
    const m = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: id } },
      include: { workspace: true },
    });
    if (!m) return reply.code(404).send({ error: 'Not found or no access' });
    return { workspace: m.workspace, role: m.role };
  });

  app.delete('/workspaces/:id', { preHandler: authGuard }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const ws = await prisma.workspace.findUnique({ where: { id } });
    if (!ws) return reply.code(404).send({ error: 'Not found' });
    if (ws.ownerId !== req.user!.id) return reply.code(403).send({ error: 'Only owner can delete' });
    await prisma.workspace.delete({ where: { id } });
    return { ok: true };
  });
}
