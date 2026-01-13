# Snowglobe & Train 3D Game

A 3D game built with HTML, JavaScript, and CSS using Three.js where you control a train through a snowglobe tunnel!

## Features

- **3D Graphics**: Beautiful winter landscape with snow-covered terrain using Three.js
- **Placement Mode**: Place snowglobes to create your own custom tunnel before driving
- **Snowglobe Types**: Dynamically loaded from USDA files - easily add new types by adding files to the `usda/` folder
- **Train Control**: Realistic train physics with acceleration, deceleration, and turning
- **Tunnel Navigation**: Navigate through holes in the snowglobes - train must fit through!
- **Boundary Constraints**: Train is automatically kept within the tunnel - cannot exit
- **Dynamic Camera**: Smooth camera that follows the train through the tunnel
- **No Installation Required**: Runs entirely in your web browser

## How to Play

### Getting Started

1. **Open the game:**
   - Simply open `index.html` in a modern web browser (Chrome, Firefox, Safari, Edge)
   - Or serve it with a local web server:
     ```bash
     python -m http.server 8000
     # or
     npx http-server
     ```
     Then visit `http://localhost:8000`

### Placement Mode

1. **Place Snowglobes:**
   - Click anywhere on the ground to place a snowglobe
   - Right-click a snowglobe to remove it
   - Drag to rotate the camera view
   - Select snowglobe type using buttons or number keys (1, 2, 3)
   - Place at least 3 snowglobes to enable "Start Driving" button

2. **Snowglobe Types:**
   - All available types are shown as buttons in the UI
   - Use number keys (1, 2, 3, etc.) to quickly switch between types
   - Each type has unique colors and hole sizes
   - Types are automatically loaded from USDA files in the `usda/` folder

3. **Start Driving:**
   - Click "Start Driving" when ready (requires at least 3 snowglobes)
   - Press ESC to return to placement mode

### Driving Mode

1. **Controls:**
   - **W**: Accelerate forward
   - **S**: Reverse/brake
   - **A**: Turn left
   - **D**: Turn right
   - **ESC**: Return to placement mode

2. **Objective:**
   - Drive your train through the holes in the snowglobes
   - The train must fit through the holes - it's small enough to pass!
   - Stay within the tunnel boundaries - you cannot exit!
   - Navigate through your custom tunnel path

## Game Mechanics

- **Placement System**: Design your own tunnel by placing snowglobes before driving
- **Train Physics**: The train has realistic acceleration and deceleration. It can only turn when moving.
- **Hole Navigation**: Each snowglobe has a hole that the train must pass through - train is sized to fit!
- **Collision Detection**: Train is blocked by snowglobe walls but can pass through holes
- **Boundary Constraints**: The train cannot exit the tunnel - it's automatically constrained to stay near placed snowglobes
- **Camera**: 
  - Placement mode: Free camera with orbit controls
  - Driving mode: Smooth camera that follows behind the train
- **Environment**: Winter-themed world with trees and a snowy landscape

## Adding New Snowglobe Types

To add new USDA snowglobe files:

1. **Place your USDA file** in the `usda/` folder
   - Any file ending in `.usda` will be automatically detected
   - Example: `star_snowglobe.usda` or `my_snowglobe.usda`

2. **Make sure you're using a web server:**
   - The game needs a web server to scan the directory
   - Use: `python -m http.server 8000` or `npx http-server`
   - Opening `index.html` directly won't work for file detection

3. **Refresh the game** - The new file will be automatically:
   - Detected from the directory listing
   - Created as a snowglobe type with auto-generated colors
   - Added as a button in the UI
   - Made available for placement

**That's it!** No manifest file or configuration needed - just drop `.usda` files in the `usda/` folder and they'll be automatically loaded.

## Technical Details

- **Built with Three.js** for 3D graphics and WebGL rendering
- **ES6 Modules**: Modern JavaScript with import/export
- **No Dependencies**: Three.js loaded from CDN, no build step required
- **WebGL**: Hardware-accelerated 3D rendering in the browser
- **Real-time Physics**: Delta-time based movement and animation
- **Collision System**: Custom collision detection for train-snowglobe interactions
- **Camera Controls**: OrbitControls for placement, custom follow camera for driving
- **Dynamic File Loading**: Automatically detects and loads USDA files from the `usda/` folder

## Future Enhancements

Potential additions:
- Multiple levels
- Obstacles and challenges
- Particle effects for snow
- Sound effects and music
- More detailed train and snowglobe models
- Power-ups and special items
- Time challenges

Enjoy the game!
