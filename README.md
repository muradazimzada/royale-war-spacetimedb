# Royale War (SpacetimeDB)

A small, real‑time, grid‑based “royale” built on SpacetimeDB. Players move around a toroidal grid, collect fruits, and bump into each other for points. A short timed round determines the winner. The project demonstrates a full end‑to‑end multiplayer loop: a C# SpacetimeDB module compiled to WASM, and a React + TypeScript client that subscribes to tables and calls reducers.

## Vision
- **Simple, watchable rounds:** short matches, clear scoring, minimal rules.
- **Deterministic server logic:** all moves, collisions, scoring happen in the SpacetimeDB module.
- **Low‑ops hosting:** deploy the WASM module to SpacetimeDB Cloud or run locally.
- **Approachable code:** small, readable backend and a single‑page frontend.

## Features
- **Tables:**
  - `game_state`: board size, running flag, round timer.
  - `player`: position, direction, score, liveness, activity timestamps.
  - `fruit`: random spawns of Blue (+1) and Red (−1).
- **Reducers:**
  - `JoinGame(playerId, nick)`: create or update a player row; places new players on the board.
  - `LeaveGame(playerId)`: remove player row and decrement online count.
  - `SetDir(playerId, dir)`: queue the next direction and update activity; while idle this acts as “ready up”.
  - `StartRound(seconds)`: starts a round when ≥ 2 ready players exist.
  - `Tick()`: advances movement, resolves fruit eating and collisions, spawns fruit, ends the round when done.
- **Readiness model:** While idle, any input toggles `Alive=true`. StartRound requires ≥2 players with `Alive=true`. Only ready players join the next round.
- **Anti‑ghosting:** The module periodically marks long‑idle players as inactive and moves them off‑board; the UI hides inactive players on the grid and shows only “ready” players on the idle leaderboard.

## Tech Stack
- **Backend:** C# (.NET 8, WASI), SpacetimeDB Runtime 1.3.x.
- **Frontend:** React + TypeScript + Vite, SpacetimeDB SDK 1.3.x.
 - **Hosting:** SpacetimeDB Cloud for the database/module, Vercel for the static frontend.

## Repo Layout
- `backend/` — SpacetimeDB module (C# → WASM)
- `front/client/` — React client
- `front/client/src/module_bindings/` — auto‑generated SDK bindings (do not edit)

## Gameplay Notes
- **Grid:** default 27×14 (normalized on boot).
- **Speed:** players step every 600 ms (`DEFAULT_STEP_MS`) while the round is running.
- **Fruits:** spawned in waves (initial burst, then periodically).
- **Collisions:** higher score “wins” and steals 1 point; equal scores bounce.
- **Early end:** round ends when ≤1 player alive.

## Prerequisites
- Node.js 18+ and pnpm 8+
- .NET 8 SDK
- SpacetimeDB CLI 1.3+ (`stdb` or `spacetimedb`)
- Optional: Docker (if you prefer to run the server via container)

## Local Development

### 1) Start a local SpacetimeDB server
- Using CLI (recommended):
  - `stdb login` (optional for local)
  - Start your local server per your CLI install (examples: `stdb local start`, `stdb start`, or run the daemon service). See your CLI’s `--help` output.
- Using Docker (alternative):
  - `docker run --rm -p 3000:3000 ghcr.io/clockworklabs/spacetimedb:latest`

The server should be reachable at `ws://127.0.0.1:3000`.

### 2) Build and deploy the module (local DB)
```
# Build WASM
dotnet publish backend/StdbModule.csproj -c Debug

# Create a DB (choose one name and keep it consistent)
stdb db create royale-war-2

# Deploy the WASM to your local server
stdb deploy --db royale-war-2 backend/bin/Debug/net8.0/wasi-wasm/publish/*.wasm

# (Optional) Tail logs during testing
stdb logs -f --db royale-war-2
```

### 3) Configure and run the client
```
# Set local endpoint (already defaulted in front/client/.env)
VITE_STDB_URL=ws://127.0.0.1:3000
VITE_STDB_DB=royale-war-2

# Install deps and run Vite dev server
pnpm -C front/client install
pnpm -C front/client dev
```
Open the shown localhost URL. Two browser tabs simulate two players.

## Cloud Deployment (SpacetimeDB Cloud)
```
stdb login

# Build release WASM
dotnet publish backend/StdbModule.csproj -c Release

# Create a cloud DB
stdb db create royale-war-2

# Deploy module to cloud
auth_wasm=backend/bin/Release/net8.0/wasi-wasm/publish/*.wasm
stdb deploy --db royale-war-2 $auth_wasm

# Find your wss endpoint
stdb db info royale-war-2
```
Set the client environment to your cloud endpoint:
```
# front/client/.env
VITE_STDB_URL=wss://<your-cloud-endpoint>
VITE_STDB_DB=royale-war-2
```
Rebuild the client for production:
```
pnpm -C front/client build
```
Host the files in `front/client/dist/` on your static host/CDN.

## Architecture & Data Flow

High‑level flow:

1) Client connects to SpacetimeDB using the SDK
- The React app creates a `DbConnection` from `VITE_STDB_URL` + `VITE_STDB_DB`.
- It subscribes to tables via SQL snippets (`SELECT * FROM game_state`, `player`, `fruit`).
- The SDK maintains a client cache and emits onInsert/onUpdate/onDelete events.

