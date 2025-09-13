import { Weapon } from './Weapon.js';
import { DiscoPool } from './DiscoPool.js';
import { randomRange } from '../utils/math.js';
import { gameState } from '../core/GameState.js';

export class DiscoBallWeapon extends Weapon {
    constructor() {
        const attackSpeed = 14000; // ms
        const attackAnimationFrames = 5;
        super(attackSpeed, attackAnimationFrames);
        this.level = 4;
    }

    spawnCount() {
        return this.level;
    }

    update() {
        super.update();
        if (this.firstAttackFrame()) {
            const spawnCount = this.spawnCount();
            for (var i = 0; i < spawnCount; i++) {
                setTimeout(() => {
                    gameState.objects.push(
                        new DiscoPool()
                    );
                }, i * (700 + randomRange(0, 100)));
            }
        }
    }

    draw(context) {}
}