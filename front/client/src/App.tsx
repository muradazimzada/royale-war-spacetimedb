// import React, { useEffect, useMemo, useState } from 'react';
// import './App.css';

// import {
//   DbConnection,
//   type ErrorContext,
//   type EventContext,
//   // table row types
//   type Player as PlayerRow,
//   type Fruit as FruitRow,
//   type GameState as GameStateRow,
// } from './module_bindings';
// import { Identity } from '@clockworklabs/spacetimedb-sdk';

// /** ───────────── Types mapped to easier shapes ───────────── */
// type P = {
//   id: string; nick: string; x: number; y: number; score: number; alive: boolean;
// };
// type F = { id: string; kind: 'Blue' | 'Red'; x: number; y: number; };
// type G = { id: string; width: number; height: number; running: boolean; endsAtUnix: number; };

// function useHostTick(conn: DbConnection | null, enabled: boolean, hz = 10) {
//   useEffect(() => {
//     if (!conn || !enabled) return;
//     const handle = setInterval(() => {
//       // reducer names are camelCased in SDK; adjust if your SDK exposes snake_case
//       conn.reducers.tick();
//     }, Math.round(1000 / hz));
//     return () => clearInterval(handle);
//   }, [conn, enabled, hz]);
// }

// function usePlayers(conn: DbConnection | null): P[] {
//   const [players, setPlayers] = useState<P[]>([]);
//   useEffect(() => {
//     if (!conn) return;

//     // seed from cache once subscriptions apply
//     const seed = () => {
//       const arr: P[] = [];
//       for (const r of conn.db.player.iter()) {
//         arr.push({
//           id: r.id, nick: r.nick, x: r.x, y: r.y,
//           score: r.score, alive: r.alive
//         });
//       }
//       setPlayers(arr);
//     };

//     const onInsert = (_: EventContext, r: PlayerRow) => {
//       setPlayers(prev => {
//         const p = [...prev];
//         p.push({ id: r.id, nick: r.nick, x: r.x, y: r.y, score: r.score, alive: r.alive });
//         return p;
//       });
//     };
//     const onUpdate = (_: EventContext, oldR: PlayerRow, newR: PlayerRow) => {
//       setPlayers(prev => prev.map(p =>
//         p.id === oldR.id
//           ? { id: newR.id, nick: newR.nick, x: newR.x, y: newR.y, score: newR.score, alive: newR.alive }
//           : p
//       ));
//     };
//     const onDelete = (_: EventContext, r: PlayerRow) => {
//       setPlayers(prev => prev.filter(p => p.id !== r.id));
//     };

//     // register handlers
//     conn.db.player.onInsert(onInsert);
//     conn.db.player.onUpdate(onUpdate);
//     conn.db.player.onDelete(onDelete);

//     // first seed after subscribe
//     seed();

//     return () => {
//       conn.db.player.removeOnInsert(onInsert);
//       conn.db.player.removeOnUpdate(onUpdate);
//       conn.db.player.removeOnDelete(onDelete);
//     };
//   }, [conn]);

//   return players;
// }

// function useFruits(conn: DbConnection | null): F[] {
//   const [fruits, setFruits] = useState<F[]>([]);
//   useEffect(() => {
//     if (!conn) return;

//     const seed = () => {
//       const arr: F[] = [];
//       for (const r of conn.db.fruit.iter()) {
//         arr.push({ id: r.id, kind: r.kind === 0 ? 'Blue' : 'Red', x: r.x, y: r.y });
//       }
//       setFruits(arr);
//     };

//     const onInsert = (_: EventContext, r: FruitRow) => {
//       setFruits(prev => [...prev, { id: r.id, kind: r.kind === 0 ? 'Blue' : 'Red', x: r.x, y: r.y }]);
//     };
//     const onDelete = (_: EventContext, r: FruitRow) => {
//       setFruits(prev => prev.filter(f => f.id !== r.id));
//     };

//     conn.db.fruit.onInsert(onInsert);
//     conn.db.fruit.onDelete(onDelete);
//     seed();

//     return () => {
//       conn.db.fruit.removeOnInsert(onInsert);
//       conn.db.fruit.removeOnDelete(onDelete);
//     };
//   }, [conn]);

//   return fruits;
// }

