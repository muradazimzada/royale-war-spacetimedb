import { Weapon } from './Weapon';
import { micImage } from '../assets/assetLoader';
import { gameState } from '../core/GameState';
import { Enemy } from './Enemy';
import { Player } from './Player';

export class MicWeapon extends Weapon {
    level: number;
    radius: number;
    image: HTMLImageElement;
    angle: number;
    enemiesHit: Record<number, Date>;
    x: number;
    y: number;

    constructor() {
        const attackSpeed = 1000; // ms
        const attackAnimationFrames = 5;
        const attackStrength = 1;
        super(attackSpeed, attackAnimationFrames, attackStrength);
        this.level = 8;
        this.radius = 100;
        this.image = micImage();
        this.angle = 0;
        this.enemiesHit = {};
        this.x = 0;
        this.y = 0;
    }

    update(player?: Player): void {
        super.update();

        if (!player) return;

        this.angle = (this.angle + (0.05 * this.level)) % (Math.PI * 2);
        this.x = player.x + Math.sin(this.angle) * this.radius;
        this.y = player.y + Math.cos(this.angle) * this.radius;

        // Check for enemy collisions
        for (const object of gameState.objects) {
            if (object instanceof Enemy) {
                if (
                    object.id in this.enemiesHit &&
                    ((new Date()).getTime() - this.enemiesHit[object.id].getTime()) < this.attackSpeed
                ) {
                    continue;
                }

                if (
                    this.x > object.x - 50 &&
                    this.x < object.x + 50 &&
                    this.y > object.y - 50 &&
                    this.y < object.y + 50
                ) {
                    object.takeDamage(this.attackStrength);
                    this.enemiesHit[object.id] = new Date();
                }
            }
        }
    }

    draw(context: CanvasRenderingContext2D): void {
        if (!gameState.player) return;

        context.save();
        context.translate(10, 0);
        context.setTransform(-1, 0, 0, -1, this.x, this.y);
        context.rotate(-this.angle);
        context.drawImage(
            this.image,
            -this.image.width / 2, -this.image.height / 2
        );
        context.restore();

        // Draw line from player to weapon
        context.beginPath();
        context.moveTo(gameState.player.x, gameState.player.y);
        context.lineTo(this.x, this.y);
        context.closePath();
        context.stroke();
    }
}