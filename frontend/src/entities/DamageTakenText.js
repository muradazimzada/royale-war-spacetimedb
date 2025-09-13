import { lerp } from '../utils/math.js';
import { drawContext } from '../utils/canvas.js';

export class DamageTakenText {
    constructor(text, x, y) {
        this.text = text;
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
    }

    update() {
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

    draw(context) {
        drawContext(
            context,
            () => {
                context.font = `${this.fontSize}px monospace`;
                context.fillStyle = this.fillStyle;
                context.strokeColor = this.strokeColor;
                context.globalAlpha = this.fontOpacity;
            },
            () => context.fillText(this.text, this.x, this.y)
        );
    }
}