// function useGameState(conn: DbConnection | null): G | null {
//   const [game, setGame] = useState<G | null>(null);
//   useEffect(() => {
//     if (!conn) return;

//     const seed = () => {
//       const first = conn.db.gameState.iter().next();
//       if (!first.done) {
//         const g = first.value as GameStateRow;
//         setGame({
//           id: g.id, width: g.width, height: g.height, running: g.running, endsAtUnix: g.endsAtUnix
//         });
//       }
//     };
//     const onInsert = (_: EventContext, g: GameStateRow) => {
//       setGame({ id: g.id, width: g.width, height: g.height, running: g.running, endsAtUnix: g.endsAtUnix });
//     };
//     const onUpdate = (_: EventContext, _oldG: GameStateRow, g: GameStateRow) => {
//       setGame({ id: g.id, width: g.width, height: g.height, running: g.running, endsAtUnix: g.endsAtUnix });
//     };
//     const onDelete = () => setGame(null);

//     conn.db.gameState.onInsert(onInsert);
//     conn.db.gameState.onUpdate(onUpdate);
//     conn.db.gameState.onDelete(onDelete);
//     seed();

//     return () => {
//       conn.db.gameState.removeOnInsert(onInsert);
//       conn.db.gameState.removeOnUpdate(onUpdate);
//       conn.db.gameState.removeOnDelete(onDelete);
//     };
//   }, [conn]);

//   return game;
// }

// /** Simple canvas grid renderer */
// function Grid({ game, players, fruits, cell = 14 }: { game: G; players: P[]; fruits: F[]; cell?: number }) {
//   const [_, force] = useState(0);
//   useEffect(() => {
//     const id = requestAnimationFrame(() => force(x => x + 1));
//     return () => cancelAnimationFrame(id);
//   }, [players, fruits, game]);
//   const w = game.width * cell;
//   const h = game.height * cell;

//   return (
//     <div style={{ overflow: 'auto', border: '1px solid #1b2230', borderRadius: 12 }}>
//       <svg width={w} height={h} style={{ display: 'block', background: '#0b0f19' }}>
//         {/* grid */}
//         {[...Array(game.width + 1)].map((_, i) => (
//           <line key={'vx' + i} x1={i * cell} y1={0} x2={i * cell} y2={h} stroke="rgba(255,255,255,0.06)" />
//         ))}
//         {[...Array(game.height + 1)].map((_, i) => (
//           <line key={'hz' + i} x1={0} y1={i * cell} x2={w} y2={i * cell} stroke="rgba(255,255,255,0.06)" />
//         ))}

//         {/* fruits */}
//         {fruits.map(f => (
//           <circle key={f.id} cx={f.x * cell + cell / 2} cy={f.y * cell + cell / 2} r={cell * 0.3}
//             fill={f.kind === 'Blue' ? '#62d2ff' : '#ff6b6b'} />
//         ))}

//         {/* players */}
//         {players.map(p => (
//           <g key={p.id}>
//             <rect x={p.x * cell + 2} y={p.y * cell + 2} width={cell - 4} height={cell - 4} fill="#9cff6b" rx={3} />
//             <text x={p.x * cell + cell / 2} y={p.y * cell - 2}
//               fill="#fff" fontFamily="monospace" fontSize={Math.max(10, cell * 0.8)}
//               textAnchor="middle">{p.score}</text>
//           </g>
//         ))}
//       </svg>
//     </div>
//   );
// }

// function App() {
//   const [connected, setConnected] = useState(false);
//   const [identity, setIdentity] = useState<Identity | null>(null);
//   const [conn, setConn] = useState<DbConnection | null>(null);
//   const [systemMessage, setSystemMessage] = useState('');

//   const playerId = useMemo(() => {
//     const k = 'rw_pid'; let v = localStorage.getItem(k);
//     if (!v) { v = crypto.randomUUID(); localStorage.setItem(k, v); }
//     return v;
//   }, []);

//   const isHost = typeof window !== 'undefined' && window.location.hash === '#host';
//   useHostTick(conn, isHost, 10);

//   // Connect (per docs)
//   useEffect(() => {
//     const subscribeToQueries = (c: DbConnection, queries: string[]) => {
//       c.subscriptionBuilder().onApplied(() => {
//         setSystemMessage(prev => prev + '\nSubscriptions applied.');
//       }).subscribe(queries);
//     };

