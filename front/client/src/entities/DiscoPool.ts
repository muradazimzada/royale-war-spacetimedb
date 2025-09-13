import { Weapon } from './Weapon';
import { Animation } from '../systems/Animation';
import { ballImage1, ballImage2 } from '../assets/assetLoader';
import { gameState } from '../core/GameState';
import { Enemy } from './Enemy';
import { pointInCircle } from '../utils/collision';
import { randomRange, lerp } from '../utils/math';

export class DiscoPool extends Weapon {
    updateFrames: number;
    animation: Animation;
    x: number;
    y: number;
    fillStyle: string;
    opacity: number;
    radius: number;

    constructor() {
        const speed = 2000;
        const animationFrames = 5;
        const strength = 1;
        super(speed, animationFrames, strength);
        this.updateFrames = 60 * 10;
        this.animation = new Animation([
            { time: 12, image: ballImage1() },
            { time: 12, image: ballImage2() },
        ]);
        this.x = (gameState.player?.x || 0) + randomRange(-300, 300);
        this.y = (gameState.player?.y || 0) + randomRange(-300, 300);
        this.fillStyle = 'rgb(225, 180, 255)';
        this.opacity = 0.7;
        this.radius = 80;
    }

    update(): void {
        super.update();
        this.animation.update(false);
        if (this.updateFramesPassed > this.updateFrames) {
            this.destroyed = true;
        }
        this.opacity = lerp(this.opacity, 0, 0.002);

        if (this.firstAttackFrame()) {
            // Check for enemy collisions within radius
            for (const object of gameState.objects) {
                if (object instanceof Enemy) {
                    if (!pointInCircle(object.x, object.y, this.x, this.y, this.radius)) continue;
                    object.takeDamage(this.attackStrength);
                }
            }
        }
    }

    draw(context: CanvasRenderingContext2D): void {
        // Draw disco ball effect
        context.save();
        context.fillStyle = this.fillStyle;
        context.globalAlpha = this.opacity;
        context.beginPath();
        context.ellipse(this.x, this.y, this.radius, this.radius, 0, 0, Math.PI * 2);
        context.fill();
        context.restore();

        // Draw the disco ball sprite
        const image = this.animation.image();
        context.drawImage(
            image,
            this.x - (image.width / 3.2),
            this.y - 140,
            image.width / 2.0, image.height / 2.0
        );
    }
}