import { useEffect, useState, useMemo, useCallback } from 'react';
import {
    DbConnection,
    type ErrorContext,
    type EventContext,
    type Player as PlayerRow,
    type Fruit as FruitRow,
    type GameState as GameStateRow,
} from '../module_bindings';
import { Identity } from '@clockworklabs/spacetimedb-sdk';

interface SpaceTimeDBState {
    connection: DbConnection | null;
    connected: boolean;
    identity: Identity | null;
    isConnecting: boolean;
    error: string | null;
    playerId: string;
    players: PlayerRow[];
    fruits: FruitRow[];
    gameState: GameStateRow | null;
}

interface SpaceTimeDBActions {
    joinGame: (playerName: string) => Promise<void>;
    leaveGame: () => Promise<void>;
    setDirection: (direction: 'Up' | 'Down' | 'Left' | 'Right') => void;
    startRound: (durationSeconds: number) => void;
    tick: () => void;
    updateScore: (newScore: number) => void;
}

export function useSpaceTimeDB(): SpaceTimeDBState & SpaceTimeDBActions {
    const [connection, setConnection] = useState<DbConnection | null>(null);
    const [connected, setConnected] = useState(false);
    const [identity, setIdentity] = useState<Identity | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [players, setPlayers] = useState<PlayerRow[]>([]);
    const [fruits, setFruits] = useState<FruitRow[]>([]);
    const [gameState, setGameState] = useState<GameStateRow | null>(null);

    // Generate or retrieve persistent player ID
    const playerId = useMemo(() => {
        const key = 'rw_player_id';
        let id = localStorage.getItem(key);
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem(key, id);
        }
        return id;
    }, []);

    // Initialize connection
    useEffect(() => {
        const url = import.meta.env.VITE_STDB_URL || 'ws://127.0.0.1:3000';
        const db = import.meta.env.VITE_STDB_DB || 'royale-war';

        console.log('Initializing SpaceTimeDB connection:', { url, db });
        setIsConnecting(true);

        const subscribeToQueries = (conn: DbConnection) => {
            conn.subscriptionBuilder()
                .onApplied(() => {
                    console.log('SpaceTimeDB subscriptions applied');
                })
                .subscribe([
                    'SELECT * FROM player',
                    'SELECT * FROM fruit',
                    'SELECT * FROM game_state',
                ]);
        };

        const onConnect = (conn: DbConnection, id: Identity, token: string) => {
            console.log('Connected to SpaceTimeDB:', id.toHexString());
            setIdentity(id);
            setConnected(true);
            setIsConnecting(false);
            setError(null);
            localStorage.setItem('auth_token', token);
            subscribeToQueries(conn);
        };

        const onDisconnect = () => {
            console.log('Disconnected from SpaceTimeDB');
            setConnected(false);
            setIsConnecting(false);
        };

        const onConnectError = (_ctx: ErrorContext, err: Error) => {
            console.error('SpaceTimeDB connection error:', err);
            setError(err.message);
            setIsConnecting(false);
        };

        const conn = DbConnection.builder()
            .withUri(url)
            .withModuleName(db)
            .withToken(localStorage.getItem('auth_token') || '')
            .onConnect(onConnect)
            .onDisconnect(onDisconnect)
            .onConnectError(onConnectError)
            .build();

        setConnection(conn);

        return () => {
            // Cleanup will be handled by leaveGame
        };
    }, []);

    // Auto-tick to process server-side game logic
    useEffect(() => {
        if (!connection || !connected) return;

        // Start a round first to ensure game is active
        console.log('Starting game round and auto-tick');
        connection.reducers.startRound(3600); // Start 1 hour round

        const tickInterval = setInterval(() => {
            connection.reducers.tick();
        }, 100); // Tick every 100ms for more responsive movement

        return () => {
            console.log('Stopping auto-tick');
            clearInterval(tickInterval);
        };
    }, [connection, connected]);

    // Setup table listeners for players
    useEffect(() => {
        if (!connection || !connected || !connection.db?.player) return;

        const seedPlayers = () => {
            const arr: PlayerRow[] = [];
            for (const player of connection.db.player.iter()) {
                arr.push(player);
            }
            setPlayers(arr);
        };

        const onPlayerInsert = (_: EventContext, player: PlayerRow) => {
            setPlayers(prev => [...prev, player]);
        };

        const onPlayerUpdate = (_: EventContext, oldPlayer: PlayerRow, newPlayer: PlayerRow) => {
            setPlayers(prev => prev.map(p => p.id === oldPlayer.id ? newPlayer : p));
        };

        const onPlayerDelete = (_: EventContext, player: PlayerRow) => {
            setPlayers(prev => prev.filter(p => p.id !== player.id));
        };

        connection.db.player.onInsert(onPlayerInsert);
        connection.db.player.onUpdate(onPlayerUpdate);
        connection.db.player.onDelete(onPlayerDelete);
        seedPlayers();

        return () => {
            if (connection.db?.player) {
                connection.db.player.removeOnInsert(onPlayerInsert);
                connection.db.player.removeOnUpdate(onPlayerUpdate);
                connection.db.player.removeOnDelete(onPlayerDelete);
            }
        };
    }, [connection, connected]);

    // Setup table listeners for fruits
    useEffect(() => {
        if (!connection || !connected || !connection.db?.fruit) return;

        const seedFruits = () => {
            const arr: FruitRow[] = [];
            for (const fruit of connection.db.fruit.iter()) {
                arr.push(fruit);
            }
            setFruits(arr);
        };

        const onFruitInsert = (_: EventContext, fruit: FruitRow) => {
            setFruits(prev => [...prev, fruit]);
        };

        const onFruitUpdate = (_: EventContext, oldFruit: FruitRow, newFruit: FruitRow) => {
            setFruits(prev => prev.map(f => f.id === oldFruit.id ? newFruit : f));
        };

        const onFruitDelete = (_: EventContext, fruit: FruitRow) => {
            setFruits(prev => prev.filter(f => f.id !== fruit.id));
        };

        connection.db.fruit.onInsert(onFruitInsert);
        connection.db.fruit.onUpdate(onFruitUpdate);
        connection.db.fruit.onDelete(onFruitDelete);
        seedFruits();

        return () => {
            if (connection.db?.fruit) {
                connection.db.fruit.removeOnInsert(onFruitInsert);
                connection.db.fruit.removeOnUpdate(onFruitUpdate);
                connection.db.fruit.removeOnDelete(onFruitDelete);
            }
        };
    }, [connection, connected]);

    // Setup table listeners for game state
    useEffect(() => {
        if (!connection || !connected || !connection.db?.game_state) return;

        const seedGameState = () => {
            for (const state of connection.db.game_state.iter()) {
                setGameState(state);
                break; // Only one game state
            }
        };

        const onGameStateInsert = (_: EventContext, state: GameStateRow) => {
            setGameState(state);
        };

        const onGameStateUpdate = (_: EventContext, _oldState: GameStateRow, newState: GameStateRow) => {
            setGameState(newState);
        };

        const onGameStateDelete = (_: EventContext, _state: GameStateRow) => {
            setGameState(null);
        };

        connection.db.game_state.onInsert(onGameStateInsert);
        connection.db.game_state.onUpdate(onGameStateUpdate);
        connection.db.game_state.onDelete(onGameStateDelete);
        seedGameState();

        return () => {
            if (connection.db?.game_state) {
                connection.db.game_state.removeOnInsert(onGameStateInsert);
                connection.db.game_state.removeOnUpdate(onGameStateUpdate);
                connection.db.game_state.removeOnDelete(onGameStateDelete);
            }
        };
    }, [connection, connected]);

    // Actions
    const joinGame = useCallback(async (playerName: string) => {
        if (!connection || !connected) {
            throw new Error('Not connected to SpaceTimeDB');
        }

        try {
            console.log(`Joining game - Player ID: ${playerId}, Name: ${playerName}`);
            await connection.reducers.joinGame(playerId, playerName);
            console.log('Successfully joined game');
        } catch (err) {
            console.error('Failed to join game:', err);
            throw err;
        }
    }, [connection, connected, playerId]);

    const leaveGame = useCallback(async () => {
        if (!connection || !connected) return;

        try {
            await connection.reducers.leaveGame(playerId);
            console.log('Left game successfully');
        } catch (err) {
            console.error('Failed to leave game:', err);
        }
    }, [connection, connected, playerId]);

    const setDirection = useCallback((direction: 'Up' | 'Down' | 'Left' | 'Right') => {
        if (!connection || !connected) return;
        console.log(`Setting direction: ${direction} for player ${playerId}`);
        connection.reducers.setDir(playerId, direction);

        // Also trigger a tick to process the movement server-side
        setTimeout(() => {
            connection.reducers.tick();
        }, 10);
    }, [connection, connected, playerId]);

    const startRound = useCallback((durationSeconds: number) => {
        if (!connection || !connected) return;
        connection.reducers.startRound(durationSeconds);
    }, [connection, connected]);

    const tick = useCallback(() => {
        if (!connection || !connected) return;
        connection.reducers.tick();
    }, [connection, connected]);

    const updateScore = useCallback((newScore: number) => {
        // Note: SpaceTimeDB doesn't have a direct UpdateScore reducer.
        // Score updates should happen server-side during game ticks.
        // This function is kept for interface compatibility but doesn't perform any action.
        console.log(`Score update requested: ${newScore} for player ${playerId} (handled server-side)`);
    }, [playerId]);

    return {
        // State
        connection,
        connected,
        identity,
        isConnecting,
        error,
        playerId,
        players,
        fruits,
        gameState,
        // Actions
        joinGame,
        leaveGame,
        setDirection,
        startRound,
        tick,
        updateScore,
    };
}