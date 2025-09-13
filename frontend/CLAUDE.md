# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Disco Survivors is a browser-based survival game built with vanilla JavaScript and HTML5 Canvas. The game features a player character that must survive waves of enemies while collecting power-ups and leveling up.

## Architecture

The entire game is implemented in a single `index.html` file with inline JavaScript. Key components include:

- **Game Loop**: Main update/draw cycle running at 60 FPS via `setInterval`
- **Entity System**: Base classes for Player, Enemy, Weapon, and other game objects
- **Animation System**: Frame-based sprite animations for character movement
- **Weapon System**: Inheritance-based weapon classes (MicWeapon, DiscoBallWeapon)
- **Canvas Rendering**: Direct 2D canvas API usage for all rendering

## Development Commands

### Running the Game
```bash
# Start a local web server (Python 3)
python3 -m http.server 8000

# Then open http://localhost:8000 in a browser
```

### Alternative Server Options
```bash
# Node.js http-server (if installed)
npx http-server

# PHP built-in server
php -S localhost:8000
```

## Key Game Mechanics

- **Movement**: Arrow keys control player movement
- **Combat**: Automatic weapon attacks on timers
- **Experience System**: Collecting candy drops provides XP for leveling
- **Enemy Spawning**: Wave-based spawning with configurable intervals
- **Collision Detection**: Circle-based collision for pickups and damage

## Asset Structure

All game assets are PNG images in the root directory:
- Character sprites (player-*.png, skeleton-*.png)
- Weapon/item sprites (mic.png, ball-*.png, candy*.png)
- Environment (floor.png)