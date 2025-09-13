import { lerp } from './math';

export function pxStrToNumber(value: string): number {
    return Number(value.replace('px', ''));
}

export interface TextDimensions {
    width: number;
    height: number;
}

export function measureTextDimensions(context: CanvasRenderingContext2D, text: string): TextDimensions {
    const measure = context.measureText(text);
    return {
        width: measure.width,
        height: measure.actualBoundingBoxAscent + measure.actualBoundingBoxDescent
    };
}

export function drawContext(
    context: CanvasRenderingContext2D,
    setContextCb: () => void,
    drawCb: () => void
): void {
    const props = ['font', 'fillStyle', 'strokeStyle', 'globalAlpha'] as const;
    const originalValues = props.reduce(
        (acc, propName) => {
            acc[propName] = (context as any)[propName];
            return acc;
        }, {} as Record<string, any>
    );

    setContextCb();
    drawCb();

    props.forEach(propName => {
        (context as any)[propName] = originalValues[propName];
    });
}

export function boundXToCanvas(canvas: HTMLCanvasElement, x: number, containerWidth?: number): number {
    const leftBound = 0;
    const viewWidth = containerWidth || canvas.parentElement?.clientWidth || window.innerWidth;
    const rightBound = canvas.width - viewWidth;
    return Math.max(-rightBound, Math.min(leftBound, x));
}

export function boundYToCanvas(canvas: HTMLCanvasElement, y: number, containerHeight?: number): number {
    const topBound = 0;
    const viewHeight = containerHeight || canvas.parentElement?.clientHeight || window.innerHeight;
    const bottomBound = canvas.height - viewHeight;
    return Math.max(-bottomBound, Math.min(topBound, y));
}

export function focusCameraOn(
    canvas: HTMLCanvasElement,
    canvasContainer: HTMLElement,
    targetX: number,
    targetY: number
): void {
    // Safety check - return early if container is not available
    if (!canvasContainer || !canvasContainer.style) {
        console.warn('Canvas container not available for camera focus');
        return;
    }

    // Initialize style properties if they don't exist
    if (!canvasContainer.style.left) canvasContainer.style.left = '0px';
    if (!canvasContainer.style.top) canvasContainer.style.top = '0px';

    const containerRect = canvasContainer.getBoundingClientRect();
    const xOffset = pxStrToNumber(canvasContainer.style.left);
    const yOffset = pxStrToNumber(canvasContainer.style.top);
    const xCenter = containerRect.width / 2;
    const yCenter = containerRect.height / 2;

    const newLeft = lerp(
        xOffset,
        boundXToCanvas(canvas, -(targetX - xCenter), containerRect.width),
        0.1
    );

    const newTop = lerp(
        yOffset,
        boundYToCanvas(canvas, -(targetY - yCenter), containerRect.height),
        0.1
    );

    canvasContainer.style.left = `${newLeft}px`;
    canvasContainer.style.top = `${newTop}px`;
}