import React, { useEffect, useRef, useState } from 'react';
import { loadAllAssets } from '../assets/assetLoader';
import { gameState } from '../core/GameState';
import { gameLoop } from '../core/GameLoop';
import { inputManager } from '../core/InputManager';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../config/constants';
import { LoginScreen } from './LoginScreen';

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

    useEffect(() => {
        loadAssets();
        return () => cleanup();
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

    const handleLogin = (name: string) => {
        setPlayerName(name);
        setShowLogin(false);
        // Don't start game immediately - wait for canvas to render
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
        return <LoginScreen onLogin={handleLogin} />;
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