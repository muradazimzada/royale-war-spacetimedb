# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Client Development
All client development happens in the `client/` directory:

```bash
cd client
pnpm install          # Install dependencies
pnpm dev              # Start development server
pnpm build            # Build for production (runs tsc -b && vite build)
pnpm lint             # Run ESLint
pnpm preview          # Preview production build
```

### Testing
Currently no test framework is configured. Check package.json for any test scripts before assuming testing approach.

## Architecture Overview

This is a **Royale War** game project with dual architecture:

### 1. SpaceTimeDB Multiplayer System
- **Backend**: SpaceTimeDB server for real-time multiplayer synchronization
- **Frontend**: React + TypeScript client (`src/App.tsx`)
- **Generated Code**: `src/module_bindings/` contains auto-generated SpaceTimeDB types and reducers
- **Connection**: WebSocket-based real-time communication
- **Tables**: Player, Fruit, GameState managed server-side
- **Reducers**: JoinGame, LeaveGame, SetDir, StartRound, Tick for game actions

### 2. Local Canvas Game Engine
- **Entry Point**: `src/components/GameCanvas.tsx`
- **Game Loop**: `src/core/GameLoop.ts` - manages frame-rate locked updates at TARGET_FPS
- **Game State**: `src/core/GameState.ts` - centralized state management with GameObject interface
- **Input**: `src/core/InputManager.ts` - keyboard input handling
- **Rendering**: `src/systems/Renderer.ts` - canvas-based sprite rendering
- **Entities**: Player, Enemy, weapons (MicWeapon, DiscoBallWeapon), Candy, damage text
- **Animation**: `src/systems/Animation.ts` - sprite animation system

### Key Integration Points
- **DemoPage**: `src/components/DemoPage.tsx` shows both systems side-by-side
- **Assets**: Sprite images in `public/` loaded via `src/assets/assetLoader.ts`
- **Utilities**: Math, collision detection, canvas operations in `src/utils/`

### SpaceTimeDB Integration
- Module bindings are **auto-generated** - do not edit files in `src/module_bindings/`
- Environment variables: `VITE_STDB_URL` and `VITE_STDB_DB` for connection config
- Real-time data flows through React hooks: `usePlayers()`, `useFruits()`, `useGameState()`

### Entity System Pattern
The local game uses a GameObject interface for all game entities:
```typescript
interface GameObject {
    draw(context: CanvasRenderingContext2D): void;
    update?(...args: any[]): void;
    destroyed?: boolean;
}
```

All entities (Player, Enemy, Weapon, etc.) implement this interface for consistent updating and rendering.

### Configuration
- **Constants**: Game configuration in `src/config/constants.ts`
- **Package Manager**: Uses pnpm with workspace configuration
- **Build Tools**: Vite + TypeScript with React Fast Refresh
- **Linting**: ESLint with TypeScript and React rules

## Important Notes
- The project is in active development transitioning from a frontend-only game to integrated multiplayer
- SpaceTimeDB generates module bindings automatically - never manually edit those files
- The local canvas game is fully functional for testing game mechanics
- Environment setup requires SpaceTimeDB server running for multiplayer features