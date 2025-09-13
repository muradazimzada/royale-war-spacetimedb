import { pxStrToNumber } from './canvas';

export function guiPosition(
    canvasContainer: HTMLElement,
    x: number,
    y: number,
    cb: (adjustedX: number, adjustedY: number) => void
): void {
    const xOffset = pxStrToNumber(canvasContainer.style.left || '0');
    const yOffset = pxStrToNumber(canvasContainer.style.top || '0');

    cb(x - xOffset, y - yOffset);
}

export function guiTopMiddle(
    canvasContainer: HTMLElement,
    cb: (adjustedX: number, adjustedY: number) => void
): void {
    const xCenter = window.innerWidth / 2;
    guiPosition(canvasContainer, xCenter, 50, cb);
}

export function guiTopRight(
    canvasContainer: HTMLElement,
    cb: (adjustedX: number, adjustedY: number) => void
): void {
    guiPosition(canvasContainer, window.innerWidth - 100, 50, cb);
}