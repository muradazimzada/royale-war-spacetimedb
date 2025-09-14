import { ENEMY_SPAWN_COUNT_PER_WAVE, ENEMY_SPAWN_TIME_BETWEEN_WAVES, MAX_OBJECTS } from '../config/constants.js';
import { randomRange } from '../utils/math.js';
import { Enemy } from '../entities/Enemy.js';
import { gameState } from '../core/GameState.js';

export function spawnEnemies() {
    if (Date.now() - gameState.timeSinceLastEnemySpawn < ENEMY_SPAWN_TIME_BETWEEN_WAVES) return;

    if (gameState.objects.length > MAX_OBJECTS) return;

    for (var i = 0; i <= ENEMY_SPAWN_COUNT_PER_WAVE; i++) {
        const radius = randomRange(900, 1200);
        const angle = randomRange(0, 360);
        const randX = gameState.player.x + Math.sin(angle) * radius;
        const randY = gameState.player.y + Math.cos(angle) * radius;
        gameState.objects.push(new Enemy(randX, randY));
    }
    gameState.timeSinceLastEnemySpawn = Date.now();
}