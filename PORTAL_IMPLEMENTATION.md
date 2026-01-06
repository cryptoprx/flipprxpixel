# Portal & Blackhole Mini-Game Implementation Plan

## Features to Implement:

1. **Portal System**
   - Animated portal sprite (swirling pixel animation)
   - Spawns randomly on stages (30% chance per stage)
   - Collision detection with player
   - Triggers blackhole mini-game

2. **Blackhole Mini-Game**
   - Player falls through space
   - Animated blackhole/space background
   - Chart builds up bar by bar
   - 5 bars total, random heights
   - Final bar determines outcome:
     - Green (>50% height) = Continue current stage
     - Red (≤50% height) = Restart from stage 1

3. **Visual Effects**
   - Portal: Rotating/pulsing purple/blue pixels
   - Blackhole: Dark space with stars
   - Chart: Pixel art candlestick bars
   - Smooth transitions

## Code Changes Needed:

1. Add portal state to gameStateRef
2. Add portal spawning logic in loadStage
3. Add portal collision detection in game loop
4. Add blackhole mini-game rendering
5. Add chart building animation
6. Add outcome logic (continue vs restart)
