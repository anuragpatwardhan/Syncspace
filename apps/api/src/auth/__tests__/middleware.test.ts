import { describe, expect, it } from 'vitest';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { signToken } from '../../lib/jwt.js';
import { authGuard } from '../middleware.js';

const claims = { sub: 'user-1', email: 'ada@example.com', name: 'Ada Lovelace' };

/** Minimal stand-ins for the parts of Fastify's request/reply the guard touches. */
function harness(authorization?: string) {
  const req = { headers: authorization ? { authorization } : {} } as FastifyRequest;
  const sent: { code?: number; body?: unknown } = {};
  const reply = {
    code(status: number) {
      sent.code = status;
      return this;
    },
    send(body: unknown) {
      sent.body = body;
      return this;
    },
  } as unknown as FastifyReply;
  return { req, reply, sent };
}

describe('authGuard', () => {
  it('attaches the user for a valid bearer token', async () => {
    const { req, reply, sent } = harness(`Bearer ${await signToken(claims)}`);
    await authGuard(req, reply);
    expect(req.user).toEqual({ id: 'user-1', email: claims.email, name: claims.name });
    expect(sent.code).toBeUndefined();
  });

  it('rejects a request with no authorization header', async () => {
    const { req, reply, sent } = harness();
    await authGuard(req, reply);
    expect(sent.code).toBe(401);
    expect(sent.body).toEqual({ error: 'Unauthorized' });
    expect(req.user).toBeUndefined();
  });

  it('rejects a header that omits the Bearer prefix', async () => {
    const { req, reply, sent } = harness(await signToken(claims));
    await authGuard(req, reply);
    expect(sent.code).toBe(401);
    expect(sent.body).toEqual({ error: 'Unauthorized' });
  });

  it('is case-sensitive about the Bearer prefix', async () => {
    const { req, reply, sent } = harness(`bearer ${await signToken(claims)}`);
    await authGuard(req, reply);
    expect(sent.code).toBe(401);
  });

  it('distinguishes a malformed token from a missing one', async () => {
    const { req, reply, sent } = harness('Bearer not-a-real-token');
    await authGuard(req, reply);
    expect(sent.code).toBe(401);
    expect(sent.body).toEqual({ error: 'Invalid token' });
  });

  it('rejects a tampered token rather than trusting its claims', async () => {
    const [header, , signature] = (await signToken(claims)).split('.');
    const forged = Buffer.from(JSON.stringify({ ...claims, sub: 'admin' })).toString('base64url');
    const { req, reply, sent } = harness(`Bearer ${header}.${forged}.${signature}`);
    await authGuard(req, reply);
    expect(sent.body).toEqual({ error: 'Invalid token' });
    expect(req.user).toBeUndefined();
  });
});
