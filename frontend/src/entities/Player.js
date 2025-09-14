import { Animation } from '../systems/Animation.js';
import { FACE_LEFT, FACE_RIGHT } from '../config/constants.js';
import { playerImageLeft, playerImageLeft2, playerImageRight, playerImageRight2 } from '../assets/assetLoader.js';
import { focusCameraOn } from '../utils/canvas.js';
import { MicWeapon } from '../weapons/MicWeapon.js';
import { DiscoBallWeapon } from '../weapons/DiscoBallWeapon.js';

export class Player {
    constructor(x, y, name = 'Player') {
        this.name = name;
        this.leftAnimation = new Animation([
            { time: 12, image: playerImageLeft() },
            { time: 12, image: playerImageLeft2() },
        ]);
        this.rightAnimation = new Animation([
            { time: 12, image: playerImageRight() },
            { time: 12, image: playerImageRight2() },
        ]);
        this.idle = true;
        this.x = x;
        this.y = y;
        this.level = 1;
        this.width = 30 * 2;
        this.height = 33 * 2;
        this.health = 50;
        this.speed = 3;
        this.items = [new MicWeapon(), new DiscoBallWeapon()];
        this.xp = 0;
        this.nextLevelXp = 10;
        this.prevLevelXp = 0;
        this.setDirection(FACE_LEFT);
    }

    update(input, canvas, canvasContainer) {
        // handle player movement...
        if (input.right) this.x += this.speed;
        if (input.left) this.x -= this.speed;
        if (input.up) this.y -= this.speed;
        if (input.down) this.y += this.speed;
        this.idle = !input.right && !input.left && !input.up && !input.down;
        focusCameraOn(canvas, canvasContainer, this.x, this.y);

        // update current animation...
        this.animation.update(this.idle);

        // set the attack state...
        this.items.forEach(item => item.update());
    }

    draw(context) {
        // draw weapons...
        this.items.forEach(item => item.draw(context));

        // draw the player sprite...
        const image = this.animation.image();
        image.width = this.width;
        image.height = this.height;
        context.drawImage(
            image,
            this.x - (this.width / 2.0),
            this.y - (this.height / 2.0),
            this.width, this.height
        );

        // draw player name above sprite
        this.drawName(context);
    }

    drawName(context) {
        context.save();
        
        // Set font and measure text
        context.font = '14px monospace';
        const textMetrics = context.measureText(this.name);
        const textWidth = textMetrics.width;
        const textHeight = 14;
        
        // Position above player sprite
        const nameX = this.x;
        const nameY = this.y - (this.height / 2.0) - 20;
        
        // Draw background rectangle for better readability
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(
            nameX - (textWidth / 2) - 4,
            nameY - textHeight,
            textWidth + 8,
            textHeight + 4
        );
        
        // Draw name text
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.textBaseline = 'top';
        context.fillText(this.name, nameX, nameY - textHeight + 2);
        
        context.restore();
    }

    setDirection(direction) {
        if (this.direction === direction) return;
        this.direction = direction;
        this.animation = this.direction === FACE_LEFT ? this.leftAnimation : this.rightAnimation;
        this.animation.reset();
    }

    gainXp(xp) {
        this.xp += xp;
        if (this.xp >= this.nextLevelXp) this.levelUp();
    }

    levelUp() {
        this.level += 1;
        this.prevLevelXp = this.nextLevelXp;
        this.nextLevelXp = this.nextLevelXp * 2.5;
    }
}