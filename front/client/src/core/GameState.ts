export interface GameObject {
    draw(context: CanvasRenderingContext2D): void;
    update?(...args: any[]): void;
    destroyed?: boolean;
}

export class GameState {
    canvas: HTMLCanvasElement | null = null;
    canvasContainer: HTMLElement | null = null;
    context: CanvasRenderingContext2D | null = null;
    player: any = null; // Player type will be set dynamically
    objects: GameObject[] = [];
    enemies: GameObject[] = []; // Keep as GameObject array to avoid circular dependency
    enemiesDestroyed: number = 0;
    levelRunStart: Date = new Date();
    isRunning: boolean = false;
    lastFrameTime: number = 0;

    reset(): void {
        this.objects = [];
        this.enemies = [];
        this.enemiesDestroyed = 0;
        this.levelRunStart = new Date();
        this.isRunning = false;
        this.lastFrameTime = 0;
    }

    addObject(object: GameObject): void {
        this.objects.push(object);
        // Check if object has enemy-like properties to avoid circular dependency
        if ((object as any).id !== undefined && (object as any).health !== undefined && (object as any).attackStrength !== undefined) {
            this.enemies.push(object);
        }
    }

    removeDestroyedObjects(): void {
        this.objects = this.objects.filter(obj => !obj.destroyed);
        this.enemies = this.enemies.filter(enemy => !enemy.destroyed);
    }

    getAliveEnemies(): GameObject[] {
        return this.enemies.filter(enemy => !enemy.destroyed);
    }
}

// Global game state instance
export const gameState = new GameState();