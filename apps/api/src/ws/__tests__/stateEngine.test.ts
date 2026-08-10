import { describe, expect, it, vi } from 'vitest';
import type { Op, WorkspaceState } from '@syncspace/shared';

// stateEngine imports the Prisma client at module load for snapshot persistence.
// applyOp itself never touches the database, so the client is stubbed out to keep
// these tests hermetic.
vi.mock('../../lib/prisma.js', () => ({ prisma: {} }));

const { applyOp } = await import('../stateEngine.js');

const baseState = (): WorkspaceState => ({ version: 3, notes: {}, kv: {} });

const withNote = (overrides: Partial<WorkspaceState['notes'][string]> = {}): WorkspaceState => ({
  version: 3,
  kv: {},
  notes: {
    n1: {
      id: 'n1',
      x: 10,
      y: 20,
      text: 'original',
      color: '#f4e87a',
      updatedAt: 1_000,
      authorId: 'user-a',
      ...overrides,
    },
  },
});

describe('applyOp', () => {
  it('increments the version on every applied op', () => {
    const next = applyOp(baseState(), { kind: 'set', key: 'title', value: 'Roadmap' }, 'user-a', 2_000);
    expect(next.version).toBe(4);
  });

  it('does not mutate the state it is given', () => {
    const state = withNote();
    const snapshot = JSON.parse(JSON.stringify(state));

    applyOp(state, { kind: 'note.move', id: 'n1', x: 99, y: 99 }, 'user-b', 2_000);

    expect(state).toEqual(snapshot);
  });

  describe('key/value ops', () => {
    it('sets a key', () => {
      const next = applyOp(baseState(), { kind: 'set', key: 'title', value: 'Roadmap' }, 'user-a', 2_000);
      expect(next.kv.title).toBe('Roadmap');
    });

    it('overwrites an existing key', () => {
      const state: WorkspaceState = { version: 1, notes: {}, kv: { title: 'Old' } };
      const next = applyOp(state, { kind: 'set', key: 'title', value: 'New' }, 'user-a', 2_000);
      expect(next.kv.title).toBe('New');
    });

    it('deletes a key', () => {
      const state: WorkspaceState = { version: 1, notes: {}, kv: { title: 'Roadmap' } };
      const next = applyOp(state, { kind: 'delete', key: 'title' }, 'user-a', 2_000);
      expect(next.kv).not.toHaveProperty('title');
    });

    it('tolerates deleting a key that is not present', () => {
      const next = applyOp(baseState(), { kind: 'delete', key: 'missing' }, 'user-a', 2_000);
      expect(next.kv).toEqual({});
    });
  });

  describe('note.add', () => {
    it('stores the note with its author and timestamp', () => {
      const op: Op = { kind: 'note.add', id: 'n1', x: 5, y: 6, text: 'hello', color: '#fff' };
      const next = applyOp(baseState(), op, 'user-a', 2_000);

      expect(next.notes.n1).toEqual({
        id: 'n1',
        x: 5,
        y: 6,
        text: 'hello',
        color: '#fff',
        updatedAt: 2_000,
        authorId: 'user-a',
      });
    });
  });

  describe('last-write-wins on concurrent edits', () => {
    it('applies a move whose timestamp is newer than the note', () => {
      const next = applyOp(withNote(), { kind: 'note.move', id: 'n1', x: 99, y: 99 }, 'user-b', 2_000);
      expect(next.notes.n1).toMatchObject({ x: 99, y: 99, updatedAt: 2_000 });
    });

    it('drops a move that arrives with an older timestamp', () => {
      const next = applyOp(withNote(), { kind: 'note.move', id: 'n1', x: 99, y: 99 }, 'user-b', 500);
      expect(next.notes.n1).toMatchObject({ x: 10, y: 20, updatedAt: 1_000 });
    });

    it('applies a move whose timestamp ties with the note', () => {
      // Ties resolve in favour of the incoming op, so two clients on the same
      // millisecond converge instead of both keeping their local value.
      const next = applyOp(withNote(), { kind: 'note.move', id: 'n1', x: 99, y: 99 }, 'user-b', 1_000);
      expect(next.notes.n1).toMatchObject({ x: 99, y: 99 });
    });

    it('drops an edit that arrives with an older timestamp', () => {
      const next = applyOp(withNote(), { kind: 'note.edit', id: 'n1', text: 'stale' }, 'user-b', 500);
      expect(next.notes.n1).toMatchObject({ text: 'original' });
    });

    it('applies an edit whose timestamp is newer', () => {
      const next = applyOp(withNote(), { kind: 'note.edit', id: 'n1', text: 'fresh' }, 'user-b', 2_000);
      expect(next.notes.n1).toMatchObject({ text: 'fresh', updatedAt: 2_000 });
    });

    it('preserves the original author when another user edits', () => {
      const next = applyOp(withNote(), { kind: 'note.edit', id: 'n1', text: 'fresh' }, 'user-b', 2_000);
      expect(next.notes.n1).toMatchObject({ authorId: 'user-a' });
    });
  });

  describe('ops targeting a missing note', () => {
    it('ignores a move for an unknown id', () => {
      const next = applyOp(baseState(), { kind: 'note.move', id: 'ghost', x: 1, y: 1 }, 'user-a', 2_000);
      expect(next.notes).toEqual({});
    });

    it('ignores an edit for an unknown id', () => {
      const next = applyOp(baseState(), { kind: 'note.edit', id: 'ghost', text: 'x' }, 'user-a', 2_000);
      expect(next.notes).toEqual({});
    });

    it('tolerates deleting a note that is not present', () => {
      const next = applyOp(baseState(), { kind: 'note.delete', id: 'ghost' }, 'user-a', 2_000);
      expect(next.notes).toEqual({});
    });
  });

  describe('note.delete', () => {
    it('removes the note regardless of timestamp', () => {
      const next = applyOp(withNote(), { kind: 'note.delete', id: 'n1' }, 'user-b', 500);
      expect(next.notes).not.toHaveProperty('n1');
    });
  });

  it('converges when the same ops are replayed in the same order', () => {
    const ops: Array<{ op: Op; author: string; ts: number }> = [
      { op: { kind: 'note.add', id: 'n1', x: 0, y: 0, text: 'a', color: '#fff' }, author: 'user-a', ts: 1_000 },
      { op: { kind: 'note.move', id: 'n1', x: 40, y: 40 }, author: 'user-b', ts: 1_500 },
      { op: { kind: 'note.edit', id: 'n1', text: 'b' }, author: 'user-a', ts: 2_000 },
      { op: { kind: 'set', key: 'title', value: 'Plan' }, author: 'user-b', ts: 2_500 },
    ];

    const replay = () =>
      ops.reduce<WorkspaceState>(
        (state, { op, author, ts }) => applyOp(state, op, author, ts),
        { version: 0, notes: {}, kv: {} },
      );

    expect(replay()).toEqual(replay());
  });
});
