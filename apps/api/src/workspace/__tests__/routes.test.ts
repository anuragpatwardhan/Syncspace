import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';

interface FakeWorkspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}
interface FakeMembership {
  id: string;
  userId: string;
  workspaceId: string;
  role: string;
}

const workspaces: FakeWorkspace[] = [];
const memberships: FakeMembership[] = [];
let nextId = 0;

function withCount(workspaceId: string) {
  const ws = workspaces.find((w) => w.id === workspaceId)!;
  return { ...ws, _count: { memberships: memberships.filter((m) => m.workspaceId === workspaceId).length } };
}

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    membership: {
      findMany: async ({ where }: { where: { userId: string } }) =>
        memberships
          .filter((m) => m.userId === where.userId)
          .map((m) => ({ ...m, workspace: withCount(m.workspaceId) }))
          .sort((a, b) => b.workspace.updatedAt.getTime() - a.workspace.updatedAt.getTime()),
      findUnique: async ({
        where,
      }: {
        where: { userId_workspaceId: { userId: string; workspaceId: string } };
      }) => {
        const { userId, workspaceId } = where.userId_workspaceId;
        const m = memberships.find((x) => x.userId === userId && x.workspaceId === workspaceId);
        if (!m) return null;
        return { ...m, workspace: workspaces.find((w) => w.id === workspaceId) };
      },
    },
    workspace: {
      create: async ({
        data,
      }: {
        data: { name: string; ownerId: string; memberships: { create: { userId: string; role: string } } };
      }) => {
        const ws: FakeWorkspace = {
          id: `ws-${++nextId}`,
          name: data.name,
          ownerId: data.ownerId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        workspaces.push(ws);
        memberships.push({
          id: `mem-${nextId}`,
          userId: data.memberships.create.userId,
          workspaceId: ws.id,
          role: data.memberships.create.role,
        });
        return ws;
      },
      findUnique: async ({ where }: { where: { id: string } }) => workspaces.find((w) => w.id === where.id) ?? null,
      delete: async ({ where }: { where: { id: string } }) => {
        const idx = workspaces.findIndex((w) => w.id === where.id);
        const [removed] = workspaces.splice(idx, 1);
        return removed;
      },
    },
  },
}));

const { registerWorkspaceRoutes } = await import('../routes.js');
const { signToken } = await import('../../lib/jwt.js');

async function buildApp() {
  const app = Fastify();
  await registerWorkspaceRoutes(app);
  return app;
}

async function authHeader(userId: string) {
  const token = await signToken({ sub: userId, email: `${userId}@example.com`, name: userId });
  return { authorization: `Bearer ${token}` };
}

beforeEach(() => {
  workspaces.length = 0;
  memberships.length = 0;
  nextId = 0;
});

describe('POST /workspaces', () => {
  it('creates a workspace and makes the creator its owner', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/workspaces',
      headers: await authHeader('user-1'),
      payload: { name: 'Design Team' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().workspace).toEqual({ id: 'ws-1', name: 'Design Team', ownerId: 'user-1' });
    expect(memberships).toEqual([{ id: 'mem-1', userId: 'user-1', workspaceId: 'ws-1', role: 'owner' }]);
  });

  it('rejects an empty name without creating a workspace', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/workspaces',
      headers: await authHeader('user-1'),
      payload: { name: '' },
    });
    expect(res.statusCode).toBe(400);
    expect(workspaces).toHaveLength(0);
  });

  it('requires authentication', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/workspaces', payload: { name: 'X' } });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /workspaces', () => {
  it('lists only workspaces the user belongs to, most recently updated first', async () => {
    const app = await buildApp();
    await app.inject({ method: 'POST', url: '/workspaces', headers: await authHeader('user-1'), payload: { name: 'First' } });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await app.inject({ method: 'POST', url: '/workspaces', headers: await authHeader('user-1'), payload: { name: 'Second' } });
    await app.inject({ method: 'POST', url: '/workspaces', headers: await authHeader('user-2'), payload: { name: 'Not mine' } });

    const res = await app.inject({ method: 'GET', url: '/workspaces', headers: await authHeader('user-1') });
    expect(res.statusCode).toBe(200);
    const names = res.json().workspaces.map((w: { name: string }) => w.name);
    expect(names).toEqual(['Second', 'First']);
  });

  it('reports the member count for each workspace', async () => {
    const app = await buildApp();
    await app.inject({ method: 'POST', url: '/workspaces', headers: await authHeader('user-1'), payload: { name: 'Shared' } });
    memberships.push({ id: 'mem-extra', userId: 'user-2', workspaceId: 'ws-1', role: 'editor' });

    const res = await app.inject({ method: 'GET', url: '/workspaces', headers: await authHeader('user-1') });
    expect(res.json().workspaces[0].memberCount).toBe(2);
  });
});

describe('GET /workspaces/:id', () => {
  it('returns the workspace and role for a member', async () => {
    const app = await buildApp();
    await app.inject({ method: 'POST', url: '/workspaces', headers: await authHeader('user-1'), payload: { name: 'Design' } });
    const res = await app.inject({ method: 'GET', url: '/workspaces/ws-1', headers: await authHeader('user-1') });
    expect(res.statusCode).toBe(200);
    expect(res.json().role).toBe('owner');
  });

  it('returns 404 for a workspace the user does not belong to', async () => {
    const app = await buildApp();
    await app.inject({ method: 'POST', url: '/workspaces', headers: await authHeader('user-1'), payload: { name: 'Design' } });
    const res = await app.inject({ method: 'GET', url: '/workspaces/ws-1', headers: await authHeader('user-2') });
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 for a workspace id that does not exist', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/workspaces/nope', headers: await authHeader('user-1') });
    expect(res.statusCode).toBe(404);
  });
});

describe('DELETE /workspaces/:id', () => {
  it('lets the owner delete the workspace', async () => {
    const app = await buildApp();
    await app.inject({ method: 'POST', url: '/workspaces', headers: await authHeader('user-1'), payload: { name: 'Design' } });
    const res = await app.inject({ method: 'DELETE', url: '/workspaces/ws-1', headers: await authHeader('user-1') });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(workspaces).toHaveLength(0);
  });

  it('refuses deletion by a non-owner', async () => {
    const app = await buildApp();
    await app.inject({ method: 'POST', url: '/workspaces', headers: await authHeader('user-1'), payload: { name: 'Design' } });
    const res = await app.inject({ method: 'DELETE', url: '/workspaces/ws-1', headers: await authHeader('user-2') });
    expect(res.statusCode).toBe(403);
    expect(workspaces).toHaveLength(1);
  });

  it('returns 404 deleting a workspace that does not exist', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'DELETE', url: '/workspaces/nope', headers: await authHeader('user-1') });
    expect(res.statusCode).toBe(404);
  });
});
