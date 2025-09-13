import { KEY_LEFT, KEY_RIGHT, KEY_UP, KEY_DOWN, FACE_LEFT, FACE_RIGHT } from '../config/constants.js';
import { gameState } from './GameState.js';
import { Enemy } from '../entities/Enemy.js';

export function setupInputHandlers() {
    window.addEventListener('keydown', (e) => {
        if (e.keyCode === KEY_LEFT) {
            gameState.input.left = true;
            gameState.player.setDirection(FACE_LEFT);
        } else if (e.keyCode === KEY_RIGHT) {
            gameState.input.right = true;
            gameState.player.setDirection(FACE_RIGHT);
        } else if (e.keyCode === KEY_UP) gameState.input.up = true;
        else if (e.keyCode === KEY_DOWN) gameState.input.down = true;
    });

    window.addEventListener('keyup', (e) => {
        if (e.keyCode === KEY_LEFT) gameState.input.left = false;
        if (e.keyCode === KEY_RIGHT) gameState.input.right = false;
        if (e.keyCode === KEY_UP) gameState.input.up = false;
        if (e.keyCode === KEY_DOWN) gameState.input.down = false;
        if (e.keyCode === 48) {
            for (const object of gameState.objects) {
                if (object instanceof Enemy) {
                    object.destroy();
                }
            }
        }
    });
}