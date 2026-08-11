import { describe, expect, it } from 'vitest';
import { signToken, verifyToken } from '../jwt.js';

const claims = { sub: 'user-1', email: 'ada@example.com', name: 'Ada Lovelace' };

describe('signToken / verifyToken', () => {
  it('round-trips the caller claims', async () => {
    const payload = await verifyToken(await signToken(claims));
    expect(payload).toMatchObject(claims);
  });

  it('issues a three-part compact JWS', async () => {
    expect((await signToken(claims)).split('.')).toHaveLength(3);
  });

  it('stamps issued-at, expiry and issuer', async () => {
    const payload = (await verifyToken(await signToken(claims))) as unknown as Record<string, unknown>;
    expect(payload.iat).toBeTypeOf('number');
    expect(payload.iss).toBe('syncspace');
    expect(payload.exp as number).toBeGreaterThan(payload.iat as number);
  });

  it('rejects a token whose payload has been swapped out', async () => {
    const [header, , signature] = (await signToken(claims)).split('.');
    const forged = Buffer.from(JSON.stringify({ ...claims, sub: 'someone-else' })).toString(
      'base64url',
    );
    await expect(verifyToken(`${header}.${forged}.${signature}`)).rejects.toThrow();
  });

  it('rejects a token whose signature does not match', async () => {
    const [header, body] = (await signToken(claims)).split('.');
    await expect(verifyToken(`${header}.${body}.not-a-real-signature`)).rejects.toThrow();
  });

  it('rejects a value that is not a token at all', async () => {
    await expect(verifyToken('nonsense')).rejects.toThrow();
    await expect(verifyToken('')).rejects.toThrow();
  });
});
