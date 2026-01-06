# Flip Game - Godot Edition

A colorful pixel platformer game built with Godot Engine 4.3.

## Features

- **Realistic Physics**: Acceleration-based movement, variable jump height, coyote time, and jump buffering
- **Pixel-Perfect Rendering**: Authentic retro Game Boy aesthetic
- **Parallax Backgrounds**: Mountains and hills for depth
- **Particle Effects**: Coin collection and jump dust particles
- **Smooth Camera**: Follow player with deadzone
- **Collectibles & Enemies**: Coins to collect and enemies to stomp

## Controls

- **Arrow Keys / WASD**: Move left/right
- **Space / W / Up / Z**: Jump
- Hold jump longer for higher jumps!

## How to Run

1. Download and install [Godot Engine 4.3](https://godotengine.org/download)
2. Open Godot and click "Import"
3. Navigate to this folder and select `project.godot`
4. Click "Import & Edit"
5. Press F5 to run the game

## How to Export

### Windows
1. Go to Project > Export
2. Add "Windows Desktop" preset
3. Click "Export Project"

### Web (HTML5)
1. Go to Project > Export
2. Add "Web" preset
3. Click "Export Project"
4. Upload to itch.io or your web server

### Mobile (Android/iOS)
1. Install export templates
2. Add Android or iOS preset
3. Configure signing keys
4. Export!

## Project Structure

```
godot/
├── project.godot          # Project configuration
├── scenes/
│   ├── main.tscn         # Main game scene
│   ├── player.tscn       # Player character
│   ├── coin.tscn         # Collectible coin
│   ├── enemy.tscn        # Enemy character
│   └── tilemap.tscn      # Level tiles
├── scripts/
│   ├── player.gd         # Player controller
│   ├── coin.gd           # Coin logic
│   ├── enemy.gd          # Enemy AI
│   └── game_manager.gd   # Score & game state
├── sprites/              # Character sprites (copy from root)
│   ├── step1.PNG
│   ├── step2.PNG
│   ├── step3.PNG
│   ├── step4.PNG
│   ├── jump1.PNG
│   ├── jump2.PNG
│   └── jump3.PNG
└── assets/               # Generated tiles and effects
```

## Next Steps

1. **Copy your character sprites** from the root folder to `godot/sprites/`
2. **Open in Godot** and set up the AnimatedSprite2D frames
3. **Create tile textures** for ground, bricks, pipes, etc.
4. **Add more levels** by duplicating the tilemap
5. **Export to Steam** or publish on itch.io!

## Advantages Over HTML Version

✅ **Better Performance**: Native code runs 2-5x faster
✅ **Easier Physics**: Built-in CharacterBody2D handles everything
✅ **Multi-Platform**: Export to Windows, Mac, Linux, Web, Mobile, Consoles
✅ **Smaller File Size**: ~10MB vs 50MB+ with web version
✅ **Professional Tools**: Visual editor, debugger, profiler
✅ **Monetization**: Sell on Steam, Epic, itch.io, mobile stores

## Tips

- Use `Ctrl+S` to save scenes frequently
- Press `F6` to run current scene
- Press `F8` to debug with breakpoints
- Check the Output panel for errors
- Read Godot docs at docs.godotengine.org

Enjoy your upgraded game! 🎮
