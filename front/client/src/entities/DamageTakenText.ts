import type { GameObject } from '../core/GameState';
import { lerp } from '../utils/math';

export class DamageTakenText implements GameObject {
    text: string;
    x: number;
    y: number;
    framesCount: number;
    growAnimationFrames: number;
    fadeAnimationFrames: number;
    fontSize: number;
    fontOpacity: number;
    growToSize: number;
    fillStyle: string;
    strokeColor: string;
    destroyed: boolean;

    constructor(text: string | number, x: number, y: number) {
        this.text = String(text);
        this.x = x;
        this.y = y;
        this.framesCount = 0;
        this.growAnimationFrames = 40;
        this.fadeAnimationFrames = 60;
        this.fontSize = 10;
        this.fontOpacity = 1;
        this.growToSize = 32;
        this.fillStyle = 'white';
        this.strokeColor = 'black';
        this.destroyed = false;
    }

    update(): void {
        this.y -= 0.5;
        if (this.framesCount < this.growAnimationFrames) {
            this.fontSize = lerp(this.fontSize, this.growToSize, 0.4);
        } else if (this.framesCount < this.growAnimationFrames + this.fadeAnimationFrames) {
            this.fontOpacity = lerp(this.fontOpacity, 0, 0.25);
        } else {
            this.destroyed = true;
        }
        this.framesCount += 1;
    }

    draw(context: CanvasRenderingContext2D): void {
        context.save();
        context.font = `${this.fontSize}px monospace`;
        context.fillStyle = this.fillStyle;
        context.strokeStyle = this.strokeColor;
        context.globalAlpha = this.fontOpacity;
        context.fillText(this.text, this.x, this.y);
        context.restore();
    }
}