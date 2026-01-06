# Quick Setup Guide for Godot Version

## Step 1: Install Godot Engine

1. Go to https://godotengine.org/download
2. Download **Godot 4.3** (Standard version)
3. Extract and run `Godot_v4.3-stable_win64.exe`

## Step 2: Copy Your Character Sprites

Copy these files from the root folder to `godot/sprites/`:
- step1.PNG
- step2.PNG
- step3.PNG
- step4.PNG
- jump1.PNG
- jump2.PNG
- jump3.PNG

## Step 3: Import Project

1. Open Godot Engine
2. Click **"Import"** button
3. Navigate to `C:\Users\croak\Desktop\Projects\flipgame\godot`
4. Select `project.godot`
5. Click **"Import & Edit"**

## Step 4: Set Up Character Animations

Once the project opens:

1. Create the Player scene:
   - Right-click in FileSystem panel
   - New Scene > 2D Scene
   - Rename root node to "Player"
   - Add child node: CharacterBody2D
   - Add child to CharacterBody2D: AnimatedSprite2D
   - Add child to CharacterBody2D: CollisionShape2D
   - Add child to CharacterBody2D: CPUParticles2D (name it "JumpParticles")

2. Set up AnimatedSprite2D:
   - Select AnimatedSprite2D node
   - In Inspector, click "Sprite Frames" > New SpriteFrames
   - Click the SpriteFrames to open animation editor
   - Create animations:
     - **"idle"**: Add step1.PNG
     - **"walk"**: Add step1, step2, step3, step4 (set FPS to 10)
     - **"jump"**: Add jump1, jump2, jump3
     - **"fall"**: Add jump3.PNG

3. Attach player script:
   - Select Player root node
   - Click "Attach Script" button
   - Choose `res://scripts/player.gd`
   - Click "Load"

4. Set up CollisionShape2D:
   - Select CollisionShape2D
   - In Inspector, Shape > New RectangleShape2D
   - Adjust size to match character (~16x16)

5. Save scene as `res://scenes/player.tscn`

## Step 5: Create Tiles

You can either:

**Option A: Use Godot's built-in tile system**
1. Create a new TileSet resource
2. Add tiles for ground, bricks, pipes, etc.
3. Paint your level in the TileMap editor

**Option B: Quick test without tiles**
1. Add StaticBody2D nodes as platforms
2. Add CollisionShape2D to each
3. Add ColorRect or Sprite2D for visuals

## Step 6: Run the Game

Press **F5** or click the Play button!

## Common Issues

**"Invalid scene" error:**
- Make sure you saved player.tscn
- Check that scripts are attached correctly

**Character falls through floor:**
- Set collision layers properly
- Player layer = 1, Ground layer = 2

**Sprites not showing:**
- Make sure sprites are in `godot/sprites/` folder
- Check that AnimatedSprite2D has frames loaded

**Script errors:**
- Check Output panel at bottom
- Make sure all @onready variables point to existing nodes

## What You Get

✅ All the physics from the HTML version (acceleration, coyote time, jump buffering)
✅ Better performance (native code)
✅ Easier to modify and extend
✅ Can export to Windows, Mac, Linux, Web, Mobile
✅ Professional game engine tools
✅ Much smaller file size

## Next Steps

1. **Design levels** using TileMap
2. **Add more enemies** by duplicating enemy scene
3. **Create power-ups** (similar to coin.gd)
4. **Add sound effects** (Godot has built-in audio)
5. **Export to Steam** or publish on itch.io!

Need help? Check the README.md file or Godot documentation at docs.godotengine.org
