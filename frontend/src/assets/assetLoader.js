export function makeImage(src) {
    const image = new Image();
    image.src = src;
    return image;
}

export const playerImageLeft = makeImage('player-1.L.png');
export const playerImageLeft2 = makeImage('player-2.L.png');
export const playerImageRight = makeImage('player-1.png');
export const playerImageRight2 = makeImage('player-2.png');
export const skeletonImageLeft = makeImage('skeleton-1.L.png');
export const skeletonImageLeft2 = makeImage('skeleton-2.L.png');
export const skeletonImageRight = makeImage('skeleton-1.png');
export const skeletonImageRight2 = makeImage('skeleton-2.png');
export const ballImage1 = makeImage('ball-1.png');
export const ballImage2 = makeImage('ball-2.png');
export const candyDroppedImage = makeImage('candy-dropped.png');
export const candyImage = makeImage('candy.png');
export const micImage = makeImage('mic.png');
export const floorImage = makeImage('floor.png');