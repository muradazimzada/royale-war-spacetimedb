import { Animation } from '../systems/Animation.js';
import { FACE_LEFT, FACE_RIGHT } from '../config/constants.js';
import { skeletonImageLeft, skeletonImageLeft2, skeletonImageRight, skeletonImageRight2 } from '../assets/assetLoader.js';
import { pointInCircle } from '../utils/collision.js';
import { DamageTakenText } from './DamageTakenText.js';
import { Candy } from './Candy.js';
import { gameState } from '../core/GameState.js';

let nextEnemyId = 0;

export function getNextEnemyId() {
    const id = nextEnemyId;
    nextEnemyId += 1;
    return id;
}

export class Enemy {
    constructor(x, y) {
        this.id = getNextEnemyId();
        this.leftAnimation = new Animation([
            { time: 100, image: skeletonImageLeft },
            { time: 100, image: skeletonImageLeft2 },
        ]);
        this.rightAnimation = new Animation([
            { time: 100, image: skeletonImageRight },
            { time: 100, image: skeletonImageRight2 },
        ]);
        this.idle = false;
        this.x = x;
        this.prevX = x;
        this.y = y;
        this.prevY = y;
        this.width = 30 * 2;
        this.height = 33 * 2;
        this.speed = 0.4;
        this.health = 3;
        this.attackStrength = 1;
        this.attackSpeed = 500; // ms
        this.lastAttackTime = Date.now();
        this.destroyed = false;
        this.setDirection(FACE_LEFT);
    }

    update(player) {
        this.prevX = this.x;
        this.prevY = this.y;

        // handle death state, mark to be destroyed
        // and don't do anything once health is at
        // 0
        if (this.health <= 0) {
            this.destroy();
            return;
        }

        // move towards the player...
        var dx = player.x - this.x;
        var dy = player.y - this.y;
        var angle = Math.atan2(dy, dx);
        this.x += this.speed * Math.cos(angle);
        this.y += this.speed * Math.sin(angle);

        // handle setting attack state...
        let attacking = false;
        const msSinceLastAttack =
            Date.now() - this.lastAttackTime;
        if (msSinceLastAttack > this.attackSpeed) {
            attacking = true;
            this.lastAttackTime = Date.now();
        }

        // handle direction...
        this.setDirection(this.x > this.prevX ? FACE_RIGHT : FACE_LEFT);

        // update current animation...
        this.animation.update(this.idle);

        const nearPlayer = pointInCircle(
            this.x, this.y, player.x, player.y, 150
        );
        if (nearPlayer) {
            // enemy is close enough to player to
            // attack them
            if (
                attacking &&
                Math.abs(dx) < 40 &&
                Math.abs(dy) < 40
            ) {
                player.health = Math.max(
                    player.health - this.attackStrength,
                    0
                );
            }
        }
    }

    draw(context) {
        const image = this.animation.image();
        image.width = this.width;
        image.height = this.height;
        context.drawImage(
            image, this.x, this.y, this.width, this.height
        );
    }

    setDirection(direction, reset = true) {
        if (this.direction === direction) return;
        this.direction = direction;
        this.animation = this.direction === FACE_LEFT ? this.leftAnimation : this.rightAnimation;
        if (reset) this.animation.reset();
    }

    hit(strength) {
        this.health -= strength;
        gameState.objects.push(
            new DamageTakenText(
                strength, this.x, this.y
            )
        );
    }

    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        gameState.enemiesDestroyed += 1;
        gameState.objects.push(new Candy(this.x, this.y));
    }
}