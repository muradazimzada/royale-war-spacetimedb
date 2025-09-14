using System;
using System.Collections.Generic;
using SpacetimeDB;

public static partial class Module
{
    static readonly bool LOG_MOVES = false;             // set true to trace every move
    static readonly long INACTIVE_KICK_MS = 30_000;     // kick players after 30s inactivity
    const int DEFAULT_STEP_MS = 600;                    // slower step for readability
    // ─────────────────────────────────────────────────────────────────────────
    // TABLES  (partial class + FIELD members; attributes on fields)
    // Names are lowercased in ctx.Db: game_state, player, fruit
    // ─────────────────────────────────────────────────────────────────────────

    [Table(Name = "game_state", Public = true)]
    public partial class GameState
    {
        [PrimaryKey] public string Id;       // "main"
        public int Width;
        public int Height;
        public bool Running;
        public long EndsAtUnix;              // unix seconds
        public int PlayersOnline;
    }

    [SpacetimeDB.Type]
    public enum Dir { Up, Down, Left, Right }
    [SpacetimeDB.Type]
    public enum FruitKind { Blue, Red } // Blue +1, Red -1

    [Table(Name = "player", Public = true)]
    public partial class Player
    {
        [PrimaryKey] public string Id;   // stable client token
        public string Nick;

        public int X;
        public int Y;

        public Dir Dir;                  // current heading
        public Dir? NextDir;             // queued input

        public int Score;
        public bool Alive;

        public long MoveEveryMs;         // per-cell speed
        public long LastStepAtMs;

        public long JoinedAtMs;
        public long LastSeenAtMs;
    }

    [Table(Name = "fruit", Public = true)]
    public partial class Fruit
    {
        [PrimaryKey] public string Id;   // guid string
        public FruitKind Kind;
        public int X;
        public int Y;
        public long SpawnedAtMs;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // REDUCERS  (must accept ReducerContext ctx)
    // ─────────────────────────────────────────────────────────────────────────

    [Reducer]
    public static void JoinGame(ReducerContext ctx, string playerId, string nick)
    {
        Log.Info($"JoinGame called: playerId={playerId}, nick={nick}");
        var gs = GetOrInitGame(ctx);
        // Clean up long-idle players so stale rows don't appear when someone new joins
        CleanInactivePlayers(ctx);
        // Do NOT auto-start a round on join. The round should start only when StartRound is called.

        // PK lookup via generated accessor: ctx.Db.player.Id.Find
        var existing = ctx.Db.player.Id.Find(playerId);
        if (existing is not null)
        {
            if (!string.IsNullOrWhiteSpace(nick)) existing.Nick = nick;
            var now = NowMs();
            existing.LastSeenAtMs = now;
            if (existing.JoinedAtMs == 0) existing.JoinedAtMs = now;
            if (existing.LastStepAtMs == 0) existing.LastStepAtMs = now;
            existing.MoveEveryMs = DEFAULT_STEP_MS;
            existing.Alive = true; // make sure returning players are visible next round
            ctx.Db.player.Id.Update(existing);
            Log.Info($"JoinGame update existing: {existing.Id} at ({existing.X},{existing.Y}) score={existing.Score}");
            return;
        }

        var (x, y) = RandomEmptyCell(ctx, gs.Width, gs.Height);
        var p = new Player
        {
            Id = playerId,
            Nick = string.IsNullOrWhiteSpace(nick) ? "anon" : nick,
            X = x,
            Y = y,
            Dir = Dir.Right,
            NextDir = null,
            Score = 5,
            Alive = true,
            MoveEveryMs = DEFAULT_STEP_MS,
            LastStepAtMs = NowMs(),
            JoinedAtMs = NowMs(),
            LastSeenAtMs = NowMs()
        };
        ctx.Db.player.Insert(p);
        Log.Info($"JoinGame inserted: {p.Id} at ({p.X},{p.Y}) score={p.Score}");

        gs.PlayersOnline = Math.Max(0, gs.PlayersOnline + 1);
        ctx.Db.game_state.Id.Update(gs);
    }

    [Reducer]
    public static void LeaveGame(ReducerContext ctx, string playerId)
    {
        var p = ctx.Db.player.Id.Find(playerId);
        if (p is null) return;

        ctx.Db.player.Delete(p);

        var gs = GetOrInitGame(ctx);
        gs.PlayersOnline = Math.Max(0, gs.PlayersOnline - 1);
        ctx.Db.game_state.Id.Update(gs);
    }

