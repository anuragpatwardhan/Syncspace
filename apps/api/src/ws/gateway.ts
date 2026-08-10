import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage, Server } from 'http';
import { verifyToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';
import { applyOp, loadState, setState } from './stateEngine.js';
import type {
  ClientMessage,
  ServerMessage,
  PresenceUser,
} from '@syncspace/shared';

type Client = {
  ws: WebSocket;
  userId: string;
  name: string;
  avatarUrl: string | null;
  color: string;
  workspaceId: string | null;
  cursor: { x: number; y: number } | null;
  lastPong: number;
};

const PALETTE = [
  '#8b5cf6', '#ec4899', '#06b6d4', '#22c55e',
  '#f59e0b', '#ef4444', '#3b82f6', '#a855f7',
  '#14b8a6', '#f97316', '#84cc16', '#e879f9',
];

const rooms = new Map<string, Set<Client>>();
const sequences = new Map<string, number>();

function colorFor(userId: string) {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length]!;
}

function presenceSnapshot(workspaceId: string): PresenceUser[] {
  const room = rooms.get(workspaceId);
  if (!room) return [];
  return [...room].map((c) => ({
    userId: c.userId,
    name: c.name,
    avatarUrl: c.avatarUrl,
    color: c.color,
    cursor: c.cursor,
  }));
}

function broadcast(workspaceId: string, msg: ServerMessage, except?: WebSocket) {
  const room = rooms.get(workspaceId);
  if (!room) return;
  const data = JSON.stringify(msg);
  for (const c of room) {
    if (c.ws !== except && c.ws.readyState === WebSocket.OPEN) c.ws.send(data);
  }
}

function send(ws: WebSocket, msg: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

export function attachWsGateway(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  const heartbeat = setInterval(() => {
    const now = Date.now();
    for (const room of rooms.values()) {
      for (const c of room) {
        if (now - c.lastPong > 45_000) {
          try { c.ws.terminate(); } catch {}
        }
      }
    }
  }, 15_000);
  wss.on('close', () => clearInterval(heartbeat));

  wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
    const client: Client = {
      ws,
      userId: '',
      name: '',
      avatarUrl: null,
      color: '#8b5cf6',
      workspaceId: null,
      cursor: null,
      lastPong: Date.now(),
    };

    ws.on('message', async (raw) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return send(ws, { type: 'error', message: 'Invalid JSON' });
      }

      try {
        if (msg.type === 'ping') {
          client.lastPong = Date.now();
          return send(ws, { type: 'pong' });
        }

        if (msg.type === 'join') {
          const payload = await verifyToken(msg.token);
          const membership = await prisma.membership.findUnique({
            where: { userId_workspaceId: { userId: payload.sub, workspaceId: msg.workspaceId } },
            include: { user: true },
          });
          if (!membership) return send(ws, { type: 'error', message: 'No access to workspace' });

          if (client.workspaceId) leaveRoom(client);
          client.userId = membership.user.id;
          client.name = membership.user.name;
          client.avatarUrl = membership.user.avatarUrl;
          client.color = colorFor(client.userId);
          client.workspaceId = msg.workspaceId;

          let room = rooms.get(msg.workspaceId);
          if (!room) { room = new Set(); rooms.set(msg.workspaceId, room); }
          room.add(client);

          const state = await loadState(msg.workspaceId);
          const presence = presenceSnapshot(msg.workspaceId);
          const you: PresenceUser = {
            userId: client.userId, name: client.name, avatarUrl: client.avatarUrl,
            color: client.color, cursor: null,
          };
          send(ws, { type: 'joined', workspaceId: msg.workspaceId, state, presence, you });
          broadcast(msg.workspaceId, { type: 'presence', presence }, ws);
          return;
        }

        if (!client.workspaceId) return send(ws, { type: 'error', message: 'Join a workspace first' });

        if (msg.type === 'leave') {
          leaveRoom(client);
          return;
        }

        if (msg.type === 'cursor') {
          client.cursor = { x: msg.x, y: msg.y };
          broadcast(client.workspaceId, { type: 'cursor', userId: client.userId, x: msg.x, y: msg.y }, ws);
          return;
        }

        if (msg.type === 'op') {
          const wsId = client.workspaceId;
          const seq = (sequences.get(wsId) ?? 0) + 1;
          sequences.set(wsId, seq);
          const state = await loadState(wsId);
          const next = applyOp(state, msg.op, client.userId, Date.now());
          setState(wsId, next);
          broadcast(wsId, { type: 'op', op: msg.op, seq, authorId: client.userId });
          return;
        }
      } catch (err) {
        console.error('[ws] error handling message', err);
        send(ws, { type: 'error', message: 'Server error' });
      }
    });

    ws.on('pong', () => { client.lastPong = Date.now(); });
    ws.on('close', () => leaveRoom(client));
    ws.on('error', () => leaveRoom(client));
  });
}

function leaveRoom(client: Client) {
  const wsId = client.workspaceId;
  if (!wsId) return;
  const room = rooms.get(wsId);
  if (room) {
    room.delete(client);
    if (room.size === 0) rooms.delete(wsId);
    else broadcast(wsId, { type: 'presence', presence: presenceSnapshot(wsId) });
  }
  client.workspaceId = null;
}
