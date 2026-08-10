import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  ClientMessage,
  ServerMessage,
  WorkspaceState,
  PresenceUser,
  Op,
} from '@syncspace/shared';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:4000/ws';

type Status = 'connecting' | 'connected' | 'disconnected' | 'error';

export function useWorkspaceSocket(workspaceId: string | null, token: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<Status>('disconnected');
  const [state, setState] = useState<WorkspaceState>({ version: 0, notes: {}, kv: {} });
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [me, setMe] = useState<PresenceUser | null>(null);
  const [cursors, setCursors] = useState<Record<string, { x: number; y: number }>>({});
  const seqRef = useRef(0);
  const reconnectTimer = useRef<number | null>(null);

  const send = useCallback((msg: ClientMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, []);

  useEffect(() => {
    if (!workspaceId || !token) return;
    let cancelled = false;

    const connect = () => {
      setStatus('connecting');
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        ws.send(JSON.stringify({ type: 'join', workspaceId, token } satisfies ClientMessage));
      };

      ws.onmessage = (ev) => {
        const msg: ServerMessage = JSON.parse(ev.data);
        switch (msg.type) {
          case 'joined':
            setState(msg.state);
            setPresence(msg.presence);
            setMe(msg.you);
            break;
          case 'presence':
            setPresence(msg.presence);
            break;
          case 'cursor':
            setCursors((c) => ({ ...c, [msg.userId]: { x: msg.x, y: msg.y } }));
            break;
          case 'op':
            setState((s) => applyOpLocally(s, msg.op, msg.authorId, Date.now()));
            break;
          case 'snapshot':
            setState(msg.state);
            break;
        }
      };

      ws.onerror = () => setStatus('error');
      ws.onclose = () => {
        setStatus('disconnected');
        if (!cancelled) {
          reconnectTimer.current = window.setTimeout(connect, 1500);
        }
      };
    };

    connect();
    const ping = window.setInterval(() => send({ type: 'ping' }), 20_000);

    return () => {
      cancelled = true;
      if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current);
      window.clearInterval(ping);
      try { wsRef.current?.close(); } catch {}
      wsRef.current = null;
    };
  }, [workspaceId, token, send]);

  const emitOp = useCallback((op: Op) => {
    seqRef.current += 1;
    setState((s) => applyOpLocally(s, op, me?.userId ?? '', Date.now()));
    send({ type: 'op', op, clientSeq: seqRef.current });
  }, [send, me?.userId]);

  const emitCursor = useCallback((x: number, y: number) => {
    send({ type: 'cursor', x, y });
  }, [send]);

  return { status, state, presence, me, cursors, emitOp, emitCursor };
}

function applyOpLocally(s: WorkspaceState, op: Op, authorId: string, ts: number): WorkspaceState {
  const next: WorkspaceState = {
    version: s.version + 1,
    notes: { ...s.notes },
    kv: { ...s.kv },
  };
  switch (op.kind) {
    case 'set': next.kv[op.key] = op.value; break;
    case 'delete': delete next.kv[op.key]; break;
    case 'note.add':
      next.notes[op.id] = { id: op.id, x: op.x, y: op.y, text: op.text, color: op.color, updatedAt: ts, authorId };
      break;
    case 'note.move': {
      const c = next.notes[op.id];
      if (c && ts >= c.updatedAt) next.notes[op.id] = { ...c, x: op.x, y: op.y, updatedAt: ts };
      break;
    }
    case 'note.edit': {
      const c = next.notes[op.id];
      if (c && ts >= c.updatedAt) next.notes[op.id] = { ...c, text: op.text, updatedAt: ts };
      break;
    }
    case 'note.delete': delete next.notes[op.id]; break;
  }
  return next;
}