2) Client renders from table subscriptions
- Hooks (`useGameState`, `usePlayers`, `useFruits`) read from the client cache.
- The grid renders alive/on‑board players and fruit from cached rows.

3) Client calls reducers for actions (server authoritative)
- Input (WASD/arrows) -> `SetDir(playerId, dir)` reducer.
- "Ready" while idle is also captured by `SetDir` (marks player `Alive=true`).
- Admin or UI button -> `StartRound(seconds)` reducer (backend validates 2+ ready players).
- Movement and game logic are advanced by `Tick()` (called by a soft tick leader in the browser or a `#host` tab).

4) Server module updates tables; client receives events
- Reducers mutate rows; the SDK streams table changes back to clients.
- UI updates immediately from the client cache (event‑driven, not polling).

Authoritative logic on the server:
- Movement cadence via `MoveEveryMs` (defaults to `DEFAULT_STEP_MS = 600`).
- Fruit eating and score deltas.
- Player‑player collisions, early round end, and inactivity cleanup.
- Readiness gate: only `Alive=true` players are spawned at round start.

Consistency model:
- The client never writes tables directly; it only calls reducers.
- Tables are declared `Public=true` for read/subscription convenience.
- Each connected tab gets a unique `playerId` (session‑scoped) so two tabs = two players.

Ticking model:
- A single visible tab becomes a soft tick leader using a `localStorage` lock.
- If a `#host` tab is open, it calls `Tick()` at ~10 Hz.
- Server enforces step timing; a `Tick()` only moves a player when `MoveEveryMs` elapsed since its last step.

## Tech Details
- **Frontend:** React 18, TypeScript, Vite, pnpm workspace, CSS modules.
- **Realtime SDK:** `@clockworklabs/spacetimedb-sdk` 1.3.x, generated TypeScript bindings under `src/module_bindings/`.
- **Backend:** .NET 8, SpacetimeDB.Runtime 1.3.x, WASI target (`wasi-wasm`).
- **Deployment:**
  - SpacetimeDB Cloud hosts the database and the module WASM.
  - Vercel hosts the static frontend (`front/client/dist`).

## Deploy Frontend to Vercel

1) Create a new Vercel Project
- Import your Git repo.
- Root directory: repository root (not `front/client`).

2) Build settings
- Build Command:
  - `pnpm -C front/client install && pnpm -C front/client build`
- Output Directory:
  - `front/client/dist`
- Install Command (optional override):
  - `pnpm install`

3) Environment variables (Project → Settings → Environment Variables)
- `VITE_STDB_URL` → your Cloud endpoint, e.g. `wss://<your-cloud-endpoint>`
- `VITE_STDB_DB` → your database name, e.g. `royale-war-2`

4) Deploy
- Trigger a deploy (first deploy will build and upload the static site).
- Open the Vercel URL; it will connect to SpacetimeDB Cloud over WebSocket.

## Configuration
- **Speed:** change `DEFAULT_STEP_MS` in `backend/Module.cs` (600 ms by default).
- **Idle kick:** change `INACTIVE_KICK_MS` in `backend/Module.cs` (30s default).
- **Board size:** normalized in `GetOrInitGame` (27×14 by default).
- **Client endpoint:** `front/client/.env` (`VITE_STDB_URL`, `VITE_STDB_DB`).

## Common Commands
- Backend
  - `dotnet publish backend/StdbModule.csproj -c Debug` — build WASM for local
  - `dotnet publish backend/StdbModule.csproj -c Release` — build for cloud
  - `stdb deploy --db <db> <path-to-wasm>` — deploy module
  - `stdb logs -f --db <db>` — follow logs
- Frontend
  - `pnpm -C front/client dev` — dev server
  - `pnpm -C front/client build` — production build
  - `pnpm -C front/client preview` — preview prod build

## Troubleshooting
- **“Waiting 0/2” while idle:** press any arrow/WASD in both tabs to ready up. The client also sends a lightweight idle heartbeat that marks readiness; ensure both tabs are connected to the same DB.
- **Ghost players:** the module moves idle players off‑board. Only ready players are included when starting a round; the idle leaderboard shows only recent/ready players.
- **No movement:** the round must be RUNNING. Click “Start Round” when 2 players are ready. Movement cadence is governed by `MoveEveryMs`/`DEFAULT_STEP_MS`.
- **Endpoint mismatch:** if the client points at localhost but your DB is in Cloud (or vice versa), set `VITE_STDB_URL` and `VITE_STDB_DB` accordingly and rebuild.

## Contributing
PRs welcome. Keep changes small and focused, follow existing style, and avoid editing generated files under `src/module_bindings/`.
