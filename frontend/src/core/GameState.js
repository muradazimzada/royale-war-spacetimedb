export const gameState = {
    gameRunning: true,
    player: null,
    canvas: null,
    canvasContainer: null,
    context: null,
    gameIntervalId: null,
    levelRunStart: null,
    input: {
        right: false,
        left: false,
        up: false,
        down: false,
    },
    objects: [],
    enemiesDestroyed: 0,
    timeSinceLastEnemySpawn: Date.now()
};