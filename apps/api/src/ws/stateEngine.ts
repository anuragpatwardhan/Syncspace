import type { Op, WorkspaceState, StickyNote } from '@syncspace/shared';
import { prisma } from '../lib/prisma.js';

const emptyState = (): WorkspaceState => ({ version: 0, notes: {}, kv: {} });

const cache = new Map<string, WorkspaceState>();
const snapshotTimers = new Map<string, NodeJS.Timeout>();
const SNAPSHOT_DEBOUNCE_MS = 2500;

export async function loadState(workspaceId: string): Promise<WorkspaceState> {
  if (cache.has(workspaceId)) return cache.get(workspaceId)!;
  const snap = await prisma.snapshot.findFirst({
    where: { workspaceId },
    orderBy: { version: 'desc' },
  });
  const state = snap ? (snap.state as unknown as WorkspaceState) : emptyState();
  cache.set(workspaceId, state);
  return state;
}

export function applyOp(state: WorkspaceState, op: Op, authorId: string, ts: number): WorkspaceState {
  const next: WorkspaceState = {
    version: state.version + 1,
    notes: { ...state.notes },
    kv: { ...state.kv },
  };
  switch (op.kind) {
    case 'set':
      next.kv[op.key] = op.value;
      break;
    case 'delete':
      delete next.kv[op.key];
      break;
    case 'note.add': {
      const note: StickyNote = {
        id: op.id,
        x: op.x,
        y: op.y,
        text: op.text,
        color: op.color,
        updatedAt: ts,
        authorId,
      };
      next.notes[op.id] = note;
      break;
    }
    case 'note.move': {
      const cur = next.notes[op.id];
      if (cur && ts >= cur.updatedAt) {
        next.notes[op.id] = { ...cur, x: op.x, y: op.y, updatedAt: ts };
      }
      break;
    }
    case 'note.edit': {
      const cur = next.notes[op.id];
      if (cur && ts >= cur.updatedAt) {
        next.notes[op.id] = { ...cur, text: op.text, updatedAt: ts };
      }
      break;
    }
    case 'note.delete':
      delete next.notes[op.id];
      break;
  }
  return next;
}

export function setState(workspaceId: string, state: WorkspaceState) {
  cache.set(workspaceId, state);
  scheduleSnapshot(workspaceId);
}

function scheduleSnapshot(workspaceId: string) {
  const existing = snapshotTimers.get(workspaceId);
  if (existing) clearTimeout(existing);
  const t = setTimeout(async () => {
    snapshotTimers.delete(workspaceId);
    const state = cache.get(workspaceId);
    if (!state) return;
    try {
      await prisma.snapshot.create({
        data: {
          workspaceId,
          version: state.version,
          state: state as unknown as object,
        },
      });
    } catch (err) {
      console.warn('[snapshot] failed', err);
    }
  }, SNAPSHOT_DEBOUNCE_MS);
  snapshotTimers.set(workspaceId, t);
}
