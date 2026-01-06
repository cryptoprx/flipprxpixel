# 🚀 Godot Quick Start

## You're Almost There!

Your Godot project is ready. Just follow these steps:

### 1. Download Godot (if you haven't)
- Go to: https://godotengine.org/download/windows/
- Download **Godot 4.3 Standard** (80MB)
- Extract and run the .exe file

### 2. Import Project
1. Open Godot
2. Click **"Import"**
3. Browse to: `C:\Users\croak\Desktop\Projects\flipgame\godot`
4. Select `project.godot`
5. Click **"Import & Edit"**

### 3. Set Up Character Animations

Once the project opens:

1. **Open player scene:**
   - Double-click `scenes/player.tscn` in the FileSystem panel

2. **Set up AnimatedSprite2D:**
   - Select the `AnimatedSprite2D` node
   - In Inspector panel (right side), find "Sprite Frames"
   - Click "Sprite Frames" > **"New SpriteFrames"**
   - Click the SpriteFrames resource to open the animation editor (bottom panel)

3. **Create animations:**
   - **idle**: 
     - Click "default" animation, rename to "idle"
     - Drag `sprites/step1.PNG` into the frames area
   
   - **walk**:
     - Click "New Animation" button, name it "walk"
     - Set FPS to 10
     - Drag `step1.PNG`, `step2.PNG`, `step3.PNG`, `step4.PNG` in order
     - Enable "Loop"
   
   - **jump**:
     - Click "New Animation", name it "jump"
     - Drag `jump1.PNG`, `jump2.PNG`, `jump3.PNG`
   
   - **fall**:
     - Click "New Animation", name it "fall"
     - Drag `jump3.PNG`

4. **Save** (Ctrl+S)

### 4. Create a Simple Level

1. **Create a test platform:**
   - In the Scene panel, right-click on "Main" root node
   - Add Child Node > Search "StaticBody2D"
   - Add child to StaticBody2D: CollisionShape2D
   - Select CollisionShape2D
   - In Inspector: Shape > New RectangleShape2D
   - Drag the shape to make a ground platform (about 200x20)
   - Position it at y=136

2. **Add a visual:**
   - Add child to StaticBody2D: ColorRect
   - Set size to match collision shape
   - Set color to brown/green

### 5. Run the Game!

Press **F5** or click the Play button (▶️) at top right!

## 🎮 Controls

- **A/D or Arrow Keys**: Move
- **Space/W/Up/Z**: Jump

## ⚡ What's Working

✅ Realistic physics (acceleration, friction)
✅ Variable jump height (hold longer = higher)
✅ Coyote time (can jump briefly after leaving edge)
✅ Jump buffering (press jump before landing)
✅ Smooth camera follow
✅ Pixel-perfect rendering

## 🔧 Troubleshooting

**"Scene not found" error:**
- Make sure you saved player.tscn (Ctrl+S)

**Character falls through floor:**
- Check that StaticBody2D has a CollisionShape2D
- Make sure shape is positioned correctly

**No animations showing:**
- Verify sprites are in `sprites/` folder
- Check that AnimatedSprite2D has frames loaded

**Script errors:**
- Look at Output panel at bottom
- Make sure player.gd is attached to Player node

## 📚 Next Steps

Once it's running:
1. Use TileMap for better level design
2. Add coins and enemies (scenes ready in scripts/)
3. Export to Windows/Web/Mobile
4. Publish on itch.io or Steam!

Need help? Check README.md or ask me!
