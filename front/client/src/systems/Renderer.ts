import { floorImage } from '../assets/assetLoader';
import { measureTextDimensions } from '../utils/canvas';
import { guiTopMiddle } from '../utils/ui';
import { timeSince, leftPad } from '../utils/math';
import { Player } from '../entities/Player';

interface GameRenderState {
    context: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;
    canvasContainer: HTMLElement;
    player: Player;
    objects: any[];
    enemiesDestroyed: number;
    levelRunStart: Date;
}

export function resetCanvas(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    // clear background
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.beginPath();

    // render background
    context.fillStyle = 'black';
    context.fillRect(0, 0, canvas.width, canvas.height);
}

export function renderGame(renderState: GameRenderState): void {
    const { context, canvas, player, objects, enemiesDestroyed, levelRunStart, canvasContainer } = renderState;

    resetCanvas(context, canvas);

    // Check for game over
    if (player.health <= 0) {
        renderGameOver(context, canvasContainer);
        return;
    }

    // draw background
    const bgPattern = context.createPattern(floorImage(), 'repeat');
    if (bgPattern) {
        context.fillStyle = bgPattern;
        context.fillRect(0, 0, canvas.width, canvas.height);
    }

    // draw world objects
    for (const object of objects) {
        if (object && typeof object.draw === 'function') {
            object.draw(context);
        }
    }

    // draw the gui
    const timer = timeSince(levelRunStart);
    const texts = [
        `❤️: ${player.health}` +
        ` 💀: ${enemiesDestroyed}` +
        ` LV${player.level}` +
        ` ${leftPad(timer.minutes, 2, '0')}:${leftPad(timer.seconds, 2, '0')}`,
    ];

    const measures = texts.map(text => measureTextDimensions(context, text));

    guiTopMiddle(canvasContainer, function(x: number, y: number) {
        const width = Math.max(...measures.map(measure => measure.width));
        const height = measures.reduce((acc, measure) => acc + measure.height, 0);

        // Background for GUI
        context.fillStyle = 'rgba(0, 0, 0, 0.7)';
        context.fillRect(x - width / 2 - 10, y - 10, width + 20, height + 20);

        // GUI text
        context.fillStyle = 'white';
        context.font = '16px monospace';
        context.textAlign = 'center';
        context.textBaseline = 'top';

        texts.forEach((text, index) => {
            context.fillText(text, x, y + (index * 20));
        });
    });

    // draw xp bar...
    renderXpBar(context, player);
}

function renderGameOver(context: CanvasRenderingContext2D, canvasContainer: HTMLElement): void {
    guiTopMiddle(canvasContainer, function(x: number, y: number) {
        context.font = '24px monospace';
        context.fillStyle = 'white';
        context.textAlign = 'center';
        context.textBaseline = 'top';
        context.fillText('Game Over', x, y);

        // Add restart instruction
        context.font = '16px monospace';
        context.fillStyle = '#aaa';
        context.fillText('Press R to restart', x, y + 40);
    });
}

function renderXpBar(context: CanvasRenderingContext2D, player: Player): void {
    const currentXp = player.xp - player.prevLevelXp;
    const nextLevelXp = player.nextLevelXp - player.prevLevelXp;
    const percentage = !currentXp ? 0 : currentXp / nextLevelXp;

    // Get viewport dimensions
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 800;

    context.fillStyle = 'black';
    context.fillRect(0, 0, viewportWidth, 26);

    context.fillStyle = 'blue';
    context.fillRect(
        2, 2,
        (viewportWidth - 4) * percentage,
        22
    );
}