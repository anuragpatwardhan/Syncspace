import { SignJWT, jwtVerify } from 'jose';
import { env } from './env.js';

const secret = new TextEncoder().encode(env.JWT_SECRET);

export async function signToken(payload: { sub: string; email: string; name: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .setIssuer('syncspace')
    .sign(secret);
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, secret, { issuer: 'syncspace' });
  return payload as { sub: string; email: string; name: string };
}
