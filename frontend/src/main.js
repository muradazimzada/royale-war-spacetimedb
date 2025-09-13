import { Player } from './entities/Player.js';
import { WORLD_WIDTH, WORLD_HEIGHT } from './config/constants.js';
import { gameState } from './core/GameState.js';
import { setupInputHandlers } from './core/InputManager.js';
import { startGameLoop } from './core/GameLoop.js';

function initGame() {
    gameState.canvas = document.getElementById('canvas');
    gameState.canvasContainer = document.getElementById('canvas-container');
    gameState.context = gameState.canvas.getContext('2d');
    gameState.player = new Player(
        WORLD_WIDTH / 2, WORLD_HEIGHT / 2
    );
    gameState.objects.push(gameState.player);
    
    setupInputHandlers();
    startGameLoop();
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    window.addEventListener('load', initGame);
} else {
    initGame();
}