    // Inputs only change desired direction. Movement happens in Tick().
    [Reducer]
    public static void SetDir(ReducerContext ctx, string playerId, string dir)
    {
        var p = ctx.Db.player.Id.Find(playerId);
        if (p is null) { Log.Info($"SetDir: player not found {playerId}"); return; }

        // Always refresh activity so players can "ready up" even if they died last round
        var gs = GetOrInitGame(ctx);
        // Failsafe: if time already expired but a client is still sending inputs, finalize the round
        if (gs.Running && NowSec() >= gs.EndsAtUnix)
        {
            EndRound(ctx);
            return;
        }
        p.LastSeenAtMs = NowMs();
        if (!gs.Running && !p.Alive)
        {
            // Treat input during idle as readiness signal
            p.Alive = true;
        }

        if (Enum.TryParse<Dir>(dir, true, out var d))
        {
            p.NextDir = d;
            Log.Info($"SetDir: {playerId} -> {d}");
        }
        else
        {
            Log.Info($"SetDir: failed to parse '{dir}'");
        }
        ctx.Db.player.Id.Update(p);
    }

    // Host calls this ~10x/sec (open client with #host).
    [Reducer]
    public static void Tick(ReducerContext ctx)
    {
        var gs = GetOrInitGame(ctx);
        if (!gs.Running) return;

        var nowMs = NowMs();
        var nowSec = NowSec();

        // Hard stop: if time is up, end the round immediately
        if (nowSec >= gs.EndsAtUnix)
        {
            EndRound(ctx);
            return;
        }

        // Continuously purge inactive players so ghosts don't linger during a round
        CleanInactivePlayers(ctx);

        // Log once per second so we know Tick is actually running on this DB
        if (_lastTickLogSec != nowSec)
        {
            _lastTickLogSec = nowSec;
            int pc = 0; foreach (var _ in ctx.Db.player.Iter()) pc++;
            // keep logs lightweight
            Log.Info($"Tick@{nowSec}: players={pc}");
        }

        // move everyone due a step
        foreach (var pv in ctx.Db.player.Iter())
        {
            var p = pv;
            if (!p.Alive) continue;

            if (p.NextDir.HasValue)
            {
                var nd = p.NextDir.Value;
                Log.Info($"Apply NextDir {p.Id}: {p.Dir} -> {nd}");
                p.Dir = nd;
                p.NextDir = null;
            }

            // Normalize legacy values to ensure progress
            if (p.MoveEveryMs <= 0 || p.MoveEveryMs > 5000) p.MoveEveryMs = DEFAULT_STEP_MS;
            if (p.LastStepAtMs == 0) p.LastStepAtMs = nowMs - p.MoveEveryMs; // step immediately on first tick

            if (nowMs - p.LastStepAtMs < p.MoveEveryMs) continue;
            p.LastStepAtMs = nowMs;

            int nx = p.X, ny = p.Y;
            switch (p.Dir)
            {
                case Dir.Up: ny = Mod(ny - 1, gs.Height); break;
                case Dir.Down: ny = Mod(ny + 1, gs.Height); break;
                case Dir.Left: nx = Mod(nx - 1, gs.Width); break;
                case Dir.Right: nx = Mod(nx + 1, gs.Width); break;
            }
            if (LOG_MOVES && (nx != p.X || ny != p.Y))
                Log.Info($"Tick move {p.Id} dir={p.Dir} ({p.X},{p.Y}) -> ({nx},{ny})");
            p.X = nx; p.Y = ny;
            ctx.Db.player.Id.Update(p);

            // fruit consume — iterate to find one at (nx,ny)
            var fruit = FindFruitAt(ctx, nx, ny);
            if (fruit is not null)
            {
                if (fruit.Kind == FruitKind.Blue) p.Score += 1;
                else p.Score = Math.Max(0, p.Score - 1);
                if (p.Score <= 0) p.Alive = false;
                ctx.Db.fruit.Delete(fruit);
                ctx.Db.player.Id.Update(p);
            }
        }

        // resolve collisions per cell
        ResolveAllCollisions(ctx);

        // Early end condition: all but one player dead (or none alive)
        int aliveCount = 0;
        Player? topPlayer = null;
        foreach (var pv2 in ctx.Db.player.Iter())
        {
            var p2 = pv2;
            if (p2.Alive) aliveCount++;
            if (topPlayer is null || p2.Score > topPlayer.Score || (p2.Score == topPlayer.Score && string.CompareOrdinal(p2.Nick, topPlayer.Nick) < 0))
                topPlayer = p2;
        }
        if (aliveCount <= 1)
        {
            Log.Info($"Round ended early: alive={aliveCount}, winner={(topPlayer is null ? "none" : topPlayer.Nick + ":" + topPlayer.Id)}");
            EndRound(ctx);
            return; // stop further spawns/checks this tick
        }

        // spawn fruits every 5s (edge-triggered)
        if (_lastFruitSpawnSec < 0) _lastFruitSpawnSec = nowSec;
        if (nowSec - _lastFruitSpawnSec >= 5)
        {
            SpawnFruit(ctx, 5);
            _lastFruitSpawnSec = nowSec;
        }

        // end round
        if (nowSec >= gs.EndsAtUnix)
        {
            gs.Running = false;
            ctx.Db.game_state.Id.Update(gs);
        }
    }

