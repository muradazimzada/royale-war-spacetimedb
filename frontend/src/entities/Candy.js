import { candyDroppedImage } from '../assets/assetLoader.js';
import { pointInCircle } from '../utils/collision.js';
import { lerp } from '../utils/math.js';

export class Candy {
    constructor(x, y) {
        this.image = candyDroppedImage();
        this.x = x;
        this.y = y;
        this.attractRadius = 200;
        this.pickupRadius = 50;
        this.xp = 1;
    }

    update(player) {
        if (this.destroyed) return;

        if (pointInCircle(this.x, this.y, player.x, player.y, this.pickupRadius)) {
            this.pickup(player);
            return;
        }

        if (pointInCircle(this.x, this.y, player.x, player.y, this.attractRadius)) {
            this.x = lerp(this.x, player.x, 0.1);
            this.y = lerp(this.y, player.y, 0.1);
        }
    }

    draw(context) {
        context.drawImage(
            this.image,
            this.x,
            this.y,
            this.image.width, this.image.height
        );
    }

    pickup(player) {
        if (this.destroyed) return;
        this.destroy();
        player.gainXp(this.xp);
    }

    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
    }
}