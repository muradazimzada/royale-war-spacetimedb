export interface AnimationFrame {
    time: number;
    image: HTMLImageElement;
}

export class Animation {
    frames: AnimationFrame[] = [];
    currentIndex: number = 0;
    framesPassed: number = 0;

    constructor(frames: AnimationFrame[]) {
        this.frames = frames;
    }

    image(): HTMLImageElement {
        return this.frames[this.currentIndex].image;
    }

    reset(): void {
        this.currentIndex = 0;
        this.framesPassed = 0;
    }

    update(isIdle: boolean): void {
        if (isIdle) {
            this.reset();
            return;
        }

        const currentFrame = this.frames[this.currentIndex];
        if (this.framesPassed >= currentFrame.time) {
            this.next();
        }
        this.framesPassed += 1;
    }

    next(): void {
        this.currentIndex = (this.currentIndex + 1) % this.frames.length;
        this.framesPassed = 0;
    }
}