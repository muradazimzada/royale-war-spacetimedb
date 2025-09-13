import type { GameObject } from '../core/GameState';

export abstract class Weapon implements GameObject {
    attackSpeed: number; // ms
    attackAnimationFrames: number;
    attackStrength: number;
    lastAttackTime: number;
    attacking: boolean;
    attackFramesPassed: number;
    updateFramesPassed: number;
    destroyed?: boolean;

    constructor(speed: number, animationFrames: number, strength?: number) {
        this.attackSpeed = speed;
        this.attackAnimationFrames = animationFrames;
        this.attackStrength = strength || 1;
        this.lastAttackTime = Date.now();
        this.attacking = false;
        this.attackFramesPassed = 0;
        this.updateFramesPassed = 0;
        this.destroyed = false;
    }

    update(): void {
        const msSinceLastAttack = Date.now() - this.lastAttackTime;
        if (msSinceLastAttack > this.attackSpeed) {
            this.attacking = true;
            this.lastAttackTime = Date.now();
        }
        if (this.attacking) {
            this.attackFramesPassed += 1;
            if (this.attackFramesPassed >= this.attackAnimationFrames) {
                this.attacking = false;
                this.attackFramesPassed = 0;
            }
        }
        this.updateFramesPassed += 1;
    }

    draw(context: CanvasRenderingContext2D): void {
        // Override in subclasses
    }

    firstAttackFrame(): boolean {
        return this.attacking && this.attackFramesPassed === 1;
    }
}