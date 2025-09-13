import { TARGET_FPS, ENEMY_SPAWN_COUNT_PER_WAVE, ENEMY_SPAWN_TIME_BETWEEN_WAVES, MAX_OBJECTS } from '../config/constants';
import { gameState } from './GameState';
import { inputManager } from './InputManager';
import { renderGame } from '../systems/Renderer';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { randomRange } from '../utils/math';

interface GameRenderState {
    context: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;
    canvasContainer: HTMLElement;
    player: Player;
    objects: any[];
    enemiesDestroyed: number;
    levelRunStart: Date;
}

export class GameLoop {
    private isRunning: boolean = false;
    private lastFrameTime: number = 0;
    private frameInterval: number = 1000 / TARGET_FPS;
    private lastEnemySpawnTime: number = 0;

    start(): void {
        if (this.isRunning) return;

        this.isRunning = true;
        gameState.isRunning = true;
        this.lastFrameTime = performance.now();
        this.lastEnemySpawnTime = Date.now();
        this.loop();
    }

    stop(): void {
        this.isRunning = false;
        gameState.isRunning = false;
    }

    private loop = (): void => {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;

        if (deltaTime >= this.frameInterval) {
            this.update();
            this.render();
            this.lastFrameTime = currentTime - (deltaTime % this.frameInterval);
        }

        requestAnimationFrame(this.loop);
    };

    private update(): void {
        if (!gameState.canvas || !gameState.canvasContainer || !gameState.context || !gameState.player) {
            return;
        }

        const input = inputManager.getInput();

        // Update player
        gameState.player.update(input, gameState.canvas, gameState.canvasContainer);

        // Update all game objects
        gameState.objects.forEach(obj => {
            if (obj.update && typeof obj.update === 'function') {
                obj.update(gameState.player);
            }
        });

        // Spawn enemies periodically
        this.spawnEnemies();

        // Remove destroyed objects
        gameState.removeDestroyedObjects();
    }

    private render(): void {
        if (!gameState.canvas || !gameState.canvasContainer || !gameState.context || !gameState.player) {
            return;
        }

        const renderState: GameRenderState = {
            context: gameState.context,
            canvas: gameState.canvas,
            canvasContainer: gameState.canvasContainer,
            player: gameState.player,
            objects: gameState.objects,
            enemiesDestroyed: gameState.enemiesDestroyed,
            levelRunStart: gameState.levelRunStart,
        };

        renderGame(renderState);
    }

    private spawnEnemies(): void {
        if (!gameState.player) return;

        const now = Date.now();
        if (now - this.lastEnemySpawnTime < ENEMY_SPAWN_TIME_BETWEEN_WAVES) return;

        if (gameState.objects.length > MAX_OBJECTS) return;

        // Spawn enemies in a circle around the player
        for (let i = 0; i < ENEMY_SPAWN_COUNT_PER_WAVE; i++) {
            const radius = randomRange(900, 1200);
            const angle = randomRange(0, Math.PI * 2);
            const randX = gameState.player.x + Math.sin(angle) * radius;
            const randY = gameState.player.y + Math.cos(angle) * radius;
            const enemy = new Enemy(randX, randY);
            gameState.addObject(enemy);
        }

        this.lastEnemySpawnTime = now;
    }
}

// Global game loop instance
export const gameLoop = new GameLoop();