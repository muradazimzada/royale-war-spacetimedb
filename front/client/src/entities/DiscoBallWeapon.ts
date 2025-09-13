import { Weapon } from './Weapon';
import { DiscoPool } from './DiscoPool';
import { gameState } from '../core/GameState';
import { randomRange } from '../utils/math';
import type { Player } from './Player';

export class DiscoBallWeapon extends Weapon {
    level: number;

    constructor() {
        const attackSpeed = 14000; // ms
        const attackAnimationFrames = 5;
        super(attackSpeed, attackAnimationFrames);
        this.level = 4;
    }

    spawnCount(): number {
        return this.level;
    }

    update(_player?: Player): void {
        super.update();
        if (this.firstAttackFrame()) {
            const spawnCount = this.spawnCount();
            for (let i = 0; i < spawnCount; i++) {
                setTimeout(() => {
                    const discoPool = new DiscoPool();
                    gameState.addObject(discoPool);
                }, i * (700 + randomRange(0, 100)));
            }
        }
    }

    draw(_context: CanvasRenderingContext2D): void {
        // This weapon doesn't draw itself, it spawns DiscoPool objects
    }
}