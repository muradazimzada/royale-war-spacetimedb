import React, { useEffect, useRef, useState } from 'react';
import { loadAllAssets } from '../assets/assetLoader';
import { gameState } from '../core/GameState';
import { gameLoop } from '../core/GameLoop';
import { inputManager } from '../core/InputManager';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../config/constants';
import { LoginScreen } from './LoginScreen';
import { useSpaceTimeDB } from '../hooks/useSpaceTimeDB';

interface GameCanvasProps {
    width?: number;
    height?: number;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ width = 800, height = 600 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [gameStarted, setGameStarted] = useState(false);
    const [showLogin, setShowLogin] = useState(true);
    const [playerName, setPlayerName] = useState<string>('');

    // Use SpaceTimeDB hook
    const {
        connected,
        isConnecting,
        error: dbError,
        playerId,
        players,
        fruits,
        gameState: dbGameState,
        joinGame,
        leaveGame,
        setDirection,
        updateScore,
        startRound,
        tick
    } = useSpaceTimeDB();

    useEffect(() => {
        loadAssets();
        return () => {
            cleanup();
            // Leave the game when component unmounts
            if (playerName) {
                leaveGame();
            }
        };
    }, []);

    // Start game after login when canvas is ready
    useEffect(() => {
        if (!showLogin && playerName && !gameStarted && !isLoading && !error) {
            // Small delay to ensure canvas is rendered
            const timer = setTimeout(() => {
                startGame(playerName);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [showLogin, playerName, gameStarted, isLoading, error]);

    // Sync local player movement with SpaceTimeDB direction updates
    useEffect(() => {
        if (!connected || !playerName || !gameStarted) return;

        let lastDirection: string | null = null;

        const syncDirection = () => {
            // Get current input state from the input manager
            const input = inputManager.getInput();

            // Determine the primary movement direction based on input
            let dbDirection: string | null = null;

            // Priority: vertical movement first, then horizontal
            if (input.up) {
                dbDirection = 'Up';
            } else if (input.down) {
                dbDirection = 'Down';
            } else if (input.left) {
                dbDirection = 'Left';
            } else if (input.right) {
                dbDirection = 'Right';
            }

            // Only send update if direction actually changed
            if (dbDirection && dbDirection !== lastDirection) {
                console.log(`Syncing direction: ${dbDirection}`);
                setDirection(dbDirection as 'Up' | 'Down' | 'Left' | 'Right');
                lastDirection = dbDirection;
            } else if (!dbDirection && lastDirection) {
                // Player stopped moving, no specific direction to send
                // SpaceTimeDB will handle this naturally
                lastDirection = null;
            }
        };

        // Sync direction every 100ms to match server tick rate
        const syncInterval = setInterval(syncDirection, 100);
        return () => clearInterval(syncInterval);
    }, [connected, playerName, gameStarted, setDirection]);

    const loadAssets = async () => {
        try {
            console.log('Loading game assets...');
            await loadAllAssets();
            setIsLoading(false);
            console.log('Assets loaded successfully!');
        } catch (err) {
            console.error('Failed to load assets:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
            setIsLoading(false);
        }
    };

    const initializeGame = async () => {
        try {
            const canvas = canvasRef.current;
            const container = containerRef.current;

            if (!canvas || !container) {
                throw new Error('Canvas or container not found');
            }

            const context = canvas.getContext('2d');
            if (!context) {
                throw new Error('Could not get canvas context');
            }

            // Setup canvas
            canvas.width = WORLD_WIDTH;
            canvas.height = WORLD_HEIGHT;

            // Setup game state
            gameState.canvas = canvas;
            gameState.canvasContainer = container;
            gameState.context = context;
            gameState.reset();

            // Initialize container style for camera positioning
            container.style.position = 'absolute';
            container.style.left = '0px';
            container.style.top = '0px';

            console.log('Game canvas initialized successfully!');
        } catch (err) {
            console.error('Failed to initialize game:', err);
            throw err;
        }
    };

    const handleLogin = async (name: string) => {
        try {
            // Join the game in SpaceTimeDB
            await joinGame(name);
            setPlayerName(name);
            setShowLogin(false);
            // Don't start game immediately - wait for canvas to render
        } catch (err) {
            console.error('Failed to join game:', err);
            setError(err instanceof Error ? err.message : 'Failed to join game');
        }
    };

    const startGame = async (name: string = 'Player') => {
        try {
            // Initialize game first
            await initializeGame();

            if (!gameState.canvas || !gameState.context || !gameState.canvasContainer) {
                setError('Game not properly initialized');
                return;
            }
            // Create player with the provided name
            const player = new Player(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, name);

            // Set up score synchronization callback
            player.onScoreUpdate = (newScore: number) => {
                console.log(`Local player score updated to: ${newScore}`);
                updateScore(newScore);
            };

            gameState.player = player;
            gameState.addObject(player);

            // Add some demo enemies
            for (let i = 0; i < 5; i++) {
                const x = Math.random() * WORLD_WIDTH;
                const y = Math.random() * WORLD_HEIGHT;
                const enemy = new Enemy(x, y);
                gameState.addObject(enemy);
            }

            // Setup input and start game loop
            inputManager.setupInputHandlers();
            gameLoop.start();

            setGameStarted(true);
            console.log('Game started!');
        } catch (err) {
            console.error('Failed to start game:', err);
            setError(err instanceof Error ? err.message : 'Failed to start game');
        }
    };

    const cleanup = () => {
        gameLoop.stop();
        inputManager.removeInputHandlers();
        gameState.reset();
    };

    // Show login screen first
    if (showLogin && !isLoading && !error) {
        return (
            <div>
                {/* Connection status */}
                {isConnecting && (
                    <div style={{
                        position: 'fixed',
                        top: 20,
                        right: 20,
                        background: 'rgba(0, 0, 0, 0.8)',
                        color: 'white',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        zIndex: 1001
                    }}>
                        Connecting to SpaceTimeDB...
                    </div>
                )}
                {dbError && (
                    <div style={{
                        position: 'fixed',
                        top: 20,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(244, 67, 54, 0.9)',
                        color: 'white',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        zIndex: 1001
                    }}>
                        Database Error: {dbError}
                    </div>
                )}
                {connected && (
                    <div style={{
                        position: 'fixed',
                        bottom: 20,
                        right: 20,
                        background: 'rgba(76, 175, 80, 0.9)',
                        color: 'white',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        zIndex: 1001
                    }}>
                        ✓ Connected to server
                    </div>
                )}
                <LoginScreen onLogin={handleLogin} />
            </div>
        );
    }

    if (isLoading) {
        return (
            <div style={{
                width,
                height,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #333',
                borderRadius: '8px',
                backgroundColor: '#1a1a1a',
                color: 'white'
            }}>
                Loading game assets...
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                width,
                height,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #f44336',
                borderRadius: '8px',
                backgroundColor: '#1a1a1a',
                color: '#f44336',
                padding: '20px'
            }}>
                <h3>Error</h3>
                <p>{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    style={{
                        marginTop: '10px',
                        padding: '8px 16px',
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Reload
                </button>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', overflow: 'hidden', width, height, border: '2px solid #333', borderRadius: '8px' }}>
            {/* SpaceTimeDB Status Panel */}
            <div style={{
                position: 'absolute',
                top: 10,
                left: 10,
                background: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '15px',
                borderRadius: '8px',
                fontSize: '14px',
                zIndex: 100,
                minWidth: '250px'
            }}>
                <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>Player Stats</div>
                <div style={{ marginBottom: '5px' }}>Name: {playerName}</div>
                <div style={{ marginBottom: '5px' }}>ID: {playerId.slice(0, 8)}...</div>

                {/* Local Game Stats */}
                {gameState.player && (
                    <div style={{ marginBottom: '10px', paddingTop: '10px', borderTop: '1px solid #444' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Local Game:</div>
                        <div style={{ marginBottom: '3px' }}>Level: {gameState.player.level}</div>
                        <div style={{ marginBottom: '3px' }}>XP: {gameState.player.xp}</div>
                        <div style={{ marginBottom: '3px' }}>Score: {gameState.player.xp + (gameState.player.level * 10)}</div>
                        <div style={{ marginBottom: '3px' }}>Health: {gameState.player.health}</div>
                    </div>
                )}

                {/* SpaceTimeDB Stats */}
                <div style={{ paddingTop: '10px', borderTop: '1px solid #444' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Database:</div>
                    <div style={{ marginBottom: '5px' }}>
                        Status: {connected ? (
                            <span style={{ color: '#4CAF50' }}>● Connected</span>
                        ) : (
                            <span style={{ color: '#f44336' }}>● Disconnected</span>
                        )}
                    </div>
                    <div style={{ marginBottom: '5px' }}>Online Players: {players.length}</div>

                    {/* Current player's DB stats */}
                    {(() => {
                        const dbPlayer = players.find(p => p.id === playerId);
                        if (dbPlayer) {
                            return (
                                <div>
                                    <div style={{ marginBottom: '3px' }}>DB Score: {dbPlayer.score}</div>
                                    <div style={{
                                        marginBottom: '3px',
                                        color: '#4CAF50' // Highlight position to show updates
                                    }}>
                                        Position: ({dbPlayer.x}, {dbPlayer.y})
                                    </div>
                                    <div style={{ marginBottom: '3px' }}>Dir: {dbPlayer.dir.tag}</div>
                                    <div style={{ marginBottom: '3px' }}>Alive: {dbPlayer.alive ? '✓' : '✗'}</div>
                                    <div style={{ fontSize: '12px', color: '#888' }}>
                                        Last Step: {dbPlayer.lastStepAtMs}
                                    </div>
                                </div>
                            );
                        }
                        return <div style={{ color: '#999' }}>Player not in DB</div>;
                    })()}

                    {dbGameState && (
                        <div style={{ marginBottom: '5px' }}>
                            Game: {dbGameState.running ? 'Running' : 'Waiting'}
                        </div>
                    )}

                    {/* Debug controls */}
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #444' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Debug:</div>
                        <button
                            onClick={() => startRound(3600)}
                            style={{
                                padding: '5px 10px',
                                margin: '2px',
                                fontSize: '12px',
                                backgroundColor: '#4CAF50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer'
                            }}
                        >
                            Start Round
                        </button>
                        <button
                            onClick={() => tick()}
                            style={{
                                padding: '5px 10px',
                                margin: '2px',
                                fontSize: '12px',
                                backgroundColor: '#2196F3',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer'
                            }}
                        >
                            Manual Tick
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                padding: '5px 10px',
                                margin: '2px',
                                fontSize: '12px',
                                backgroundColor: '#FF9800',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer'
                            }}
                        >
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            <div
                ref={containerRef}
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%'
                }}
            >
                <canvas
                    ref={canvasRef}
                    style={{
                        display: 'block',
                        position: 'absolute',
                        left: 0,
                        top: 0
                    }}
                />
            </div>

        </div>
    );
};