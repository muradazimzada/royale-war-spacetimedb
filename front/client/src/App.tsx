import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

import {
  DbConnection,
  type ErrorContext,
  type EventContext,
} from './module_bindings'

// Row types (generated)
import type { Player as PlayerRow } from './module_bindings/player_type'
import type { Fruit as FruitRow } from './module_bindings/fruit_type'
import type { GameState as GameStateRow } from './module_bindings/game_state_type'
// Enum (generated)
import { FruitKind } from './module_bindings/fruit_kind_type'
import { Identity } from '@clockworklabs/spacetimedb-sdk'

/** ───────────── UI Types ───────────── */
type P = {
  id: string
  nick: string
  emoji: string
  x: number
  y: number
  score: number
  alive: boolean
  lastSeenAtMs: bigint
}
type F = { id: string; kind: 'Blue' | 'Red'; x: number; y: number }
type G = { id: string; width: number; height: number; running: boolean; endsAtUnix: number }

/** random emoji per playerId (stable) */
const EMOJI = ['🦖', '🦄', '🐼', '🦁', '🦊', '🐸', '🐙', '🦉', '🐢', '🦕', '🐯', '🐨', '🦔', '🦜', '🦚']
function pickEmoji(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return EMOJI[h % EMOJI.length]
}

/** Host tick helper — only when URL has #host */
function useHostTick(conn: DbConnection | null, enabled: boolean, hz = 10) {
  useEffect(() => {
    if (!conn || !enabled) return
    const handle = setInterval(() => {
      try { conn.reducers.tick() } catch { }
    }, Math.max(1, Math.round(1000 / hz)))
    return () => clearInterval(handle)
  }, [conn, enabled, hz])
}

