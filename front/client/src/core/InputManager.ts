import { KEY_LEFT, KEY_RIGHT, KEY_UP, KEY_DOWN } from '../config/constants';
import { gameState } from './GameState';
import { Enemy } from '../entities/Enemy';

export interface InputState {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
}

export class InputManager {
    private input: InputState = {
        left: false,
        right: false,
        up: false,
        down: false,
    };

    private restartCallback?: () => void;

    private handleKeyDown = (event: KeyboardEvent): void => {
        switch (event.keyCode) {
            case KEY_LEFT:
            case 65: // A key
                this.input.left = true;
                event.preventDefault();
                break;
            case KEY_RIGHT:
            case 68: // D key
                this.input.right = true;
                event.preventDefault();
                break;
            case KEY_UP:
            case 87: // W key
                this.input.up = true;
                event.preventDefault();
                break;
            case KEY_DOWN:
            case 83: // S key
                this.input.down = true;
                event.preventDefault();
                break;
            case 48: // 0 key - debug: destroy all enemies
                this.destroyAllEnemies();
                event.preventDefault();
                break;
            case 82: // R key - restart game
                if (gameState.isGameOver()) {
                    this.restartGame();
                    event.preventDefault();
                }
                break;
        }
    };

    private handleKeyUp = (event: KeyboardEvent): void => {
        switch (event.keyCode) {
            case KEY_LEFT:
            case 65: // A key
                this.input.left = false;
                event.preventDefault();
                break;
            case KEY_RIGHT:
            case 68: // D key
                this.input.right = false;
                event.preventDefault();
                break;
            case KEY_UP:
            case 87: // W key
                this.input.up = false;
                event.preventDefault();
                break;
            case KEY_DOWN:
            case 83: // S key
                this.input.down = false;
                event.preventDefault();
                break;
        }
    };

    setupInputHandlers(): void {
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
    }

    removeInputHandlers(): void {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
    }

    getInput(): InputState {
        return { ...this.input };
    }

    private destroyAllEnemies(): void {
        for (const object of gameState.objects) {
            if (object instanceof Enemy) {
                object.destroy();
            }
        }
    }

    private restartGame(): void {
        if (this.restartCallback) {
            this.restartCallback();
        }
    }

    setRestartCallback(callback: () => void): void {
        this.restartCallback = callback;
    }
}

// Global input manager instance
export const inputManager = new InputManager();