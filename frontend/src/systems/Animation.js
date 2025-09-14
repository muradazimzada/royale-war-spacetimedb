export class Animation {
    frames = [ /*{time: ..., image: ...}*/ ];
    currentIndex = 0;
    framesPassed = 0;

    constructor(frames) {
        this.frames = frames;
    }

    image() {
        return this.frames[this.currentIndex].image;
    }

    reset() {
        this.currentIndex = 0;
        this.currentFrameStart = new Date();
    }

    update(isIdle) {
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

    next() {
        this.currentIndex = (this.currentIndex + 1) % this.frames.length;
        this.framesPassed = 0;
    }
}