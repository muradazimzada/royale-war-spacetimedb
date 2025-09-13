import { pxStrToNumber } from './canvas.js';

export function guiPosition(canvasContainer, x, y, cb) {
    const xOffset = pxStrToNumber(canvasContainer.style.left);
    const yOffset = pxStrToNumber(canvasContainer.style.top);

    cb(x - xOffset, y - yOffset);
}

export function guiTopMiddle(canvasContainer, cb) {
    const xCenter = window.innerWidth / 2;
    guiPosition(canvasContainer, xCenter, 50, cb);
}

export function guiTopRight(canvasContainer, cb) {
    guiPosition(canvasContainer, window.innerWidth - 100, 50, cb);
}