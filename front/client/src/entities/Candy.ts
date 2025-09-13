import { candyDroppedImage } from '../assets/assetLoader';
import { pointInCircle } from '../utils/collision';
import { lerp } from '../utils/math';
import { Player } from './Player';

export class Candy {
    image: HTMLImageElement;
    x: number;
    y: number;
    attractRadius: number;
    pickupRadius: number;
    xp: number;
    destroyed: boolean;

    constructor(x: number, y: number) {
        this.image = candyDroppedImage();
        this.x = x;
        this.y = y;
        this.attractRadius = 200;
        this.pickupRadius = 50;
        this.xp = 1;
        this.destroyed = false;
    }

    update(player: Player): void {
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

    draw(context: CanvasRenderingContext2D): void {
        if (this.destroyed) return;

        context.drawImage(
            this.image,
            this.x - (this.image.width / 2),
            this.y - (this.image.height / 2),
            this.image.width,
            this.image.height
        );
    }

    pickup(player: Player): void {
        if (this.destroyed) return;
        this.destroy();
        player.gainXp(this.xp);
    }

    destroy(): void {
        if (this.destroyed) return;
        this.destroyed = true;
    }
}