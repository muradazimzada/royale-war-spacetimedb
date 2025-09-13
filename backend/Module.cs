using System;
using System.Collections.Generic;
using SpacetimeDB;
using System.Linq;


public static partial class Module
{
    // ─────────────────────────────────────────────────────────────────────────
    // TABLES  (partial struct + field attributes; NO properties)
    // ─────────────────────────────────────────────────────────────────────────

    [Table(Name = "GameState", Public = true)]
    public partial struct GameState
    {
        [SpacetimeDB.PrimaryKey] public string Id;   // "main"
        public int Width;
        public int Height;
        public bool Running;
        public long EndsAtUnix;                      // unix seconds
        public int PlayersOnline;
    }

    [SpacetimeDB.Type]
    public enum Dir { Up, Down, Left, Right }
    [SpacetimeDB.Type]
    public enum FruitKind { Blue, Red }      // Blue +1, Red -1

    [SpacetimeDB.Table(Name = "Player", Public = true)]
    public partial struct Player
    {
        [SpacetimeDB.PrimaryKey] public string Id;   // stable client token
        public string Nick;

        public int X;
        public int Y;

        public Dir Dir;                // current heading
        public Dir? NextDir;           // queued input

        public int Score;
        public bool Alive;

        public long MoveEveryMs;       // per-cell speed
        public long LastStepAtMs;

        public long JoinedAtMs;
        public long LastSeenAtMs;
    }

    [SpacetimeDB.Table(Name = "Fruit", Public = true)]
    public partial struct Fruit
    {
        [SpacetimeDB.PrimaryKey] public string Id;   // guid string
        public FruitKind Kind;
        public int X;
        public int Y;
        public long SpawnedAtMs;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // REDUCERS  (MUST take ReducerContext ctx)
    // ─────────────────────────────────────────────────────────────────────────

    [SpacetimeDB.Reducer]
    public static void JoinGame(ReducerContext ctx, string playerId, string nick)
    {
        var gs = GetOrInitGame(ctx);

        if (!gs.Running)
            StartNewRound(ctx, seconds: 120);

        var existing = ctx.Db.Player.First(p => p.Id == playerId);
        if (existing.HasValue)
        {
            var p0 = existing.Value;
            if (!string.IsNullOrWhiteSpace(nick)) p0.Nick = nick;
            p0.LastSeenAtMs = NowMs();
            ctx.Db.Player.Update(p0);
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
        ctx.Db.Player.Insert(p);

        gs.PlayersOnline = Math.Max(0, gs.PlayersOnline + 1);
        ctx.Db.GameState.Update(gs);
    }

    [SpacetimeDB.Reducer]
    public static void LeaveGame(ReducerContext ctx, string playerId)
    {
        var p = ctx.Db.Player.First(x => x.Id == playerId);
        if (!p.HasValue) return;

        ctx.Db.Player.Delete(p.Value);

        var gs = GetOrInitGame(ctx);
        gs.PlayersOnline = Math.Max(0, gs.PlayersOnline - 1);
        ctx.Db.GameState.Update(gs);
    }

    // Inputs only change desired direction. Movement happens in Tick().
    [SpacetimeDB.Reducer]
    public static void SetDir(ReducerContext ctx, string playerId, string dir)
    {
        var mp = ctx.Db.Player.First(x => x.Id == playerId);
        if (!mp.HasValue) return;
        var p = mp.Value;
        if (!p.Alive) return;

        if (Enum.TryParse<Dir>(dir, true, out var d))
        {
            p.NextDir = d;
            p.LastSeenAtMs = NowMs();
            ctx.Db.Player.Update(p);
        }
    }

    // Host calls this ~10x/sec (open client with #host).
    [SpacetimeDB.Reducer]
    public static void Tick(ReducerContext ctx)
    {
        var gs = GetOrInitGame(ctx);
        if (!gs.Running) return;

        var nowMs = NowMs();
        var nowSec = NowSec();

        // move everyone due a step
        foreach (var pv in ctx.Db.Player.Iter())
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
            ctx.Db.Player.Update(p);

            // fruit consume
            var mf = ctx.Db.Fruit.First(f => f.X == nx && f.Y == ny);
            if (mf.HasValue)
            {
                var fr = mf.Value;
                if (fr.Kind == FruitKind.Blue) p.Score += 1;
                else p.Score = Math.Max(0, p.Score - 1);
                ctx.Db.Fruit.Delete(fr);
                ctx.Db.Player.Update(p);
            }
        }

        // resolve collisions cell-by-cell
        ResolveAllCollisions(ctx);

        // spawn fruits every 5s
        if (nowSec % 5 == 0) SpawnFruit(ctx, 5);

        // end round
        if (nowSec >= gs.EndsAtUnix)
        {
            gs.Running = false;
            ctx.Db.GameState.Update(gs);
        }
    }

    // Optional admin command
    [SpacetimeDB.Reducer]
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
        ctx.Db.GameState.Update(gs);

        // clear fruits
        foreach (var f in ctx.Db.Fruit.Iter()) ctx.Db.Fruit.Delete(f);

        // reset players and spread on map
        foreach (var pv in ctx.Db.Player.Iter())
        {
            var p = pv;
            p.Score = 5; p.Alive = true;
            var (x, y) = RandomEmptyCell(ctx, gs.Width, gs.Height);
            p.X = x; p.Y = y;
            p.Dir = Dir.Right; p.NextDir = null;
            p.LastStepAtMs = NowMs();
            ctx.Db.Player.Update(p);
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
            ctx.Db.Fruit.Insert(new Fruit
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
        // bucket players by cell
        var buckets = new Dictionary<(int, int), List<Player>>();
        foreach (var pv in ctx.Db.Player.Iter())
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
                    ctx.Db.Player.Update(top);
                    ctx.Db.Player.Update(o);
                }
                // equal => bounce (no score change)
            }
        }
    }

    static (int x, int y) RandomEmptyCell(ReducerContext ctx, int w, int h)
    {
        var r = Rng();
        for (int tries = 0; tries < 2000; tries++)
        {
            int x = r.Next(w), y = r.Next(h);
            bool occ = ctx.Db.Player.Any(p => p.Alive && p.X == x && p.Y == y)
                    || ctx.Db.Fruit.Any(f => f.X == x && f.Y == y);
            if (!occ) return (x, y);
        }
        return (r.Next(w), r.Next(h)); // rare fallback
    }

    static GameState GetOrInitGame(ReducerContext ctx)
    {
        var m = ctx.Db.GameState.First(g => g.Id == "main");
        if (m.HasValue) return m.Value;

        var gs = new GameState
        {
            Id = "main",
            Width = 100,
            Height = 100,
            Running = false,
            EndsAtUnix = 0,
            PlayersOnline = 0
        };
        ctx.Db.GameState.Insert(gs);
        return gs;
    }

    static int Mod(int a, int m) => (a % m + m) % m;
    static long NowMs() => DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    static long NowSec() => DateTimeOffset.UtcNow.ToUnixTimeSeconds();

    static readonly object _rngLock = new object();
    static Random _rng = new Random();
    static Random Rng() { lock (_rngLock) return _rng; }
}
