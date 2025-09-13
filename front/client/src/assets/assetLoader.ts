export function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
        image.src = src;
    });
}

// Asset storage
export const assets: Record<string, HTMLImageElement> = {};

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
} as const;

// Load all assets
export async function loadAllAssets(): Promise<void> {
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

// Asset getters (will return loaded images)
export const playerImageLeft = (): HTMLImageElement => assets.playerImageLeft;
export const playerImageLeft2 = (): HTMLImageElement => assets.playerImageLeft2;
export const playerImageRight = (): HTMLImageElement => assets.playerImageRight;
export const playerImageRight2 = (): HTMLImageElement => assets.playerImageRight2;
export const skeletonImageLeft = (): HTMLImageElement => assets.skeletonImageLeft;
export const skeletonImageLeft2 = (): HTMLImageElement => assets.skeletonImageLeft2;
export const skeletonImageRight = (): HTMLImageElement => assets.skeletonImageRight;
export const skeletonImageRight2 = (): HTMLImageElement => assets.skeletonImageRight2;
export const ballImage1 = (): HTMLImageElement => assets.ballImage1;
export const ballImage2 = (): HTMLImageElement => assets.ballImage2;
export const candyDroppedImage = (): HTMLImageElement => assets.candyDroppedImage;
export const candyImage = (): HTMLImageElement => assets.candyImage;
export const micImage = (): HTMLImageElement => assets.micImage;
export const floorImage = (): HTMLImageElement => assets.floorImage;