//     const onConnect = (c: DbConnection, id: Identity, token: string) => {
//       setIdentity(id);
//       setConnected(true);
//       localStorage.setItem('auth_token', token);
//       setSystemMessage(prev => prev + '\nConnected: ' + id.toHexString());
//       subscribeToQueries(c, [
//         'SELECT * FROM player',
//         'SELECT * FROM fruit',
//         'SELECT * FROM game_state',
//       ]);
//     };

//     const onDisconnect = () => {
//       setConnected(false);
//       setSystemMessage(prev => prev + '\nDisconnected.');
//     };

//     const onConnectError = (_ctx: ErrorContext, err: Error) => {
//       setSystemMessage(prev => prev + '\nConnect error: ' + err.message);
//     };

//     const url = import.meta.env.VITE_STDB_URL || 'ws://127.0.0.1:3000';
//     const db = import.meta.env.VITE_STDB_DB || 'royale-war';

//     setConn(
//       DbConnection.builder()
//         .withUri(url)
//         .withModuleName(db)
//         .withToken(localStorage.getItem('auth_token') || '')
//         .onConnect(onConnect)
//         .onDisconnect(onDisconnect)
//         .onConnectError(onConnectError)
//         .build()
//     );
//   }, []);

//   // Domain data hooks
//   const players = usePlayers(conn);
//   const fruits = useFruits(conn);
//   const game = useGameState(conn);

//   // Join when connected
//   useEffect(() => {
//     if (!conn || !connected) return;
//     // NOTE: SDK method names are camelCase by default
//     conn.reducers.joinGame(playerId, `P-${playerId.slice(0, 4)}`);
//     return () => { conn.reducers.leaveGame(playerId); };
//   }, [conn, connected, playerId]);

//   // Desktop input
//   useEffect(() => {
//     if (!conn) return;
//     const onKey = (e: KeyboardEvent) => {
//       const k = e.key.toLowerCase();
//       let dir: 'Up' | 'Down' | 'Left' | 'Right' | null = null;
//       if (k === 'arrowup' || k === 'w') dir = 'Up';
//       else if (k === 'arrowdown' || k === 's') dir = 'Down';
//       else if (k === 'arrowleft' || k === 'a') dir = 'Left';
//       else if (k === 'arrowright' || k === 'd') dir = 'Right';
//       if (dir) conn.reducers.setDir(playerId, dir);
//     };
//     window.addEventListener('keydown', onKey);
//     return () => window.removeEventListener('keydown', onKey);
//   }, [conn, playerId]);

//   // Mobile d-pad
//   const sendDir = (d: 'Up' | 'Down' | 'Left' | 'Right') => conn?.reducers.setDir(playerId, d);

//   // Render
//   if (!conn || !connected || !identity) {
//     return <div className="App"><h1>Connecting…</h1></div>;
//   }

//   const name = `P-${playerId.slice(0, 4)}`;

//   return (
//     <div className="App">
//       <div className="profile">
//         <h1>Royale War</h1>
//         <div>Identity: {identity.toHexString().slice(0, 8)}</div>
//         <div style={{ marginLeft: 'auto' }}>{isHost ? 'HOST' : 'CLIENT'}</div>
//       </div>

//       <div className="message">
//         <h1>Arena</h1>
//         {game
//           ? <Grid game={game} players={players} fruits={fruits} cell={14} />
//           : <p>No game state yet.</p>
//         }
//       </div>

//       <div className="system">
//         <h1>System</h1>
//         <pre style={{ whiteSpace: 'pre-wrap' }}>{systemMessage || 'OK'}</pre>
//         <div style={{ marginTop: 12 }}>
//           <button onClick={() => conn.reducers.startRound(120)}>Start Round (120s)</button>
//           <button style={{ marginLeft: 8 }} onClick={() => conn.reducers.tick()}>Manual Tick</button>
//         </div>
//         <div style={{ marginTop: 8 }}>You: <b>{name}</b></div>
//       </div>

//       <div className="new-message">
//         {/* Mobile D-Pad */}
//         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,60px)', gap: 8 }}>
//           <div />
//           <button onClick={() => sendDir('Up')}>↑</button>
//           <div />
//           <button onClick={() => sendDir('Left')}>←</button>
//           <div />
//           <button onClick={() => sendDir('Right')}>→</button>
//           <div />
//           <button onClick={() => sendDir('Down')}>↓</button>
//           <div />
//         </div>
//         <div style={{ marginLeft: 16, opacity: 0.75 }}>Tip: open a 2nd tab with <code>#host</code> to drive ticks.</div>
//       </div>
//     </div>
//   );
// }

