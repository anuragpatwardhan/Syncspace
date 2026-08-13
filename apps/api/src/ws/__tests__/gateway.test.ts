import { createServer, type Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebSocket, type WebSocketServer } from 'ws';
import type { ServerMessage, WorkspaceState } from '@syncspace/shared';

/**
 * Membership rows the stubbed Prisma client will hand back, keyed by
 * "userId:workspaceId". Anything not listed reads as "no access".
 */
const memberships = new Map<string, { user: { id: string; name: string; avatarUrl: string | null } }>();

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    membership: {
      findUnique: async ({ where }: { where: { userId_workspaceId: { userId: string; workspaceId: string } } }) => {
        const { userId, workspaceId } = where.userId_workspaceId;
        return memberships.get(`${userId}:${workspaceId}`) ?? null;
      },
    },
  },
}));

// The reducer has its own tests; the gateway is responsible for routing and
// presence, so state handling is stubbed to keep failures unambiguous.
const emptyState: WorkspaceState = { version: 0, notes: {}, kv: {} };
vi.mock('../stateEngine.js', () => ({
  loadState: async () => emptyState,
  setState: () => {},
  applyOp: (state: WorkspaceState) => state,
}));

const { signToken } = await import('../../lib/jwt.js');
const { attachWsGateway } = await import('../gateway.js');

/** A connected test client that records everything the server sends it. */
class TestClient {
  readonly received: ServerMessage[] = [];
  private constructor(readonly socket: WebSocket) {}

  static async connect(port: number): Promise<TestClient> {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const client = new TestClient(socket);
    socket.on('message', (raw) => client.received.push(JSON.parse(raw.toString())));
    await new Promise<void>((resolve, reject) => {
      socket.once('open', () => resolve());
      socket.once('error', reject);
    });
    return client;
  }

  send(message: unknown) {
    this.socket.send(JSON.stringify(message));
  }

  /** Resolve with the first message of the given type, or reject on timeout. */
  async waitFor<T extends ServerMessage['type']>(
    type: T,
    timeoutMs = 1500,
  ): Promise<Extract<ServerMessage, { type: T }>> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const found = this.received.find((m) => m.type === type);
      if (found) return found as Extract<ServerMessage, { type: T }>;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error(`timed out waiting for "${type}"; got ${JSON.stringify(this.received)}`);
  }

  /** Let the event loop drain so "nothing arrived" can be asserted. */
  static async settle(ms = 120) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  clear() {
    this.received.length = 0;
  }

  async close() {
    if (this.socket.readyState === WebSocket.OPEN) {
      await new Promise<void>((resolve) => {
        this.socket.once('close', () => resolve());
        this.socket.close();
      });
    }
  }
}

let server: Server;
let wss: WebSocketServer;
let port: number;
let clients: TestClient[];
let workspaceCounter = 0;

/** A fresh workspace id per test, since room state lives in module scope. */
const nextWorkspace = () => `ws_${++workspaceCounter}`;

function addMember(userId: string, workspaceId: string, name: string, avatarUrl: string | null = null) {
  memberships.set(`${userId}:${workspaceId}`, { user: { id: userId, name, avatarUrl } });
}

async function connect(): Promise<TestClient> {
  const client = await TestClient.connect(port);
  clients.push(client);
  return client;
}

const tokenFor = (userId: string) =>
  signToken({ sub: userId, email: `${userId}@example.com`, name: userId });

