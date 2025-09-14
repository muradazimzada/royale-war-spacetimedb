export function pxStrToNumber(value) {
    return Number(value.replace('px', ''));
}

export function measureTextDimensions(context, text) {
    const measure = context.measureText(text);
    return {
        width: measure.width,
        height: measure.actualBoundingBoxAscent + measure.actualBoundingBoxDescent
    };
}

export function drawContext(context, setContextCb, drawCb) {
    const props = ['font', 'fillStyle', 'strokeColor', 'globalAlpha'];
    const originalValues = props.reduce(
        (acc, propName) => (acc[propName] = context[propName], acc), {}
    );
    setContextCb();
    drawCb();
    props.forEach(propName => context[propName] = originalValues[propName]);
}

export function boundXToCanvas(canvas, x) {
    const leftBound = 0;
    const rightBound = canvas.width - window.innerWidth;
    return Math.max(-rightBound, Math.min(leftBound, x));
}

export function boundYToCanvas(canvas, y) {
    const topBound = 0;
    const bottomBound = canvas.height - window.innerHeight;
    return Math.max(-bottomBound, Math.min(topBound, y));
}

export function focusCameraOn(canvas, canvasContainer, targetX, targetY) {
    const xOffset = pxStrToNumber(canvasContainer.style.left);
    const xCenter = window.innerWidth / 2;
    const yOffset = pxStrToNumber(canvasContainer.style.top);
    const yCenter = window.innerHeight / 2;

    canvasContainer.style.left = lerp(
        xOffset,
        boundXToCanvas(canvas, -(targetX - xCenter)),
        0.1
    );

    canvasContainer.style.top = lerp(
        yOffset,
        boundYToCanvas(canvas, -(targetY - yCenter)),
        0.1
    );
}

function lerp(from, to, degree = 1) {
    return from + degree * (to - from);
}