// export default App;

import React, { useEffect, useMemo, useState } from 'react';
import './App.css';

import {
  DbConnection,
  type ErrorContext,
  type EventContext,
} from './module_bindings';

// Row types (generated)
import type { Player as PlayerRow } from './module_bindings/player_type';
import type { Fruit as FruitRow } from './module_bindings/fruit_type';
import type { GameState as GameStateRow } from './module_bindings/game_state_type';
// Enum (generated)
import { FruitKind } from './module_bindings/fruit_kind_type';

import { Identity } from '@clockworklabs/spacetimedb-sdk';

/** ───────────── UI Types ───────────── */
type P = { id: string; nick: string; x: number; y: number; score: number; alive: boolean; };
type F = { id: string; kind: 'Blue' | 'Red'; x: number; y: number; };
type G = { id: string; width: number; height: number; running: boolean; endsAtUnix: number; };

/** ───────────── Host tick helper ───────────── */
function useHostTick(conn: DbConnection | null, enabled: boolean, hz = 10) {
  useEffect(() => {
    if (!conn || !enabled) return;
    const handle = setInterval(() => {
      try { conn.reducers.tick(); } catch { }
    }, Math.max(1, Math.round(1000 / hz)));
    return () => clearInterval(handle);
  }, [conn, enabled, hz]);
}

/** ───────────── Table hooks ───────────── */
function usePlayers(conn: DbConnection | null): P[] {
  const [players, setPlayers] = useState<P[]>([]);
  useEffect(() => {
    if (!conn) return;

    const seed = () => {
      const arr: P[] = [];
      for (const r of conn.db.player.iter()) {
        arr.push({ id: r.id, nick: r.nick, x: r.x, y: r.y, score: r.score, alive: r.alive });
      }
      setPlayers(arr);
    };

    const onInsert = (_: EventContext, r: PlayerRow) => {
      setPlayers(prev => [...prev, { id: r.id, nick: r.nick, x: r.x, y: r.y, score: r.score, alive: r.alive }]);
    };
    const onUpdate = (_: EventContext, oldR: PlayerRow, newR: PlayerRow) => {
      setPlayers(prev => prev.map(p =>
        p.id === oldR.id
          ? { id: newR.id, nick: newR.nick, x: newR.x, y: newR.y, score: newR.score, alive: newR.alive }
          : p
      ));
    };
    const onDelete = (_: EventContext, r: PlayerRow) => {
      setPlayers(prev => prev.filter(p => p.id !== r.id));
    };

    conn.db.player.onInsert(onInsert);
    conn.db.player.onUpdate(onUpdate);
    conn.db.player.onDelete(onDelete);
    seed();

    return () => {
      conn.db.player.removeOnInsert(onInsert);
      conn.db.player.removeOnUpdate(onUpdate);
      conn.db.player.removeOnDelete(onDelete);
    };
  }, [conn]);

  return players;
}

function useFruits(conn: DbConnection | null): F[] {
  const [fruits, setFruits] = useState<F[]>([]);
  useEffect(() => {
    if (!conn) return;

    const toKind = (k: FruitRow['kind']): F['kind'] =>
      k === FruitKind.Blue ? 'Blue' : 'Red';

    const seed = () => {
      const arr: F[] = [];
      for (const r of conn.db.fruit.iter()) {
        arr.push({ id: r.id, kind: toKind(r.kind), x: r.x, y: r.y });
      }
      setFruits(arr);
    };

    const onInsert = (_: EventContext, r: FruitRow) => {
      setFruits(prev => [...prev, { id: r.id, kind: toKind(r.kind), x: r.x, y: r.y }]);
    };
    const onDelete = (_: EventContext, r: FruitRow) => {
      setFruits(prev => prev.filter(f => f.id !== r.id));
    };

    conn.db.fruit.onInsert(onInsert);
    conn.db.fruit.onDelete(onDelete);
    seed();

    return () => {
      conn.db.fruit.removeOnInsert(onInsert);
      conn.db.fruit.removeOnDelete(onDelete);
    };
  }, [conn]);

  return fruits;
}

