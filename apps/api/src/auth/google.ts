import type { FastifyInstance } from 'fastify';
import { env, googleEnabled } from '../lib/env.js';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

export async function registerGoogleRoutes(app: FastifyInstance) {
  app.get('/auth/google/status', async () => ({ enabled: googleEnabled }));

  app.get('/auth/google', async (_req, reply) => {
    if (!googleEnabled) return reply.code(503).send({ error: 'Google OAuth not configured' });
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
    });
    return reply.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
  });

  app.get('/auth/google/callback', async (req, reply) => {
    if (!googleEnabled) return reply.code(503).send({ error: 'Google OAuth not configured' });
    const code = (req.query as { code?: string }).code;
    if (!code) return reply.code(400).send({ error: 'Missing code' });

    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID!,
        client_secret: env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) return reply.code(401).send({ error: 'Token exchange failed' });
    const tokens = (await tokenRes.json()) as { access_token: string };

    const profileRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileRes.ok) return reply.code(401).send({ error: 'Profile fetch failed' });
    const profile = (await profileRes.json()) as {
      sub: string;
      email: string;
      name: string;
      picture?: string;
    };

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: profile.sub }, { email: profile.email }] },
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          googleId: profile.sub,
          avatarUrl: profile.picture ?? null,
        },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.sub, avatarUrl: user.avatarUrl ?? profile.picture ?? null },
      });
    }

    const jwt = await signToken({ sub: user.id, email: user.email, name: user.name });
    const redirect = new URL('/auth/callback', env.WEB_ORIGIN);
    redirect.searchParams.set('token', jwt);
    return reply.redirect(redirect.toString());
  });
}
