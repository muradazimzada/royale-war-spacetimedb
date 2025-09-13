import { Weapon } from './Weapon.js';
import { Animation } from '../systems/Animation.js';
import { ballImage1, ballImage2 } from '../assets/assetLoader.js';
import { randomRange, lerp } from '../utils/math.js';
import { pointInCircle } from '../utils/collision.js';
import { drawContext } from '../utils/canvas.js';
import { Enemy } from '../entities/Enemy.js';
import { gameState } from '../core/GameState.js';

export class DiscoPool extends Weapon {
    constructor() {
        const speed = 2000;
        const animationFrames = 5;
        const strength = 1;
        super(speed, animationFrames, strength);
        this.updateFrames = 60 * 10;
        this.animation = new Animation([
            { time: 12, image: ballImage1 },
            { time: 12, image: ballImage2 },
        ]);
        const player = gameState.player;
        this.x = player.x + randomRange(-300, 300);
        this.y = player.y + randomRange(-300, 300);
        this.fillStyle = 'rgb(225, 180, 255)';
        this.opacity = 0.7;
        this.radius = 80;
    }

    update() {
        super.update();
        this.animation.update();
        if (this.updateFramesPassed > this.updateFrames) {
            this.destroyed = true;
        }
        this.opacity = lerp(this.opacity, 0, 0.002);

        if (this.firstAttackFrame()) {
            // horribly inefficient, iterate over all the objects to find
            // enemies that we are hitting
            for (const object of gameState.objects) {
                if (object instanceof Enemy) {
                    if (!pointInCircle(object.x, object.y, this.x, this.y, this.radius)) continue;
                    object.hit(this.attackStrength);
                }
            }
        }
    }

    draw(context) {
        drawContext(
            context,
            () => {
                context.fillStyle = this.fillStyle;
                context.globalAlpha = this.opacity;
            }, () => {
                context.beginPath();
                context.ellipse(this.x, this.y, this.radius, this.radius, 0, 0, 360);
                context.fill();
            },
        );

        // draw the enemy sprite...
        const image = this.animation.image();
        context.drawImage(
            image,
            this.x - (image.width / 3.2),
            this.y - 140,
            image.width / 2.0, image.height / 2.0
        );
    }
}