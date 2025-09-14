import { Weapon } from './Weapon.js';
import { micImage } from '../assets/assetLoader.js';
import { Enemy } from '../entities/Enemy.js';
import { gameState } from '../core/GameState.js';

export class MicWeapon extends Weapon {
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
    }

    update() {
        const player = gameState.player;
        this.angle = (this.angle + (0.05 * this.level)) % 360;
        this.x = player.x + Math.sin(this.angle) * this.radius;
        this.y = player.y + Math.cos(this.angle) * this.radius;
        for (const object of gameState.objects) {
            if (object instanceof Enemy) {
                if (
                    object.id in this.enemiesHit &&
                    ((new Date()) - this.enemiesHit[object.id]) < this.attackSpeed
                ) {
                    continue;
                }

                if (
                    this.x > object.x - 50 &&
                    this.x < object.x + 50 &&
                    this.y > object.y - 50 &&
                    this.y < object.y + 50
                ) {
                    object.hit(this.attackStrength);
                    this.enemiesHit[object.id] = new Date();
                }
            }
        }
    }

    draw(context) {
        const player = gameState.player;
        context.save();
        context.translate(10, 0);
        context.setTransform(-1, 0, 0, -1, this.x, this.y);
        context.rotate(-this.angle);
        context.drawImage(
            this.image,
            -this.image.width / 2, -this.image.height / 2
        );
        context.restore();

        context.beginPath();
        context.moveTo(player.x, player.y);
        context.lineTo(this.x, this.y);
        context.closePath();
        context.stroke();
    }
}