function useGameState(conn: DbConnection | null): G | null {
  const [game, setGame] = useState<G | null>(null);
  useEffect(() => {
    if (!conn) return;

    const toG = (g: GameStateRow): G => ({
      id: g.id,
      width: g.width,
      height: g.height,
      running: g.running,
      endsAtUnix: Number(g.endsAtUnix), // bigint -> number
    });

    const seed = () => {
      for (const g of conn.db.gameState.iter()) { // snake_case table
        setGame(toG(g));
        break; // single row
      }
    };

    const onInsert = (_: EventContext, g: GameStateRow) => setGame(toG(g));
    const onUpdate = (_: EventContext, _old: GameStateRow, g: GameStateRow) => setGame(toG(g));
    const onDelete = () => setGame(null);

    conn.db.gameState.onInsert(onInsert);
    conn.db.gameState.onUpdate(onUpdate);
    conn.db.gameState.onDelete(onDelete);
    seed();

    return () => {
      conn.db.gameState.removeOnInsert(onInsert);
      conn.db.gameState.removeOnUpdate(onUpdate);
      conn.db.gameState.removeOnDelete(onDelete);
    };
  }, [conn]);

  return game;
}

/** ───────────── SVG Grid Renderer ───────────── */
function Grid({ game, players, fruits, cell = 14 }: { game: G; players: P[]; fruits: F[]; cell?: number }) {
  const w = game.width * cell;
  const h = game.height * cell;

  return (
    <div style={{ overflow: 'auto', border: '1px solid #1b2230', borderRadius: 12 }}>
      <svg width={w} height={h} style={{ display: 'block', background: '#0b0f19' }}>
        {/* grid */}
        {[...Array(game.width + 1)].map((_, i) => (
          <line key={'vx' + i} x1={i * cell} y1={0} x2={i * cell} y2={h} stroke="rgba(255,255,255,0.06)" />
        ))}
        {[...Array(game.height + 1)].map((_, i) => (
          <line key={'hz' + i} x1={0} y1={i * cell} x2={w} y2={i * cell} stroke="rgba(255,255,255,0.06)" />
        ))}

        {/* fruits */}
        {fruits.map(f => (
          <circle key={f.id} cx={f.x * cell + cell / 2} cy={f.y * cell + cell / 2} r={cell * 0.3}
            fill={f.kind === 'Blue' ? '#62d2ff' : '#ff6b6b'} />
        ))}

        {/* players */}
        {players.map(p => (
          <g key={p.id}>
            <rect x={p.x * cell + 2} y={p.y * cell + 2} width={cell - 4} height={cell - 4} fill="#9cff6b" rx={3} />
            <text x={p.x * cell + cell / 2} y={p.y * cell - 2}
              fill="#fff" fontFamily="monospace" fontSize={Math.max(10, cell * 0.8)}
              textAnchor="middle">{p.score}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/** ───────────── App ───────────── */
function App() {
  const [connected, setConnected] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [conn, setConn] = useState<DbConnection | null>(null);
  const [systemMessage, setSystemMessage] = useState('');

  const playerId = useMemo(() => {
    const k = 'rw_pid'; let v = localStorage.getItem(k);
    if (!v) { v = crypto.randomUUID(); localStorage.setItem(k, v); }
    return v;
  }, []);

  const isHost = typeof window !== 'undefined' && window.location.hash === '#host';
  useHostTick(conn, isHost, 10);

  // Connect (docs-style)
  useEffect(() => {
    const subscribeToQueries = (c: DbConnection, queries: string[]) => {
      c.subscriptionBuilder()
        .onApplied(() => setSystemMessage(prev => prev + '\nSubscriptions applied.'))
        .subscribe(queries);
    };

    const onConnect = (c: DbConnection, id: Identity, token: string) => {
      setIdentity(id);
      setConnected(true);
      localStorage.setItem('auth_token', token);
      setSystemMessage(prev => prev + '\nConnected: ' + id.toHexString());
      subscribeToQueries(c, [
        'SELECT * FROM player',
        'SELECT * FROM fruit',
        'SELECT * FROM game_state',
      ]);
    };

    const onDisconnect = () => {
      setConnected(false);
      setSystemMessage(prev => prev + '\nDisconnected.');
    };

    const onConnectError = (_ctx: ErrorContext, err: Error) => {
      setSystemMessage(prev => prev + '\nConnect error: ' + err.message);
    };

    const url = import.meta.env.VITE_STDB_URL || 'ws://127.0.0.1:3000';
    const db = import.meta.env.VITE_STDB_DB || 'royale-war';

    setConn(
      DbConnection.builder()
        .withUri(url)
        .withModuleName(db)
        .withToken(localStorage.getItem('auth_token') || '')
        .onConnect(onConnect)
        .onDisconnect(onDisconnect)
        .onConnectError(onConnectError)
        .build()
    );
  }, []);

  // Data
  const players = usePlayers(conn);
  const fruits = useFruits(conn);
  const game = useGameState(conn);

  // Join/Leave lifecycle
  useEffect(() => {
    if (!conn || !connected) return;
    try { conn.reducers.joinGame(playerId, `P-${playerId.slice(0, 4)}`); } catch { }
    return () => { try { conn.reducers.leaveGame(playerId); } catch { } };
  }, [conn, connected, playerId]);

  // Best-effort leave on tab close/background
  useEffect(() => {
    if (!conn) return;
    const leave = () => { try { conn.reducers.leaveGame(playerId); } catch { } };
    window.addEventListener('pagehide', leave);
    window.addEventListener('beforeunload', leave);
    const vis = () => { if (document.visibilityState === 'hidden') leave(); };
    document.addEventListener('visibilitychange', vis);
    return () => {
      window.removeEventListener('pagehide', leave);
      window.removeEventListener('beforeunload', leave);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [conn, playerId]);

  // Keyboard input
  useEffect(() => {
    if (!conn) return;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      let dir: 'Up' | 'Down' | 'Left' | 'Right' | null = null;
      if (k === 'arrowup' || k === 'w') dir = 'Up';
      else if (k === 'arrowdown' || k === 's') dir = 'Down';
      else if (k === 'arrowleft' || k === 'a') dir = 'Left';
      else if (k === 'arrowright' || k === 'd') dir = 'Right';
      if (dir) try { conn.reducers.setDir(playerId, dir); } catch { }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [conn, playerId]);

  const sendDir = (d: 'Up' | 'Down' | 'Left' | 'Right') => { try { conn?.reducers.setDir(playerId, d); } catch { } };

  if (!conn || !connected || !identity) {
    return <div className="App"><h1>Connecting…</h1></div>;
  }

  const name = `P-${playerId.slice(0, 4)}`;

  return (
    <div className="App">
      <div className="profile">
        <h1>Royale War</h1>
        <div>Identity: {identity.toHexString().slice(0, 8)}</div>
        <div style={{ marginLeft: 'auto' }}>{isHost ? 'HOST' : 'CLIENT'}</div>
      </div>

      <div className="message">
        <h1>Arena</h1>
        {game ? <Grid game={game} players={players} fruits={fruits} cell={14} /> : <p>No game state yet.</p>}
      </div>

      <div className="system">
        <h1>System</h1>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{systemMessage || 'OK'}</pre>
        <div style={{ marginTop: 12 }}>
          <button onClick={() => { try { conn.reducers.startRound(120); } catch { } }}>Start Round (120s)</button>
          <button style={{ marginLeft: 8 }} onClick={() => { try { conn.reducers.tick(); } catch { } }}>Manual Tick</button>
          <button style={{ marginLeft: 8 }} onClick={() => { try { conn.reducers.leaveGame(playerId); } catch { } }}>Leave</button>
        </div>
        <div style={{ marginTop: 8 }}>You: <b>{name}</b></div>
      </div>

      <div className="new-message">
        {/* Mobile D-Pad */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,60px)', gap: 8 }}>
          <div />
          <button onClick={() => sendDir('Up')}>↑</button>
          <div />
          <button onClick={() => sendDir('Left')}>←</button>
          <div />
          <button onClick={() => sendDir('Right')}>→</button>
          <div />
          <button onClick={() => sendDir('Down')}>↓</button>
          <div />
        </div>
        <div style={{ marginLeft: 16, opacity: 0.75 }}>Tip: open a 2nd tab with <code>#host</code> to drive ticks.</div>
      </div>
    </div>
  );
}

export default App;
