import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';

interface FakeUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string | null;
  avatarUrl: string | null;
}

const users: FakeUser[] = [];
let nextId = 0;

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: async ({ where }: { where: { email?: string; id?: string } }) => {
        if (where.email) return users.find((u) => u.email === where.email) ?? null;
        if (where.id) return users.find((u) => u.id === where.id) ?? null;
        return null;
      },
      create: async ({
        data,
      }: {
        data: { email: string; name: string; passwordHash: string };
      }) => {
        const user: FakeUser = { id: `user-${++nextId}`, avatarUrl: null, ...data };
        users.push(user);
        return user;
      },
    },
  },
}));

const { registerAuthRoutes } = await import('../routes.js');
const { signToken } = await import('../../lib/jwt.js');

async function buildApp() {
  const app = Fastify();
  await registerAuthRoutes(app);
  return app;
}

beforeEach(() => {
  users.length = 0;
  nextId = 0;
});

describe('POST /auth/signup', () => {
  it('creates a user, hashes the password and returns a token', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: { email: 'ada@example.com', name: 'Ada Lovelace', password: 'password123' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.user).toEqual({ id: 'user-1', email: 'ada@example.com', name: 'Ada Lovelace', avatarUrl: null });
    expect(typeof body.token).toBe('string');
    expect(users[0]!.passwordHash).not.toBe('password123');
  });

  it('rejects an invalid email', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: { email: 'not-an-email', name: 'Ada', password: 'password123' },
    });
    expect(res.statusCode).toBe(400);
    expect(users).toHaveLength(0);
  });

  it('rejects a password shorter than 8 characters', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: { email: 'ada@example.com', name: 'Ada', password: 'short' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects a duplicate email without creating a second user', async () => {
    const app = await buildApp();
    await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: { email: 'ada@example.com', name: 'Ada', password: 'password123' },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: { email: 'ada@example.com', name: 'Someone Else', password: 'password456' },
    });
    expect(res.statusCode).toBe(409);
    expect(users).toHaveLength(1);
  });
});

describe('POST /auth/login', () => {
  async function signup(app: Awaited<ReturnType<typeof buildApp>>) {
    return app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: { email: 'ada@example.com', name: 'Ada Lovelace', password: 'password123' },
    });
  }

  it('logs in with the correct password', async () => {
    const app = await buildApp();
    await signup(app);
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'ada@example.com', password: 'password123' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.email).toBe('ada@example.com');
  });

  it('rejects an unknown email', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'nobody@example.com', password: 'whatever1' },
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: 'Invalid credentials' });
  });

  it('rejects the wrong password', async () => {
    const app = await buildApp();
    await signup(app);
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'ada@example.com', password: 'wrong-password' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects login for a Google-only account with no password hash', async () => {
    users.push({ id: 'user-99', email: 'google@example.com', name: 'Google User', passwordHash: null, avatarUrl: null });
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'google@example.com', password: 'anything1' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /auth/me', () => {
  it('returns the current user for a valid token', async () => {
    users.push({ id: 'user-5', email: 'grace@example.com', name: 'Grace Hopper', passwordHash: 'hash', avatarUrl: 'https://x' });
    const app = await buildApp();
    const token = await signToken({ sub: 'user-5', email: 'grace@example.com', name: 'Grace Hopper' });
    const res = await app.inject({ method: 'GET', url: '/auth/me', headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    expect(res.json().user).toEqual({
      id: 'user-5',
      email: 'grace@example.com',
      name: 'Grace Hopper',
      avatarUrl: 'https://x',
    });
  });

  it('returns a null user when the token references a deleted account', async () => {
    const app = await buildApp();
    const token = await signToken({ sub: 'ghost', email: 'ghost@example.com', name: 'Ghost' });
    const res = await app.inject({ method: 'GET', url: '/auth/me', headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ user: null });
  });

  it('rejects a request with no bearer token', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/auth/me' });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /auth/google/status', () => {
  it('reports disabled when no Google client credentials are configured', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/auth/google/status' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ enabled: false });
  });
});
