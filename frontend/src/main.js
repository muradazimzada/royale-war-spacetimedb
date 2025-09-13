import { Player } from './entities/Player.js';
import { WORLD_WIDTH, WORLD_HEIGHT } from './config/constants.js';
import { gameState } from './core/GameState.js';
import { setupInputHandlers } from './core/InputManager.js';
import { startGameLoop } from './core/GameLoop.js';
import { LoginScreen } from './ui/LoginScreen.js';
import { loadAllAssets } from './assets/assetLoader.js';

async function initGame(playerName) {
    try {
        // Load all assets first
        console.log('Loading assets...');
        await loadAllAssets();
        
        gameState.canvas = document.getElementById('canvas');
        gameState.canvasContainer = document.getElementById('canvas-container');
        gameState.context = gameState.canvas.getContext('2d');
        gameState.player = new Player(
            WORLD_WIDTH / 2, WORLD_HEIGHT / 2, playerName
        );
        gameState.objects.push(gameState.player);
        
        setupInputHandlers();
        startGameLoop();
        
        console.log('Game started successfully!');
    } catch (error) {
        console.error('Failed to initialize game:', error);
        alert('Failed to load game assets. Please refresh the page and try again.');
    }
}

function setupLogin() {
    const loginScreen = new LoginScreen(async (playerName) => {
        await initGame(playerName);
        loginScreen.finishLogin();
    });
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    window.addEventListener('load', setupLogin);
} else {
    setupLogin();
}