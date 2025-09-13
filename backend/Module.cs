using System;
using System.Collections.Generic;
using SpacetimeDB;

public static partial class Module
{
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
        var gs = GetOrInitGame(ctx);

        if (!gs.Running)
            StartNewRound(ctx, seconds: 120);

        // PK lookup via generated accessor: ctx.Db.player.Id.Find
        var existing = ctx.Db.player.Id.Find(playerId);
        if (existing is not null)
        {
            if (!string.IsNullOrWhiteSpace(nick)) existing.Nick = nick;
            existing.LastSeenAtMs = NowMs();
            ctx.Db.player.Id.Update(existing);
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
            MoveEveryMs = 120,
            LastStepAtMs = NowMs(),
            JoinedAtMs = NowMs(),
            LastSeenAtMs = NowMs()
        };
        ctx.Db.player.Insert(p);

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
        if (p is null || !p.Alive) return;

        if (Enum.TryParse<Dir>(dir, true, out var d))
        {
            p.NextDir = d;
            p.LastSeenAtMs = NowMs();
            ctx.Db.player.Id.Update(p);
        }
    }

    // Host calls this ~10x/sec (open client with #host).
    [Reducer]
    public static void Tick(ReducerContext ctx)
    {
        var gs = GetOrInitGame(ctx);
        if (!gs.Running) return;

        var nowMs = NowMs();
        var nowSec = NowSec();

        // move everyone due a step
        foreach (var pv in ctx.Db.player.Iter())
        {
            var p = pv;
            if (!p.Alive) continue;

            if (p.NextDir.HasValue)
            {
                p.Dir = p.NextDir.Value;
                p.NextDir = null;
            }

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
            p.X = nx; p.Y = ny;
            ctx.Db.player.Id.Update(p);

            // fruit consume — iterate to find one at (nx,ny)
            var fruit = FindFruitAt(ctx, nx, ny);
            if (fruit is not null)
            {
                if (fruit.Kind == FruitKind.Blue) p.Score += 1;
                else p.Score = Math.Max(0, p.Score - 1);
                ctx.Db.fruit.Delete(fruit);
                ctx.Db.player.Id.Update(p);
            }
        }

        // resolve collisions per cell
        ResolveAllCollisions(ctx);

        // spawn fruits every 5s
        if (nowSec % 5 == 0) SpawnFruit(ctx, 5);

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

        // clear fruits
        foreach (var f in ctx.Db.fruit.Iter()) ctx.Db.fruit.Delete(f);

        // reset players & spread
        foreach (var pv in ctx.Db.player.Iter())
        {
            var p = pv;
            p.Score = 5; p.Alive = true;
            var (x, y) = RandomEmptyCell(ctx, gs.Width, gs.Height);
            p.X = x; p.Y = y;
            p.Dir = Dir.Right; p.NextDir = null;
            p.LastStepAtMs = NowMs();
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
            var kind = r.NextDouble() < 0.65 ? FruitKind.Blue : FruitKind.Red;
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
        var gs = ctx.Db.game_state.Id.Find("main");
        if (gs is not null) return gs;

        gs = new GameState
        {
            Id = "main",
            Width = 100,
            Height = 100,
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
}
