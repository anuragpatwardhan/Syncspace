# SyncSpace

A real-time collaborative workspace. Several people open the same board, drag sticky
notes around, and see each other's cursors and edits as they happen.

The interesting part is not the notes — it is keeping every connected client in
agreement about the board's state while edits arrive out of order over the network.

## Stack

| Layer | Choice |
| --- | --- |
| API | Fastify 4, TypeScript, ESM |
| Realtime | `ws` websocket gateway |
| Database | PostgreSQL via Prisma 5 |
| Shared state | Redis (ioredis) |
| Auth | JWT (`jose`) with email/password and Google OAuth |
| Web | React 18, Vite, React Router, Zustand |
| Styling | Tailwind CSS, Framer Motion |
| Tests | Vitest |

## Layout

```
apps/
  api/       Fastify server, websocket gateway, Prisma schema
  web/       Vite + React client
packages/
  shared/    types shared across the network boundary
```

`packages/shared` holds every type that crosses between client and server —
`ClientMessage`, `ServerMessage`, `Op`, `WorkspaceState`. Both sides import from it,
so a change to the wire format breaks the build rather than failing silently at
runtime.

## How state stays consistent

Clients never send state, only **operations**. An `Op` is one of `set`, `delete`,
`note.add`, `note.move`, `note.edit` or `note.delete`. The server owns the canonical
`WorkspaceState` and is the only thing that applies ops to it.

`applyOp` in `apps/api/src/ws/stateEngine.ts` is a pure reducer:
`(state, op, authorId, timestamp) -> newState`. It never mutates its input, and it
bumps a monotonic `version` on every applied op.

Conflicts resolve **last-write-wins on timestamp**. A `note.move` or `note.edit` is
only applied when its timestamp is at or after the target note's `updatedAt`, so a
delayed packet cannot undo a newer edit that already landed. Ties go to the incoming
op, which means two clients editing on the same millisecond converge on one value
instead of each keeping their own.

Because the reducer is pure and deterministic, replaying the same ops in the same
order always produces the same state — which is what makes snapshots safe.

## Persistence

Applying an op updates an in-memory cache and schedules a snapshot. Snapshots are
**debounced by 2.5 seconds**, so a burst of drags writes one row rather than one row
per frame. On load, the newest snapshot for a workspace is restored, falling back to
an empty board.

Snapshots and events are both keyed by workspace and indexed on their sequence
number.

## Running it

Requires Node 20+, pnpm 9 and Docker.

```bash
cp .env.example .env       # then fill in the values
pnpm install
pnpm docker:up             # Postgres + Redis
pnpm db:push               # apply the Prisma schema
pnpm dev                   # API on :4000, web on :5173
```

`JWT_SECRET` must be at least 32 characters — the server validates its environment
at startup and refuses to boot otherwise. Generate one with:

```bash
openssl rand -hex 64
```

Google OAuth is optional. Without `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` the
server still runs; `/auth/google/status` reports `enabled: false`, and the sign-in
pages disable the Google button and name the two variables to set.

## Tests

```bash
pnpm test
```

52 cases:

- **State reducer** — version bumping, immutability, last-write-wins ordering, ops
  targeting deleted notes, and replay convergence.
- **JWT** — claim round-tripping, issuer and expiry stamping, and rejection of tampered
  payloads and bad signatures.
- **Passwords** — salting, verification, and that a malformed hash returns false rather
  than throwing.
- **Auth guard** — the difference between a missing token and an invalid one, and that a
  forged token never reaches `req.user`.
- **Websocket gateway** — membership enforcement on join, that an unverifiable token
  fails without killing the connection, presence fan-out as people arrive and leave,
  room isolation, cursor updates reaching everyone *except* the sender while ops reach
  the sender too, and monotonic sequence numbers.

The gateway tests run a real HTTP server and real websocket clients, stubbing only
Prisma and the reducer, so the routing and broadcast behaviour is genuinely exercised
rather than asserted against a mock.

`apps/api/vitest.config.ts` supplies throwaway environment values, since `lib/env.ts`
validates the environment at import time and would otherwise refuse to load.

## API

| Method | Route | Notes |
| --- | --- | --- |
| `GET` | `/health` | liveness |
| `POST` | `/auth/signup` | email, name, password (min 8) |
| `POST` | `/auth/login` | returns JWT |
| `GET` | `/auth/me` | authenticated |
| `GET` | `/auth/google/status` | whether OAuth is configured |
| `GET` | `/auth/google` | begins the OAuth redirect |
| `GET` | `/auth/google/callback` | exchanges code, redirects to the client with a token |
| `GET` | `/workspaces` | workspaces the caller belongs to |
| `POST` | `/workspaces` | create |
| `GET` | `/workspaces/:id` | single workspace |
| `DELETE` | `/workspaces/:id` | owner only |

The websocket gateway listens on `/ws`. A client sends `join` with its workspace id
and token, then exchanges `cursor` and `op` messages.

## Scripts

| Command | Does |
| --- | --- |
| `pnpm dev` | API and web together |
| `pnpm dev:api` / `pnpm dev:web` | one at a time |
| `pnpm build` | build every package |
| `pnpm test` | run tests across the workspace |
| `pnpm db:push` / `pnpm db:studio` | Prisma schema and browser |
| `pnpm docker:up` / `pnpm docker:down` | Postgres and Redis |
