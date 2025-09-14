import { gameState } from './GameState.js';
import { spawnEnemies } from '../systems/SpawnManager.js';
import { renderGame, renderGameOver } from '../systems/Renderer.js';
import { TARGET_FPS } from '../config/constants.js';

export function playGame() {
    if (!gameState.gameRunning) {
        clearInterval(gameState.gameIntervalId);
        return;
    }

    // Update world state
    // handle end game state
    if (gameState.player.health <= 0) {
        renderGameOver();
        return;
    }
    
    // update player
    gameState.player.update(gameState.input, gameState.canvas, gameState.canvasContainer);
    
    // update individual entities
    for (const [index, object] of gameState.objects.entries()) {
        if (object === gameState.player) continue; // player updates separately
        object?.update(gameState.player);
        if (object?.destroyed) {
            gameState.objects.splice(index, 1); // not efficient
        }
    }
    
    // spawner
    spawnEnemies();

    // draw
    renderGame();
}

export function startGameLoop() {
    gameState.levelRunStart = new Date();
    gameState.gameIntervalId = setInterval(
        playGame, 1000 / TARGET_FPS
    );
}