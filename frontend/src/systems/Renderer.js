import { floorImage } from '../assets/assetLoader.js';
import { measureTextDimensions } from '../utils/canvas.js';
import { guiTopMiddle, guiPosition } from '../utils/ui.js';
import { timeSince, leftPad } from '../utils/math.js';
import { gameState } from '../core/GameState.js';

export function resetCanvas() {
    const { context, canvas } = gameState;
    // clear background
    context.clearRect(
        0, 0, canvas.width, canvas.height
    );
    context.beginPath();

    // render background
    context.fillStyle = 'black';
    context.fillRect(
        0, 0, canvas.width, canvas.height
    );
}

export function renderGame() {
    const { context, canvas, player, objects, enemiesDestroyed, levelRunStart, canvasContainer } = gameState;
    
    resetCanvas();

    // draw background
    const bgPattern = context.createPattern(floorImage(), 'repeat');
    context.fillStyle = bgPattern;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // draw world objects
    for (const object of objects) {
        object?.draw(context);
    }

    // draw the gui
    const timer = timeSince(levelRunStart);
    const texts = [
        `❤️: ${player.health}` +
        ` 💀: ${enemiesDestroyed}` +
        ` LV${player.level}` +
        ` ${leftPad(timer.minutes, 2, 0)}:${leftPad(timer.seconds, 2, 0)}`,
    ];
    const measures = texts.map(text => measureTextDimensions(context, text));
    guiTopMiddle(canvasContainer, function(x, y) {
        const width = Math.max(...measures.map(measure => measure.width));
        const height = measures.reduce((acc, measure) => acc + measure.height, 0);
        context.fillStyle = 'white';
        context.fillRect(
            x - (width / 2) - 10, y - height + 10,
            width + 20, height * 2 - 20
        );
        context.font = `24px monospace`;
        context.fillStyle = 'black';
        for (const [index, text] of texts.entries()) {
            context.fillText(
                text,
                x - (width / 2),
                y + (index * 30) + 10,
            );
        }
    });

    // draw xp bar...
    guiPosition(canvasContainer, 0, 0, function(x, y) {
        const currentXp = player.xp - player.prevLevelXp;
        const nextLevelXp = player.nextLevelXp - player.prevLevelXp;
        const percentage = !currentXp ? 0 : currentXp / nextLevelXp;
        context.fillStyle = 'black';
        context.fillRect(x, y, window.innerWidth, 26);

        context.fillStyle = 'blue';
        context.fillRect(
            x + 2, y + 2,
            (window.innerWidth - 4) * percentage,
            22
        );
    });
}

export function renderGameOver() {
    const { context, canvasContainer } = gameState;
    resetCanvas();
    guiTopMiddle(canvasContainer, function(x, y) {
        context.font = '24px monospace';
        context.fillStyle = 'white';
        context.fillText(
            `Game Over`,
            x, y
        );
    });
}