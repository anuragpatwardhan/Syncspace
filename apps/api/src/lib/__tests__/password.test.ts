import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../password.js';

describe('hashPassword / verifyPassword', () => {
  it('accepts the original password', async () => {
    const hash = await hashPassword('correct horse battery staple');
    await expect(verifyPassword('correct horse battery staple', hash)).resolves.toBe(true);
  });

  it('rejects a different password', async () => {
    const hash = await hashPassword('correct horse battery staple');
    await expect(verifyPassword('Correct horse battery staple', hash)).resolves.toBe(false);
  });

  it('never stores the password in the hash', async () => {
    const hash = await hashPassword('hunter2');
    expect(hash).not.toContain('hunter2');
  });

  it('salts each hash, so the same password hashes differently every time', async () => {
    const [a, b] = await Promise.all([hashPassword('same input'), hashPassword('same input')]);
    expect(a).not.toBe(b);
    await expect(verifyPassword('same input', b)).resolves.toBe(true);
  });

  it('returns false rather than throwing on a malformed hash', async () => {
    await expect(verifyPassword('anything', 'not-a-bcrypt-hash')).resolves.toBe(false);
  });
});