/** Players (filter “online” by lastSeenAtMs) */
function usePlayers(conn: DbConnection | null): P[] {
  const [players, setPlayers] = useState<P[]>([])
  const ONLINE_MS = 10_000 // seen in last 10s is considered online

  useEffect(() => {
    if (!conn) return

    const seed = () => {
      const arr: P[] = []
      for (const r of conn.db.player.iter()) {
        arr.push({
          id: r.id, nick: r.nick, emoji: pickEmoji(r.id),
          x: r.x, y: r.y, score: r.score, alive: r.alive,
          lastSeenAtMs: r.lastSeenAtMs
        })
      }
      setPlayers(arr)
      console.log('[Players] Seeded from DB. rows=', arr.length, arr)
    }

    const onInsert = (_: EventContext, r: PlayerRow) => {
      setPlayers(prev => [...prev, {
        id: r.id, nick: r.nick, emoji: pickEmoji(r.id),
        x: r.x, y: r.y, score: r.score, alive: r.alive,
        lastSeenAtMs: r.lastSeenAtMs
      }])
      console.log('[Players] INSERT', {
        id: r.id, nick: r.nick, x: r.x, y: r.y, score: r.score, alive: r.alive,
        lastSeenAtMs: Number(r.lastSeenAtMs)
      })
    }
    const onUpdate = (_: EventContext, oldR: PlayerRow, r: PlayerRow) => {
      setPlayers(prev => prev.map(p =>
        p.id === oldR.id
          ? { id: r.id, nick: r.nick, emoji: p.emoji, x: r.x, y: r.y, score: r.score, alive: r.alive, lastSeenAtMs: r.lastSeenAtMs }
          : p
      ))
      console.log('[Players] UPDATE', {
        id: r.id, nick: r.nick, x: r.x, y: r.y, score: r.score, alive: r.alive,
        lastSeenAtMs: Number(r.lastSeenAtMs)
      })
    }
    const onDelete = (_: EventContext, r: PlayerRow) => {
      setPlayers(prev => prev.filter(p => p.id !== r.id))
      console.log('[Players] DELETE', { id: r.id, nick: r.nick })
    }

    conn.db.player.onInsert(onInsert)
    conn.db.player.onUpdate(onUpdate)
    conn.db.player.onDelete(onDelete)
    seed()

    return () => {
      conn.db.player.removeOnInsert(onInsert)
      conn.db.player.removeOnUpdate(onUpdate)
      conn.db.player.removeOnDelete(onDelete)
    }
  }, [conn])

  // Recalculate heartbeat time (used only for diagnostics now)
  const [now, setNow] = useState<number>(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  // Diagnostics: compute online count, but return all players so nobody is hidden by a stale lastSeenAtMs
  const onlineCount = players.filter(p => Number(p.lastSeenAtMs) > now - ONLINE_MS).length
  if (now % 5000 < 1000) {
    console.log('[Players] online=', onlineCount, 'total=', players.length, {
      now,
      threshold: now - ONLINE_MS
    })
  }
  return players
}

/** Fruits */
function useFruits(conn: DbConnection | null): F[] {
  const [fruits, setFruits] = useState<F[]>([])
  useEffect(() => {
    if (!conn) return
    // IMPORTANT: compare by tag, not object identity
    const toKind = (k: FruitRow['kind']): F['kind'] =>
      (k as any)?.tag === 'Blue' ? 'Blue' : 'Red'

    const seed = () => {
      const arr: F[] = []
      for (const r of conn.db.fruit.iter()) {
        arr.push({ id: r.id, kind: toKind(r.kind), x: r.x, y: r.y })
      }
      setFruits(arr)
    }

    const onInsert = (_: EventContext, r: FruitRow) =>
      setFruits(prev => [...prev, { id: r.id, kind: toKind(r.kind), x: r.x, y: r.y }])
    const onDelete = (_: EventContext, r: FruitRow) =>
      setFruits(prev => prev.filter(f => f.id !== r.id))

    conn.db.fruit.onInsert(onInsert)
    conn.db.fruit.onDelete(onDelete)
    seed()
    return () => {
      conn.db.fruit.removeOnInsert(onInsert)
      conn.db.fruit.removeOnDelete(onDelete)
    }
  }, [conn])
  return fruits
}

/** Game state (single row) */
function useGameState(conn: DbConnection | null): G | null {
  const [game, setGame] = useState<G | null>(null)
  useEffect(() => {
    if (!conn) return
    const toG = (g: GameStateRow): G => ({
      id: g.id, width: g.width, height: g.height, running: g.running, endsAtUnix: Number(g.endsAtUnix)
    })


    // log game width and height
    console.log("GameState width and height:", game?.width, game?.height);
    const seed = () => {
      for (const g of conn.db.gameState.iter()) {
        setGame(toG(g));
        console.log("Game width:", toG(g).width, "height:", toG(g).height);
        break
      }
    }
    const onInsert = (_: EventContext, g: GameStateRow) => {
      console.log('[GameState] INSERT', { width: g.width, height: g.height, running: g.running })
      setGame(toG(g))
    }
    const onUpdate = (_: EventContext, _o: GameStateRow, g: GameStateRow) => {
      console.log('[GameState] UPDATE', { width: g.width, height: g.height, running: g.running })
      setGame(toG(g))
    }
    const onDelete = () => setGame(null)

    conn.db.gameState.onInsert(onInsert)
    conn.db.gameState.onUpdate(onUpdate)
    conn.db.gameState.onDelete(onDelete)
    seed()
    return () => {
      conn.db.gameState.removeOnInsert(onInsert)
      conn.db.gameState.removeOnUpdate(onUpdate)
      conn.db.gameState.removeOnDelete(onDelete)
    }
  }, [conn])
  return game
}

/** ───────────── SVG Grid Renderer (static, no page scroll) ───────────── */
function Grid({
  game, players, fruits, me, cell = 25   // 3× bigger cells
}: { game: G; players: P[]; fruits: F[]; me: string; cell?: number }) {
  const w = game.width * cell
  const h = game.height * cell
  console.log("w:", w, "h:", h);


  return (
    <div className="arena">
      <svg width={w} height={h}>


        {[...Array(game.width + 1)].map((_, i) => (
          <line key={'vx' + i} x1={i * cell} y1={0} x2={i * cell} y2={h} />
        ))}
        {[...Array(game.height + 1)].map((_, i) => (
          <line key={'hz' + i} x1={0} y1={i * cell} x2={w} y2={i * cell} />
        ))}

        {/* fruits */}
        {fruits.map(f => (
          <circle key={f.id}
            cx={f.x * cell + cell / 2}
            cy={f.y * cell + cell / 2}
            r={cell * 0.28}
            className={f.kind === 'Blue' ? 'fruit-blue' : 'fruit-red'}
            fill={f.kind === 'Blue' ? '#62d2ff' : '#ff6b6b'}
            data-kind={f.kind}
          />
        ))}

        {/* players */}
        {players.map(p => (
          <g key={p.id} className="player">
            {/* icon */}
            <text x={p.x * cell + cell / 2} y={p.y * cell + cell * 0.7}
              textAnchor="middle"
              className={p.id === me ? 'me' : ''}>
              {p.emoji}
            </text>
            {/* score above */}
            <text x={p.x * cell + cell / 2} y={p.y * cell - 8}
              textAnchor="middle"
              className="score">{p.score}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

/** ───────────── App ───────────── */
export default function App() {
  const [connected, setConnected] = useState(false)
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [conn, setConn] = useState<DbConnection | null>(null)
  const [system, setSystem] = useState('')
  const [subsApplied, setSubsApplied] = useState(false)
  const isHost = typeof window !== 'undefined' && window.location.hash === '#host'

  // Fixed focus target to capture keys
  const focusTrap = useRef<HTMLDivElement>(null)
  const joinedRef = useRef(false)
  const [isTickLeader, setIsTickLeader] = useState(false)

  // Drive UI timer updates each second
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000))
  const [roundStartedAtSec, setRoundStartedAtSec] = useState<number | null>(null)
  const [roundEndedRemainingSec, setRoundEndedRemainingSec] = useState<number | null>(null)
  const prevRunning = useRef<boolean | null>(null)
  useEffect(() => {
    const i = window.setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000)
    return () => window.clearInterval(i)
  }, [])

  // Stable client id per TAB (use sessionStorage so two tabs are two players)
  const playerId = useMemo(() => {
    const k = 'rw_pid'
    // Prefer sessionStorage to ensure each tab is a distinct player during local testing
    const store = typeof window !== 'undefined' ? window.sessionStorage : undefined
    let v = store?.getItem(k) || null
    if (!v) {
      v = crypto.randomUUID()
      try { store?.setItem(k, v) } catch { }
    }
    return v
  }, [])

  useHostTick(conn, isHost, 10)

  // Connect
  useEffect(() => {
    const subscribeToQueries = (c: DbConnection, queries: string[]) => {
      c.subscriptionBuilder().onApplied(() => {
        console.log('[Conn] Subscriptions applied')
        setSystem(s => s + '\nSubscriptions applied.')
        setSubsApplied(true)
      }).subscribe(queries)
    }
    const onConnect = (c: DbConnection, id: Identity, token: string) => {
      setIdentity(id); setConnected(true)
      localStorage.setItem('auth_token', token)
      setSystem(s => s + '\nConnected: ' + id.toHexString())
      console.log('[Conn] onConnect', { id: id.toHexString() })
      subscribeToQueries(c, [
        'SELECT * FROM player',
        'SELECT * FROM fruit',
        'SELECT * FROM game_state',
      ])
    }
    const onDisconnect = () => { setConnected(false); setSystem(s => s + '\nDisconnected.') }
    const onConnectError = (_: ErrorContext, err: Error) => setSystem(s => s + '\nConnect error: ' + err.message)

    const url = import.meta.env.VITE_STDB_URL || 'ws://127.0.0.1:3000'
    const db = import.meta.env.VITE_STDB_DB || 'royale-war'
    console.log('[Conn] Connecting', { url, db })

    setConn(
      DbConnection.builder()
        .withUri(url)
        .withModuleName(db)
        .withToken(localStorage.getItem('auth_token') || '')
        .onConnect(onConnect)
        .onDisconnect(onDisconnect)
        .onConnectError(onConnectError)
        .build()
    )
  }, [])

  // Reducer acks (from server)
  useEffect(() => {
    if (!conn) return
    const onJG = (_ctx: any, ackPlayerId: string, _nick: string) => {
      console.log('[ReducerAck] JoinGame applied', { ackPlayerId })
      if (ackPlayerId === playerId) {
        joinedRef.current = true
      }
    }
    const onSD = () => console.log('[ReducerAck] SetDir applied')
    const onSR = () => { console.log('[ReducerAck] StartRound applied') }
    const onT = () => console.log('[ReducerAck] Tick applied')
    conn.reducers.onJoinGame(onJG)
    conn.reducers.onSetDir(onSD)
    conn.reducers.onStartRound(onSR)
    conn.reducers.onTick(onT)
    return () => {
      conn.reducers.removeOnJoinGame(onJG)
      conn.reducers.removeOnSetDir(onSD)
      conn.reducers.removeOnStartRound(onSR)
      conn.reducers.removeOnTick(onT)
    }
  }, [conn, playerId])

  // Data hooks
  const players = usePlayers(conn)
  const fruits = useFruits(conn)
  const game = useGameState(conn)

  // Track when a round actually starts from game state
  useEffect(() => {
    if (game == null) return
    if (prevRunning.current === null) { prevRunning.current = game.running; return }
    if (!prevRunning.current && game.running) {
      setRoundStartedAtSec(Math.floor(Date.now() / 1000))
    }
    prevRunning.current = game.running
  }, [game?.running])

  // Soft leader election for ticking (if no #host):
  // Exactly one visible tab becomes the tick leader using a localStorage lock.
  useEffect(() => {
    if (!conn || !connected || !subsApplied) return
    if (!game?.running) {
      if (isTickLeader) setIsTickLeader(false)
      return
    }

    const LOCK_KEY = 'rw_tick_leader'
    const TTL = 3000 // ms

    const now = () => Date.now()
    const readLock = (): { id: string; ts: number } | null => {
      try { const raw = localStorage.getItem(LOCK_KEY); return raw ? JSON.parse(raw) : null } catch { return null }
    }
    const writeLock = (id: string) => {
      try { localStorage.setItem(LOCK_KEY, JSON.stringify({ id, ts: now() })) } catch { }
    }
    const clearLock = () => { try { localStorage.removeItem(LOCK_KEY) } catch { } }

    const tryClaim = () => {
      if (document.hidden) return false
      const lk = readLock()
      if (!lk || now() - lk.ts > TTL) { writeLock(playerId); setIsTickLeader(true); return true }
      if (lk.id === playerId) { setIsTickLeader(true); return true }
      setIsTickLeader(false); return false
    }

    // Initial attempt
    tryClaim()

    // Heartbeat/renewal and opportunistic claim
    const hb = window.setInterval(() => {
      const lk = readLock()
      if (isTickLeader) {
        writeLock(playerId) // renew
      } else {
        if (!lk || now() - lk.ts > TTL) tryClaim()
      }
    }, 1000)

    // React to tab visibility changes
    const onVis = () => {
      if (document.hidden) {
        if (isTickLeader) { const lk = readLock(); if (lk?.id === playerId) clearLock(); setIsTickLeader(false) }
      } else {
        tryClaim()
      }
    }
    document.addEventListener('visibilitychange', onVis)

    // Tick loop if leader
    let tickTimer: number | undefined
    const ensureTickLoop = () => {
      if (tickTimer) return
      if (isTickLeader) {
        tickTimer = window.setInterval(() => { try { conn.reducers.tick() } catch { } }, 100)
      }
    }
    ensureTickLoop()

    // Listen to storage changes from other tabs to relinquish/claim
    const onStorage = (e: StorageEvent) => {
      if (e.key !== LOCK_KEY) return
      const lk = readLock()
      if (lk?.id !== playerId && isTickLeader) {
        // someone else took leadership
        setIsTickLeader(false)
        if (tickTimer) { window.clearInterval(tickTimer); tickTimer = undefined }
      } else if (!lk) {
        tryClaim(); ensureTickLoop()
      }
    }
    window.addEventListener('storage', onStorage)

    return () => {
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', onVis)
      window.clearInterval(hb)
      if (tickTimer) window.clearInterval(tickTimer)
      // do not clear lock on unmount unless we own it
      const lk = readLock(); if (lk?.id === playerId) clearLock()
      setIsTickLeader(false)
    }
  }, [conn, connected, subsApplied, game?.running, playerId, isTickLeader])

  // While the round is IDLE, keep a lightweight heartbeat so this tab counts as active
  useEffect(() => {
    if (!conn || !connected || !subsApplied) return
    if (game?.running) return
    let hb: number | undefined
    const ping = () => {
      // Send readiness heartbeat even if tab is backgrounded so two-browser setups can ready up
      try { conn.reducers.setDir(playerId, 'Right') } catch { }
    }
    // ping immediately and every 3s while idle
    ping()
    hb = window.setInterval(ping, 3000)
    return () => { if (hb) window.clearInterval(hb) }
  }, [conn, connected, subsApplied, game?.running, playerId])

  // Join loop: attempt until our row is visible or ack'd
  useEffect(() => {
    if (!conn || !connected || !subsApplied) return
    const haveMe = players.some(p => p.id === playerId)
    if (haveMe || joinedRef.current) return

    let attempts = 0
    const nick = `P-${playerId.slice(0, 4)}`
    const tryJoin = () => {
      if (joinedRef.current) return
      attempts++
      console.log('[Join] Attempt', attempts, { playerId, nick })
      try { conn.reducers.joinGame(playerId, nick) } catch { }
      if (attempts >= 5) {
        console.warn('[Join] Max attempts reached without seeing our row.')
        clearInterval(timer)
      }
    }
    tryJoin()
    const timer = window.setInterval(() => {
      const nowHaveMe = players.some(p => p.id === playerId)
      if (nowHaveMe || joinedRef.current) {
        clearInterval(timer)
        return
      }
      tryJoin()
    }, 1000)
    return () => window.clearInterval(timer)
  }, [conn, connected, subsApplied, playerId, players])

  // Leave on unmount only (not on dependency changes)
  useEffect(() => {
    return () => {
      try { if (joinedRef.current) conn?.reducers.leaveGame(playerId) } catch { }
    }
  }, [conn, playerId])

  // Key input (prevent page scroll + send reducer)
  useEffect(() => {
    const el = focusTrap.current
    el?.focus()

    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' '].includes(k)) {
        e.preventDefault() // <-- stop page/grid from scrolling
      }
      // Allow inputs even when round is IDLE so LastSeenAtMs updates
      // (this marks the player as "active" for the 2-player start gate).
      const meRow = players.find(p => p.id === playerId)
      if (meRow && !meRow.alive && game?.running) return
      let dir: 'Up' | 'Down' | 'Left' | 'Right' | null = null
      if (k === 'arrowup' || k === 'w') dir = 'Up'
      else if (k === 'arrowdown' || k === 's') dir = 'Down'
      else if (k === 'arrowleft' || k === 'a') dir = 'Left'
      else if (k === 'arrowright' || k === 'd') dir = 'Right'
      if (dir) {
        try {
          conn?.reducers.setDir(playerId, dir)
          // Only nudge a tick if the round is running
          if (game?.running) {
            setTimeout(() => { try { conn?.reducers.tick() } catch { } }, 10)
          }
        } catch { }
      }
    }

    // passive:false lets us call preventDefault
    window.addEventListener('keydown', onKey, { passive: false })
    return () => window.removeEventListener('keydown', onKey as any)
  }, [conn, playerId])

  // Mobile D-Pad
  const sendDir = (d: 'Up' | 'Down' | 'Left' | 'Right') => { try { conn?.reducers.setDir(playerId, d) } catch { } }

  if (false && (!conn || !connected || !identity)) {
    return <div className="full"><h1>Connecting…</h1></div>
  }

  const me = players.find(p => p.id === playerId)
  console.log('[UI] Render stats', {
    connected,
    playerId,
    playersOnline: players.length,
    hasMe: !!me,
    meCoords: me ? { x: me.x, y: me.y } : null
  })
  const name = `P-${playerId.slice(0, 4)}`
  // Compute time remaining regardless of running state
  let endsIn = 0
  if (game) {
    if (game.endsAtUnix >= 1_000_000_000) {
      endsIn = Math.max(0, game.endsAtUnix - nowSec)
    } else if (roundStartedAtSec != null) {
      endsIn = Math.max(0, game.endsAtUnix - (nowSec - roundStartedAtSec))
    }
  }
  const mmss = `${String(Math.floor(endsIn / 60)).padStart(2, '0')}:${String(endsIn % 60).padStart(2, '0')}`

  // Capture remaining time snapshot when round ends (for overlay display)
  useEffect(() => {
    if (!game) return
    if (!game.running && roundEndedRemainingSec == null) {
      setRoundEndedRemainingSec(endsIn)
    }
    if (game.running && roundEndedRemainingSec != null) {
      setRoundEndedRemainingSec(null)
    }
  }, [game?.running, game?.endsAtUnix, endsIn])

  // On‑board filter: only show alive players placed on the grid
  const onBoard = (p: P) => p.alive && p.x >= 0 && p.y >= 0
  const visiblePlayers = players.filter(onBoard)
  // "Ready" means seen within the recent window (client‑side readiness)
  const READY_MS = 15000
  const nowMsUI = Date.now()
  const isRecentlyActive = (p: P) => nowMsUI - Number(p.lastSeenAtMs) < READY_MS
  // Consider a player "ready" if:
  // - the round is idle and the player has toggled alive (server sets Alive=true on any input), OR
  // - we have seen recent activity heartbeat within READY_MS
  const readyPlayers = players.filter(p => (!game?.running && p.alive) || isRecentlyActive(p))
  const readyCount = readyPlayers.length
  const canStartRound = readyCount >= 2
  // Leaderboard: when running, show on‑board players; when idle, show only ready players (hide ghosts)
  const sourceForLeaderboard = game?.running ? visiblePlayers : readyPlayers
  const leaderboard = sourceForLeaderboard
    .slice()
    .sort((a, b) => b.score - a.score || a.nick.localeCompare(b.nick))

  return (
    <div className="screen" ref={focusTrap} tabIndex={0}>
      <div className="left">
        {game ? (() => {
          const CELL = 42
          const w = game.width * CELL
          const h = game.height * CELL
          const showMyGameOver = !!me && (!me.alive || me.score <= 0)
          const showWinner = game && !game.running
          const overlay = (() => {
            if (!showMyGameOver && !showWinner) return null
            let title = 'Game Over'
            let subtitle = ''
            if (showWinner) {
              const top = [...players].sort((a, b) => b.score - a.score || a.nick.localeCompare(b.nick))[0]
              if (top) { title = 'Winner!'; subtitle = `${top.emoji} ${top.nick} — ${top.score}` }
              else { title = 'Round Over' }
            }
            return (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: 'rgba(0,0,0,0.6)', padding: '16px 24px', borderRadius: 8, color: '#fff', fontFamily: 'monospace', textAlign: 'center', minWidth: 260 }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{title}</div>
                  {subtitle && <div style={{ fontSize: 18, opacity: 0.9 }}>{subtitle}</div>}
                  {showWinner && (
                    <div style={{ fontSize: 14, opacity: 0.85, marginTop: 4 }}>
                      Time Left: {(() => {
                        const sec = roundEndedRemainingSec ?? endsIn
                        const m = Math.floor(sec / 60)
                        const s = sec % 60
                        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
                      })()}
                    </div>
                  )}
                  {!showWinner && me && <div style={{ fontSize: 14, opacity: 0.8, marginTop: 6 }}>Score: {me.score}</div>}
                  {showWinner && (
                    <div style={{ marginTop: 12 }}>
                      <button
                        onClick={() => {
                          if (!canStartRound) {
                            setSystem(s => s + `\nStart blocked: need 2 ready players (have ${readyCount}).`)
                            return
                          }
                          try { conn?.reducers.startRound(120) } catch { }
                        }}
                        style={{
                          padding: '8px 14px',
                          fontFamily: 'monospace',
                          fontSize: 14,
                          background: '#2ecc71',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer'
                        }}
                        disabled={!canStartRound}
                        title={!canStartRound ? `Need 2 ready players (have ${readyCount})` : 'Start'}
                      >
                        {canStartRound ? 'Start New Round' : `Waiting: ${readyCount}/2 ready`}
                      </button>
                      {!canStartRound && (
                        <div style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 12, color: '#ddd' }}>
                          Hint: Press any arrow/WASD in both tabs to ready up.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })()
          return (
            <div style={{ position: 'relative', width: w, height: h }}>
              <Grid game={game} players={visiblePlayers} fruits={fruits} me={playerId} cell={CELL} />
              {overlay}
            </div>
          )
        })() : (
          <div className="empty">No game state yet.</div>
        )}
      </div>

      <aside className="right">
        <header>
          <h2>Royale War: Web Edition</h2>
          <div className="meta">
            <div><b>{game?.running ? 'In Game' : 'Ready'}:</b> {game?.running ? visiblePlayers.length : readyCount}</div>
            <div><b>Round:</b> {game?.running ? 'RUNNING' : 'IDLE'}</div>
            <div><b>Time Left:</b> {mmss}</div>
          </div>
          {!game?.running && (
            <div style={{ fontFamily: 'monospace', fontSize: 12, opacity: 0.85, marginTop: 4 }}>
              Ready: {readyCount}/2 required
            </div>
          )}
        </header>

        <div className="board">
          <h3>Leaderboard</h3>
          <ol>
            {leaderboard.map((p, i) => (
              <li key={p.id} className={p.id === playerId ? 'me' : ''}>
                <span className="nick">{p.emoji} {p.nick}</span>
                <span className="score">{p.score}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="meBox">
          <h4>Your Player:</h4>
          <div className="meIcon">{me?.emoji ?? '🙂'}</div>
          <div className="who">{name}</div>
        </div>

        <div className="buttons">
          {/* {!game?.running && (
            <button onClick={() => { try { conn.reducers.setDir(playerId, 'Right') } catch { } }}>Ready</button>
          )} */}
          <button
            onClick={() => {
              if (!canStartRound) { setSystem(s => s + `\nStart blocked: need 2 ready players (have ${readyCount}).`); return }
              try { conn.reducers.startRound(120) } catch { }
            }}
            disabled={!canStartRound}
            title={!canStartRound ? `Need 2 ready players (have ${readyCount})` : 'Start'}
          >
            Start Round (120s)
          </button>
          {/* <button onClick={() => { try { conn.reducers.tick() } catch { } }} disabled={!game?.running} title={!game?.running ? 'Round is idle' : 'Tick'}>Manual Tick</button> */}
          <button onClick={() => { try { conn.reducers.leaveGame(playerId) } catch { } }}>Leave</button>
          {/* {!canStartRound && !game?.running && (
            <div style={{ marginTop: 6, fontFamily: 'monospace', fontSize: 12, color: '#ccc' }}>
              Make sure two tabs are connected (both show "Your Player").
            </div>
          )} */}
        </div>

        <pre className="logs">{system.trim() || 'OK'}</pre>

        <div className="dpad">
          <button onClick={() => sendDir('Up')}>↑</button>
          <div className="lr">
            <button onClick={() => sendDir('Left')}>←</button>
            <button onClick={() => sendDir('Right')}>→</button>
          </div>
          <button onClick={() => sendDir('Down')}>↓</button>
        </div>
      </aside>
    </div>
  )
}
