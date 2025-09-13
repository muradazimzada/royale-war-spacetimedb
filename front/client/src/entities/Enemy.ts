import { Animation } from '../systems/Animation';
import { FACE_LEFT, FACE_RIGHT } from '../config/constants';
import { skeletonImageLeft, skeletonImageLeft2, skeletonImageRight, skeletonImageRight2 } from '../assets/assetLoader';
import { pointInCircle } from '../utils/collision';
import { Player } from './Player';
import { Candy } from './Candy';
import { DamageTakenText } from './DamageTakenText';
import { gameState } from '../core/GameState';

let nextEnemyId = 0;

export function getNextEnemyId(): number {
    const id = nextEnemyId;
    nextEnemyId += 1;
    return id;
}

export class Enemy {
    id: number;
    leftAnimation: Animation;
    rightAnimation: Animation;
    animation: Animation;
    idle: boolean;
    x: number;
    prevX: number;
    y: number;
    prevY: number;
    width: number;
    height: number;
    speed: number;
    health: number;
    attackStrength: number;
    attackSpeed: number;
    lastAttackTime: number;
    destroyed: boolean;
    direction: number;

    constructor(x: number, y: number) {
        this.id = getNextEnemyId();
        this.leftAnimation = new Animation([
            { time: 100, image: skeletonImageLeft() },
            { time: 100, image: skeletonImageLeft2() },
        ]);
        this.rightAnimation = new Animation([
            { time: 100, image: skeletonImageRight() },
            { time: 100, image: skeletonImageRight2() },
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

    update(player: Player): void {
        this.prevX = this.x;
        this.prevY = this.y;

        // handle death state, mark to be destroyed
        if (this.health <= 0) {
            this.destroy();
            return;
        }

        // move towards the player...
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const angle = Math.atan2(dy, dx);
        this.x += this.speed * Math.cos(angle);
        this.y += this.speed * Math.sin(angle);

        // set direction based on movement
        if (dx < 0) {
            this.setDirection(FACE_LEFT);
        } else {
            this.setDirection(FACE_RIGHT);
        }

        // update animation
        this.animation.update(this.idle);

        // handle attacks
        this.handleAttacks(player);
    }

    draw(context: CanvasRenderingContext2D): void {
        // draw the enemy sprite...
        const image = this.animation.image();
        context.drawImage(
            image,
            this.x - (this.width / 2.0),
            this.y - (this.height / 2.0),
            this.width, this.height
        );

        // draw health bar
        this.drawHealthBar(context);
    }

    drawHealthBar(context: CanvasRenderingContext2D): void {
        const barWidth = this.width;
        const barHeight = 6;
        const barY = this.y - (this.height / 2.0) - 10;
        const barX = this.x - (barWidth / 2.0);

        // Background
        context.fillStyle = 'rgba(255, 0, 0, 0.7)';
        context.fillRect(barX, barY, barWidth, barHeight);

        // Health
        const healthPercentage = Math.max(0, this.health / 3); // assuming max health is 3
        context.fillStyle = 'rgba(0, 255, 0, 0.8)';
        context.fillRect(barX, barY, barWidth * healthPercentage, barHeight);
    }

    setDirection(direction: number): void {
        if (this.direction === direction) return;
        this.direction = direction;
        this.animation = this.direction === FACE_LEFT ? this.leftAnimation : this.rightAnimation;
        this.animation.reset();
    }

    handleAttacks(player: Player): void {
        const now = Date.now();
        if (now - this.lastAttackTime > this.attackSpeed) {
            if (pointInCircle(
                player.x, player.y,
                this.x, this.y,
                Math.max(this.width, this.height) / 2
            )) {
                // Attack player
                player.health -= this.attackStrength;
                this.lastAttackTime = now;
            }
        }
    }

    takeDamage(damage: number): void {
        this.health -= damage;
        const damageText = new DamageTakenText(damage, this.x, this.y);
        gameState.addObject(damageText);
    }

    destroy(): void {
        if (this.destroyed) return;
        this.destroyed = true;
        gameState.enemiesDestroyed += 1;

        // Drop candy for player to collect
        const candy = new Candy(this.x, this.y);
        gameState.addObject(candy);
    }
}