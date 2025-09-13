export function loadImage(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
        image.src = src;
    });
}

// Asset storage
export const assets = {};

// Asset definitions
const assetPaths = {
    playerImageLeft: 'player-1.L.png',
    playerImageLeft2: 'player-2.L.png',
    playerImageRight: 'player-1.png',
    playerImageRight2: 'player-2.png',
    skeletonImageLeft: 'skeleton-1.L.png',
    skeletonImageLeft2: 'skeleton-2.L.png',
    skeletonImageRight: 'skeleton-1.png',
    skeletonImageRight2: 'skeleton-2.L.png',
    ballImage1: 'ball-1.png',
    ballImage2: 'ball-2.png',
    candyDroppedImage: 'candy-dropped.png',
    candyImage: 'candy.png',
    micImage: 'mic.png',
    floorImage: 'floor.png'
};

// Load all assets
export async function loadAllAssets() {
    const loadPromises = Object.entries(assetPaths).map(async ([key, path]) => {
        try {
            assets[key] = await loadImage(path);
            console.log(`Loaded: ${path}`);
        } catch (error) {
            console.error(`Failed to load ${path}:`, error);
            throw error;
        }
    });

    await Promise.all(loadPromises);
    console.log('All assets loaded successfully!');
}

// Export individual assets (will be populated after loading)
export const playerImageLeft = () => assets.playerImageLeft;
export const playerImageLeft2 = () => assets.playerImageLeft2;
export const playerImageRight = () => assets.playerImageRight;
export const playerImageRight2 = () => assets.playerImageRight2;
export const skeletonImageLeft = () => assets.skeletonImageLeft;
export const skeletonImageLeft2 = () => assets.skeletonImageLeft2;
export const skeletonImageRight = () => assets.skeletonImageRight;
export const skeletonImageRight2 = () => assets.skeletonImageRight2;
export const ballImage1 = () => assets.ballImage1;
export const ballImage2 = () => assets.ballImage2;
export const candyDroppedImage = () => assets.candyDroppedImage;
export const candyImage = () => assets.candyImage;
export const micImage = () => assets.micImage;
export const floorImage = () => assets.floorImage;