beforeEach(async () => {
  clients = [];
  memberships.clear();
  server = createServer();
  wss = attachWsGateway(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  port = (server.address() as { port: number }).port;
});

afterEach(async () => {
  for (const client of clients) await client.close();
  await new Promise<void>((resolve) => wss.close(() => resolve()));
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('message handling before joining', () => {
  it('rejects a payload that is not JSON', async () => {
    const client = await connect();
    client.socket.send('not json at all');
    expect((await client.waitFor('error')).message).toBe('Invalid JSON');
  });

  it('answers a ping with a pong', async () => {
    const client = await connect();
    client.send({ type: 'ping' });
    await client.waitFor('pong');
  });

  it('refuses an op before a workspace has been joined', async () => {
    const client = await connect();
    client.send({ type: 'op', op: { kind: 'set', key: 'a', value: 1 }, clientSeq: 1 });
    expect((await client.waitFor('error')).message).toBe('Join a workspace first');
  });

  it('refuses a cursor update before joining', async () => {
    const client = await connect();
    client.send({ type: 'cursor', x: 1, y: 2 });
    expect((await client.waitFor('error')).message).toBe('Join a workspace first');
  });
});

describe('join', () => {
  it('rejects a user with no membership', async () => {
    const client = await connect();
    client.send({ type: 'join', workspaceId: nextWorkspace(), token: await tokenFor('user-a') });
    expect((await client.waitFor('error')).message).toBe('No access to workspace');
  });

  it('rejects an unverifiable token without crashing the connection', async () => {
    const client = await connect();
    client.send({ type: 'join', workspaceId: nextWorkspace(), token: 'not-a-real-token' });
    expect((await client.waitFor('error')).message).toBe('Server error');

    // The socket must survive so the client can retry with a good token.
    client.clear();
    client.send({ type: 'ping' });
    await client.waitFor('pong');
  });

  it('returns the workspace state and the joining user on success', async () => {
    const workspaceId = nextWorkspace();
    addMember('user-a', workspaceId, 'Ada Lovelace', 'http://img/a.png');

    const client = await connect();
    client.send({ type: 'join', workspaceId, token: await tokenFor('user-a') });

    const joined = await client.waitFor('joined');
    expect(joined.workspaceId).toBe(workspaceId);
    expect(joined.state).toEqual(emptyState);
    expect(joined.you).toMatchObject({
      userId: 'user-a',
      name: 'Ada Lovelace',
      avatarUrl: 'http://img/a.png',
      cursor: null,
    });
  });

  it('assigns the same colour to a user every time', async () => {
    const first = nextWorkspace();
    const second = nextWorkspace();
    addMember('user-a', first, 'Ada');
    addMember('user-a', second, 'Ada');

    const one = await connect();
    one.send({ type: 'join', workspaceId: first, token: await tokenFor('user-a') });
    const colourOne = (await one.waitFor('joined')).you.color;

    const two = await connect();
    two.send({ type: 'join', workspaceId: second, token: await tokenFor('user-a') });
    const colourTwo = (await two.waitFor('joined')).you.color;

    expect(colourOne).toBe(colourTwo);
  });

  it('tells existing members when someone new arrives', async () => {
    const workspaceId = nextWorkspace();
    addMember('user-a', workspaceId, 'Ada');
    addMember('user-b', workspaceId, 'Bob');

    const first = await connect();
    first.send({ type: 'join', workspaceId, token: await tokenFor('user-a') });
    await first.waitFor('joined');
    first.clear();

    const second = await connect();
    second.send({ type: 'join', workspaceId, token: await tokenFor('user-b') });
    await second.waitFor('joined');

    const presence = await first.waitFor('presence');
    expect(presence.presence.map((p) => p.userId).sort()).toEqual(['user-a', 'user-b']);
  });

  it('includes everyone already present in the joiner snapshot', async () => {
    const workspaceId = nextWorkspace();
    addMember('user-a', workspaceId, 'Ada');
    addMember('user-b', workspaceId, 'Bob');

    const first = await connect();
    first.send({ type: 'join', workspaceId, token: await tokenFor('user-a') });
    await first.waitFor('joined');

    const second = await connect();
    second.send({ type: 'join', workspaceId, token: await tokenFor('user-b') });

    const joined = await second.waitFor('joined');
    expect(joined.presence.map((p) => p.userId).sort()).toEqual(['user-a', 'user-b']);
  });

  it('keeps rooms separate', async () => {
    const roomOne = nextWorkspace();
    const roomTwo = nextWorkspace();
    addMember('user-a', roomOne, 'Ada');
    addMember('user-b', roomTwo, 'Bob');

    const first = await connect();
    first.send({ type: 'join', workspaceId: roomOne, token: await tokenFor('user-a') });
    await first.waitFor('joined');
    first.clear();

    const second = await connect();
    second.send({ type: 'join', workspaceId: roomTwo, token: await tokenFor('user-b') });
    await second.waitFor('joined');

    await TestClient.settle();
    expect(first.received).toEqual([]);
  });
});

describe('cursor updates', () => {
  it('reaches the other members but not the sender', async () => {
    const workspaceId = nextWorkspace();
    addMember('user-a', workspaceId, 'Ada');
    addMember('user-b', workspaceId, 'Bob');

    const first = await connect();
    first.send({ type: 'join', workspaceId, token: await tokenFor('user-a') });
    await first.waitFor('joined');

    const second = await connect();
    second.send({ type: 'join', workspaceId, token: await tokenFor('user-b') });
    await second.waitFor('joined');

    first.clear();
    second.clear();
    second.send({ type: 'cursor', x: 12, y: 34 });

    const cursor = await first.waitFor('cursor');
    expect(cursor).toMatchObject({ userId: 'user-b', x: 12, y: 34 });
    expect(second.received.some((m) => m.type === 'cursor')).toBe(false);
  });
});

describe('operations', () => {
  it('broadcasts an op to everyone including the sender', async () => {
    const workspaceId = nextWorkspace();
    addMember('user-a', workspaceId, 'Ada');
    addMember('user-b', workspaceId, 'Bob');

    const first = await connect();
    first.send({ type: 'join', workspaceId, token: await tokenFor('user-a') });
    await first.waitFor('joined');

    const second = await connect();
    second.send({ type: 'join', workspaceId, token: await tokenFor('user-b') });
    await second.waitFor('joined');

    first.clear();
    second.clear();
    const op = { kind: 'set', key: 'title', value: 'Plan' } as const;
    first.send({ type: 'op', op, clientSeq: 1 });

    // The author needs its own echo to confirm the server accepted the op.
    expect(await first.waitFor('op')).toMatchObject({ op, authorId: 'user-a' });
    expect(await second.waitFor('op')).toMatchObject({ op, authorId: 'user-a' });
  });

  it('numbers ops within a workspace in increasing order', async () => {
    const workspaceId = nextWorkspace();
    addMember('user-a', workspaceId, 'Ada');

    const client = await connect();
    client.send({ type: 'join', workspaceId, token: await tokenFor('user-a') });
    await client.waitFor('joined');
    client.clear();

    client.send({ type: 'op', op: { kind: 'set', key: 'a', value: 1 }, clientSeq: 1 });
    client.send({ type: 'op', op: { kind: 'set', key: 'b', value: 2 }, clientSeq: 2 });

    await TestClient.settle();
    const sequences = client.received
      .filter((m): m is Extract<ServerMessage, { type: 'op' }> => m.type === 'op')
      .map((m) => m.seq);

    expect(sequences).toHaveLength(2);
    expect(sequences[1]).toBeGreaterThan(sequences[0]!);
  });
});

describe('leaving', () => {
  it('tells the remaining members when a client leaves explicitly', async () => {
    const workspaceId = nextWorkspace();
    addMember('user-a', workspaceId, 'Ada');
    addMember('user-b', workspaceId, 'Bob');

    const first = await connect();
    first.send({ type: 'join', workspaceId, token: await tokenFor('user-a') });
    await first.waitFor('joined');

    const second = await connect();
    second.send({ type: 'join', workspaceId, token: await tokenFor('user-b') });
    await second.waitFor('joined');

    first.clear();
    second.send({ type: 'leave' });

    const presence = await first.waitFor('presence');
    expect(presence.presence.map((p) => p.userId)).toEqual(['user-a']);
  });

  it('tells the remaining members when a socket drops', async () => {
    const workspaceId = nextWorkspace();
    addMember('user-a', workspaceId, 'Ada');
    addMember('user-b', workspaceId, 'Bob');

    const first = await connect();
    first.send({ type: 'join', workspaceId, token: await tokenFor('user-a') });
    await first.waitFor('joined');

    const second = await connect();
    second.send({ type: 'join', workspaceId, token: await tokenFor('user-b') });
    await second.waitFor('joined');

    first.clear();
    await second.close();

    const presence = await first.waitFor('presence');
    expect(presence.presence.map((p) => p.userId)).toEqual(['user-a']);
  });

  it('requires a fresh join after leaving', async () => {
    const workspaceId = nextWorkspace();
    addMember('user-a', workspaceId, 'Ada');

    const client = await connect();
    client.send({ type: 'join', workspaceId, token: await tokenFor('user-a') });
    await client.waitFor('joined');

    client.send({ type: 'leave' });
    await TestClient.settle();
    client.clear();

    client.send({ type: 'cursor', x: 1, y: 1 });
    expect((await client.waitFor('error')).message).toBe('Join a workspace first');
  });
});
