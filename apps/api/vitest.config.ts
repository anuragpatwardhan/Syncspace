import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // lib/env.ts validates the environment at import time and refuses to load
    // without these, so supply throwaway values rather than a real .env.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      JWT_SECRET: 'test-only-secret-that-is-long-enough-to-pass-validation',
    },
  },
});