    // Admin helper
    [Reducer]
    public static void StartRound(ReducerContext ctx, int seconds)
    {
        Log.Info($"StartRound called: seconds={seconds}");
        // Mark long-idle players as inactive/off-board; keep only recently active ones
        CleanInactivePlayers(ctx);

        // Require at least 2 READY players (alive AND recently active)
        // Readiness is toggled by any input in SetDir when !gs.Running.
        var nowMs = NowMs();
        int ready = 0;
        foreach (var p in ctx.Db.player.Iter())
            if (p.Alive && nowMs - p.LastSeenAtMs < INACTIVE_KICK_MS) ready++;
        if (ready < 2)
        {
            var gs = GetOrInitGame(ctx);
            gs.Running = false;
            gs.EndsAtUnix = 0;
            ctx.Db.game_state.Id.Update(gs);
            Log.Info($"StartRound aborted: need 2 ready players, have {ready}");
            return;
        }
        StartNewRound(ctx, seconds);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    static void StartNewRound(ReducerContext ctx, int seconds)
    {
        var gs = GetOrInitGame(ctx);
        gs.Running = true;
        gs.EndsAtUnix = DateTimeOffset.UtcNow.AddSeconds(seconds).ToUnixTimeSeconds();
        ctx.Db.game_state.Id.Update(gs);
        Log.Info($"Round started: endsAt={gs.EndsAtUnix} (unix seconds)");

        // clear fruits
        foreach (var f in ctx.Db.fruit.Iter()) ctx.Db.fruit.Delete(f);

        // Reset and spread only READY players (Alive==true and recently active).
        foreach (var pv in ctx.Db.player.Iter())
        {
            var p = pv;
            var now = NowMs();
            if (!p.Alive || now - p.LastSeenAtMs >= INACTIVE_KICK_MS) continue; // only ready & fresh players join

            p.Score = 5;
            // keep Alive=true (was set by readiness input)
            var (x, y) = RandomEmptyCell(ctx, gs.Width, gs.Height);
            p.X = x; p.Y = y;
            p.Dir = Dir.Right; p.NextDir = null;
            p.LastStepAtMs = now;
            // adopt current defaults and backfill legacy zero timestamps
            p.MoveEveryMs = DEFAULT_STEP_MS;
            if (p.JoinedAtMs == 0) p.JoinedAtMs = now;
            p.LastSeenAtMs = now;
            ctx.Db.player.Id.Update(p);
        }

        // initial fruits
        SpawnFruit(ctx, 50);
    }

    static void SpawnFruit(ReducerContext ctx, int count)
    {
        var gs = GetOrInitGame(ctx);
        var r = Rng();
        for (int i = 0; i < count; i++)
        {
            var (x, y) = RandomEmptyCell(ctx, gs.Width, gs.Height);
            var kind = r.NextDouble() < 0.5 ? FruitKind.Blue : FruitKind.Red;
            ctx.Db.fruit.Insert(new Fruit
            {
                Id = Guid.NewGuid().ToString("N"),
                Kind = kind,
                X = x,
                Y = y,
                SpawnedAtMs = NowMs()
            });
        }
    }

    static void ResolveAllCollisions(ReducerContext ctx)
    {
        var buckets = new Dictionary<(int, int), List<Player>>();

        foreach (var pv in ctx.Db.player.Iter())
        {
            var p = pv;
            if (!p.Alive) continue;
            var key = (p.X, p.Y);
            if (!buckets.TryGetValue(key, out var list))
                buckets[key] = list = new List<Player>();
            list.Add(p);
        }

        foreach (var kv in buckets)
        {
            var list = kv.Value;
            if (list.Count <= 1) continue;

            list.Sort((a, b) => b.Score.CompareTo(a.Score)); // strongest first
            var top = list[0];

            for (int i = 1; i < list.Count; i++)
            {
                var o = list[i];
                if (!o.Alive) continue;

                if (top.Score > o.Score)
                {
                    top.Score += 1;
                    o.Score = Math.Max(0, o.Score - 1);
                    if (o.Score <= 0) o.Alive = false;
                    ctx.Db.player.Id.Update(top);
                    ctx.Db.player.Id.Update(o);
                }
                // equal => bounce (no score change)
            }
        }
    }

    static Fruit? FindFruitAt(ReducerContext ctx, int x, int y)
    {
        foreach (var f in ctx.Db.fruit.Iter())
            if (f.X == x && f.Y == y) return f;
        return null;
    }

    static (int x, int y) RandomEmptyCell(ReducerContext ctx, int w, int h)
    {
        var r = Rng();
        for (int tries = 0; tries < 2000; tries++)
        {
            int x = r.Next(w), y = r.Next(h);
            if (!AnyPlayerAt(ctx, x, y) && !AnyFruitAt(ctx, x, y))
                return (x, y);
        }
        return (r.Next(w), r.Next(h)); // rare fallback
    }

    static bool AnyPlayerAt(ReducerContext ctx, int x, int y)
    {
        foreach (var p in ctx.Db.player.Iter())
            if (p.Alive && p.X == x && p.Y == y) return true;
        return false;
    }

    static bool AnyFruitAt(ReducerContext ctx, int x, int y)
    {
        foreach (var f in ctx.Db.fruit.Iter())
            if (f.X == x && f.Y == y) return true;
        return false;
    }

    static GameState GetOrInitGame(ReducerContext ctx)
    {
        const int DesiredWidth = 27;
        const int DesiredHeight = 14;

        var gs = ctx.Db.game_state.Id.Find("main");
        if (gs is not null)
        {
            // If an existing row has stale dimensions (e.g., 100x100 from an older run),
            // normalize it to the desired defaults so code changes take effect without wiping the DB.
            if (gs.Width != DesiredWidth || gs.Height != DesiredHeight)
            {
                gs.Width = DesiredWidth;
                gs.Height = DesiredHeight;
                ctx.Db.game_state.Id.Update(gs);
            }
            // If state says running but endsAt==0, repair it to avoid a stuck round timer.
            if (gs.Running && gs.EndsAtUnix == 0)
            {
                gs.EndsAtUnix = DateTimeOffset.UtcNow.AddSeconds(120).ToUnixTimeSeconds();
                ctx.Db.game_state.Id.Update(gs);
                Log.Info($"Repaired EndsAtUnix while running: {gs.EndsAtUnix}");
            }
            // Convert legacy relative-ends values (e.g., 120) to absolute epoch seconds
            if (gs.Running && gs.EndsAtUnix > 0 && gs.EndsAtUnix < 1_000_000_000)
            {
                gs.EndsAtUnix = DateTimeOffset.UtcNow.AddSeconds((int)gs.EndsAtUnix).ToUnixTimeSeconds();
                ctx.Db.game_state.Id.Update(gs);
                Log.Info($"Converted relative EndsAt to absolute: {gs.EndsAtUnix}");
            }
            return gs;
        }

        gs = new GameState
        {
            Id = "main",
            Width = DesiredWidth,
            Height = DesiredHeight,
            Running = false,
            EndsAtUnix = 0,
            PlayersOnline = 0
        };
        ctx.Db.game_state.Insert(gs);
        return gs;
    }

    static int Mod(int a, int m) => (a % m + m) % m;
    static long NowMs() => DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    static long NowSec() => DateTimeOffset.UtcNow.ToUnixTimeSeconds();

    // single Random instance
    static readonly object _rngLock = new object();
    static Random _rng = new Random();
    static Random Rng() { lock (_rngLock) return _rng; }

    // Lightweight tick logger (at most once per second)
    static long _lastTickLogSec = -1;
    static long _lastFruitSpawnSec = -1;

    static void CleanInactivePlayers(ReducerContext ctx)
    {
        var nowMs = NowMs();
        foreach (var pv in ctx.Db.player.Iter())
        {
            var p = pv;
            if (nowMs - p.LastSeenAtMs > INACTIVE_KICK_MS)
            {
                // Mark as inactive and move off-board instead of deleting the row
                if (p.Alive || p.X >= 0 || p.Y >= 0)
                {
                    p.Alive = false;
                    p.X = -1; p.Y = -1;
                    ctx.Db.player.Id.Update(p);
                }
            }
        }
    }

    static void EndRound(ReducerContext ctx)
    {
        var gs = GetOrInitGame(ctx);
        gs.Running = false;
        gs.EndsAtUnix = 0;
        ctx.Db.game_state.Id.Update(gs);

        // Mark all players inactive and move them off-board so they don't appear on the grid
        foreach (var pv in ctx.Db.player.Iter())
        {
            var p = pv;
            p.Alive = false;
            p.X = -1; p.Y = -1;
            ctx.Db.player.Id.Update(p);
        }
        // Clear fruits as well
        foreach (var f in ctx.Db.fruit.Iter()) ctx.Db.fruit.Delete(f);
    }
}
