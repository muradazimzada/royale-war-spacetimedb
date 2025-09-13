# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Royale War (Disco Survivors) is a browser-based survival game built with vanilla JavaScript, HTML5 Canvas, and Vite. The game features a player character that must survive waves of enemies while collecting power-ups, leveling up, and using various weapons. The codebase has been refactored from a single HTML file into a modular ES6 architecture.

## Development Commands

### Local Development
```bash
npm run dev        # Start Vite dev server on http://localhost:3000
npm run build      # Build for production to dist/
npm run preview    # Preview production build
```

### Installation
```bash
npm install        # Install dependencies (Vite)
```

## Architecture Overview

The game uses a modular ES6 architecture with clear separation of concerns:

### **Core System Flow**
1. **main.js** → Entry point that orchestrates login → asset loading → game initialization
2. **LoginScreen** → Captures player name and shows loading state during asset loading  
3. **AssetLoader** → Promise-based image loading system that prevents "broken image" canvas errors
4. **GameState** → Centralized state management replacing scattered global variables
5. **GameLoop** → Main update/render cycle running at 60 FPS via setInterval

### **Module Structure**
```
src/
├── main.js                 # Entry point and initialization flow
├── config/constants.js     # Game constants and configuration
├── core/
│   ├── GameState.js        # Centralized game state management  
│   ├── GameLoop.js         # Main update/render loop
│   └── InputManager.js     # Keyboard input handling
├── entities/               # Game objects with update/draw methods
│   ├── Player.js           # Player character with name display
│   ├── Enemy.js            # Skeleton enemies with AI
│   ├── Candy.js            # XP pickups with attraction system
│   └── DamageTakenText.js  # Floating damage numbers
├── weapons/                # Weapon system with inheritance
│   ├── Weapon.js           # Base weapon class
│   ├── MicWeapon.js        # Orbiting microphone weapon
│   ├── DiscoBallWeapon.js  # Spawns DiscoPool instances
│   └── DiscoPool.js        # Area-of-effect damage zones
├── systems/
│   ├── Animation.js        # Frame-based sprite animations
│   ├── Renderer.js         # Canvas rendering and UI drawing
│   └── SpawnManager.js     # Enemy wave spawning logic
├── utils/                  # Pure utility functions
│   ├── math.js             # Math helpers (lerp, random, etc.)
│   ├── collision.js        # Collision detection algorithms
│   ├── canvas.js           # Canvas utilities and camera controls
│   └── ui.js               # UI positioning helpers
├── assets/assetLoader.js   # Promise-based image loading
├── ui/LoginScreen.js       # Player name input interface
└── styles/login.css        # Login screen styling
```

## Key Technical Patterns

### **State Management**
- **GameState.js**: Single source of truth for game state, replacing global variables
- **Entity System**: All game objects follow update()/draw() pattern with lifecycle management
- **Objects Array**: Central collection in gameState.objects for all entities except player

### **Asset Loading**
- **Promise-based**: `loadAllAssets()` ensures all images load before game starts
- **Function Exports**: Assets exported as functions (`playerImageLeft()`) to ensure proper loading
- **Error Handling**: Graceful fallback if assets fail to load

### **Camera System**
- **Follow Camera**: Smooth lerp-based camera that follows player via `focusCameraOn()`
- **GUI Positioning**: UI elements positioned relative to camera via `guiPosition()` helpers
- **Canvas Transform**: Uses CSS transforms on canvas container for camera movement

### **Weapon Architecture**
- **Inheritance**: Base `Weapon` class with common attack timing logic
- **Composition**: Player has array of weapon instances that update/draw independently
- **Attack Patterns**: Different weapons use `firstAttackFrame()` for timing-based effects

### **Entity Lifecycle**
- **Creation**: Entities pushed to `gameState.objects` array
- **Updates**: Called each frame with relevant context (player reference for enemies)
- **Destruction**: Marked with `destroyed` flag, removed via array splice
- **Rendering**: Each entity responsible for its own canvas drawing

## Game Mechanics

### **Core Loop**
1. **Input Processing**: Arrow keys update `gameState.input` object
2. **Entity Updates**: Player updates first, then all other entities
3. **Spawning**: Time-based enemy wave generation
4. **Collision Detection**: Circle-based collision for pickups and damage
5. **Rendering**: Clear canvas → draw background → draw entities → draw GUI

### **Player Progression**
- **XP System**: Candy pickups provide XP, with exponential level requirements
- **Health System**: Damage reduces health, game over at 0
- **Weapon Evolution**: Weapons have level properties affecting behavior

### **Enemy AI**
- **Movement**: Enemies move toward player using atan2 for direction
- **Attack Timing**: Cooldown-based attacks when in range
- **Spawning**: Circular spawn pattern around player at configurable intervals

## Important Implementation Notes

### **Performance Considerations**
- **Object Cleanup**: Array.splice() for destroyed entities (marked as inefficient in comments)
- **Image Preloading**: All assets loaded before game starts to prevent runtime errors
- **Animation Updates**: Frame-based rather than time-based for consistency

### **Known Technical Debt**
- **Enemy Updates**: Inefficient array splice during iteration (marked in GameLoop.js:27)
- **Collision Detection**: O(n²) collision checks in weapon systems
- **Global Dependencies**: Some modules still reference gameState directly

### **Asset Requirements**
All PNG assets must be in `public/` directory for Vite static serving:
- Player sprites: `player-1.png`, `player-2.png`, etc.
- Enemy sprites: `skeleton-1.png`, `skeleton-2.png`, etc.
- Weapon/item sprites: `mic.png`, `ball-*.png`, `candy*.png`
- Environment: `floor.png`