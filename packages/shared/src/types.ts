export type User = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
};

export type Workspace = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
};

export type PresenceUser = {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  color: string;
  cursor?: { x: number; y: number } | null;
};

// Client → Server
export type ClientMessage =
  | { type: 'join'; workspaceId: string; token: string }
  | { type: 'leave' }
  | { type: 'cursor'; x: number; y: number }
  | { type: 'op'; op: Op; clientSeq: number }
  | { type: 'ping' };

// Server → Client
export type ServerMessage =
  | { type: 'joined'; workspaceId: string; state: WorkspaceState; presence: PresenceUser[]; you: PresenceUser }
  | { type: 'presence'; presence: PresenceUser[] }
  | { type: 'cursor'; userId: string; x: number; y: number }
  | { type: 'op'; op: Op; seq: number; authorId: string }
  | { type: 'snapshot'; state: WorkspaceState }
  | { type: 'error'; message: string }
  | { type: 'pong' };

export type Op =
  | { kind: 'set'; key: string; value: unknown }
  | { kind: 'delete'; key: string }
  | { kind: 'note.add'; id: string; x: number; y: number; text: string; color: string }
  | { kind: 'note.move'; id: string; x: number; y: number }
  | { kind: 'note.edit'; id: string; text: string }
  | { kind: 'note.delete'; id: string };

export type StickyNote = {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  updatedAt: number;
  authorId: string;
};

export type WorkspaceState = {
  version: number;
  notes: Record<string, StickyNote>;
  kv: Record<string, unknown>;
};
