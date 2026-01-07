// Stage generator for creating 10 progressively harder levels

export interface StageData {
  platforms: Array<{ x: number; y: number; width: number; height: number; type: string }>;
  coins: Array<{ x: number; y: number; collected: boolean; floatOffset: number }>;
  enemies: Array<{ x: number; y: number; direction: number; alive: boolean; type: 'goomba' | 'snake'; waveOffset?: number }>;
  width: number;
  goalX: number;
}

export function generateStage(stageNumber: number): StageData {
  const platforms: Array<{ x: number; y: number; width: number; height: number; type: string }> = [];
  const coins: Array<{ x: number; y: number; collected: boolean; floatOffset: number }> = [];
  const enemies: Array<{ x: number; y: number; direction: number; alive: boolean; type: 'goomba' | 'snake'; waveOffset?: number }> = [];
  
  // Stage widths increase with difficulty
  const stageWidths = [800, 1200, 1600, 2000, 2400, 2800, 3200, 3600, 4000, 4400];
  const width = stageWidths[stageNumber - 1] || 800;
  const groundBlocks = Math.ceil(width / 16);
  
  // Ground
  for (let i = 0; i < groundBlocks; i++) {
    platforms.push({ x: i * 16, y: 128, width: 16, height: 16, type: 'ground' });
  }
  
  // Difficulty scaling with better progression
  const difficulty = stageNumber;
  const platformDensity = 0.18 + (difficulty * 0.06); // More platforms in later stages
  const enemyCount = Math.min(3 + difficulty * 2, 28); // More enemies
  const coinCount = Math.min(22 + difficulty * 6, 70); // More coins
  const questionBlockCount = Math.min(7 + difficulty, 20);
  
  // Generate structured platform formations for professional look
  let x = 96;
  let patternIndex = 0;
  
  while (x < width - 250) {
    // Alternate between different platform patterns
    const pattern = patternIndex % 4;
    
    if (pattern === 0) {
      // Horizontal platform series with consistent spacing
      const platformLength = 3 + Math.floor(difficulty / 3);
      const baseY = 96 - (difficulty * 2);
      for (let i = 0; i < platformLength; i++) {
        platforms.push({ x: x + i * 16, y: baseY, width: 16, height: 16, type: 'brick' });
      }
      x += platformLength * 16 + 80;
    } else if (pattern === 1) {
      // Pyramid formation
      const pyramidHeight = 2 + Math.floor(difficulty / 4);
      const baseY = 104;
      for (let row = 0; row < pyramidHeight; row++) {
        const blocksInRow = pyramidHeight - row;
        for (let col = 0; col < blocksInRow; col++) {
          platforms.push({ 
            x: x + (row * 8) + col * 16, 
            y: baseY - row * 16, 
            width: 16, 
            height: 16, 
            type: 'brick' 
          });
        }
      }
      x += pyramidHeight * 16 + 96;
    } else if (pattern === 2) {
      // Floating island with multiple levels
      const baseY = 88;
      // Bottom level - 4 blocks
      for (let i = 0; i < 4; i++) {
        platforms.push({ x: x + i * 16, y: baseY + 16, width: 16, height: 16, type: 'brick' });
      }
      // Top level - 2 blocks centered
      for (let i = 0; i < 2; i++) {
        platforms.push({ x: x + 16 + i * 16, y: baseY, width: 16, height: 16, type: 'brick' });
      }
      x += 64 + 88;
    } else {
      // Gap with single platform for jumping challenge
      const platformY = 80 - (difficulty * 1.5);
      platforms.push({ x: x, y: platformY, width: 16, height: 16, type: 'brick' });
      platforms.push({ x: x + 16, y: platformY, width: 16, height: 16, type: 'brick' });
      x += 32 + 112;
    }
    
    patternIndex++;
  }
  
  // Add perfectly aligned staircases
  const staircaseCount = 2 + Math.floor(difficulty / 3);
  for (let s = 0; s < staircaseCount; s++) {
    const stairX = 200 + s * Math.floor((width - 400) / staircaseCount);
    const stairLength = 4 + Math.floor(difficulty / 3);
    const ascending = s % 2 === 0; // Alternate ascending/descending
    
    for (let i = 0; i < stairLength; i++) {
      const yOffset = ascending ? -i * 16 : i * 16;
      platforms.push({ x: stairX + i * 16, y: 112 + yOffset, width: 16, height: 16, type: 'brick' });
    }
  }
  
  // Add question blocks in strategic positions above platforms
  let qBlocksPlaced = 0;
  for (let i = 0; i < questionBlockCount && qBlocksPlaced < questionBlockCount; i++) {
    const qx = 120 + (i * Math.floor((width - 240) / questionBlockCount));
    const qy = 64; // Fixed height for consistency
    
    // Check if there's a platform below (within reasonable distance)
    const hasPlatformBelow = platforms.some(p => 
      Math.abs(p.x - qx) < 32 && p.y > qy && p.y < qy + 64
    );
    
    if (hasPlatformBelow || i % 3 === 0) {
      platforms.push({ x: qx, y: qy, width: 16, height: 16, type: 'question' });
      qBlocksPlaced++;
    }
  }
  
  // Add pipes with varied heights for visual interest
  const pipeCount = 2 + Math.floor(difficulty / 3);
  for (let i = 0; i < pipeCount; i++) {
    const px = 160 + (i * Math.floor((width - 320) / pipeCount));
    const pipeHeight = 2 + (i % 2); // Alternate between 2 and 3 blocks high
    
    // Build pipe from bottom up
    for (let h = 0; h < pipeHeight; h++) {
      for (let j = 0; j < 2; j++) {
        platforms.push({ 
          x: px + j * 16, 
          y: 128 - (h + 1) * 16, 
          width: 16, 
          height: 16, 
          type: 'pipe' 
        });
      }
    }
  }
  
  // Helper function to check if coin position collides with any platform
  const coinCollidesWithPlatform = (cx: number, cy: number): boolean => {
    return platforms.some(p => {
      // Coin is 8x8, check if it overlaps with platform
      return cx + 8 > p.x && cx < p.x + p.width && 
             cy + 8 > p.y && cy < p.y + p.height;
    });
  };
  
  // Generate coins in organized patterns with collision detection
  let coinsPlaced = 0;
  
  // Place coins above platforms in arcs and lines
  for (const platform of platforms) {
    if (platform.type === 'brick' && coinsPlaced < coinCount) {
      // Chance to place coins above this platform
      if (Math.random() < 0.4) {
        // Create a small arc of 3-5 coins
        const arcSize = Math.min(3 + Math.floor(Math.random() * 3), coinCount - coinsPlaced);
        for (let c = 0; c < arcSize; c++) {
          const coinX = platform.x + c * 12;
          const coinY = platform.y - 28 - Math.abs(c - arcSize / 2) * 4; // Increased gap from 24 to 28
          
          // Only place coin if it doesn't collide with any platform
          if (!coinCollidesWithPlatform(coinX, coinY)) {
            coins.push({ 
              x: coinX, 
              y: coinY, 
              collected: false, 
              floatOffset: Math.random() * Math.PI * 2 
            });
            coinsPlaced++;
          }
        }
      }
    }
  }
  
  // Fill remaining coins in safe positions with collision detection
  let attempts = 0;
  while (coinsPlaced < coinCount && attempts < coinCount * 3) {
    const cx = 80 + Math.random() * (width - 160);
    const cy = 40 + Math.random() * 60; // Random height between 40-100
    
    // Check if coin doesn't collide with any platform
    if (!coinCollidesWithPlatform(cx, cy)) {
      coins.push({ x: cx, y: cy, collected: false, floatOffset: Math.random() * Math.PI * 2 });
      coinsPlaced++;
    }
    attempts++;
  }
  
  // Generate enemies - mix of goombas and snakes (more snakes in later stages)
  // Spawn on ground to avoid getting stuck in platforms
  for (let i = 0; i < enemyCount; i++) {
    const ex = 120 + (i * (width - 240) / enemyCount) + Math.random() * 40;
    const ey = 116; // Spawn on ground level
    const direction = Math.random() > 0.5 ? 1 : -1;
    
    // Check if spawn position collides with any platform
    const collidesWithPlatform = platforms.some(p => {
      return ex + 12 > p.x && ex < p.x + p.width && 
             ey + 12 > p.y && ey < p.y + p.height;
    });
    
    // Only spawn if not colliding with platform
    if (!collidesWithPlatform) {
      // 30% chance for snake, increases with stage difficulty
      const snakeChance = 0.3 + (difficulty * 0.05);
      const isSnake = Math.random() < snakeChance;
      
      if (isSnake) {
        enemies.push({ x: ex, y: ey, direction, alive: true, type: 'snake', waveOffset: Math.random() * Math.PI * 2 });
      } else {
        enemies.push({ x: ex, y: ey, direction, alive: true, type: 'goomba' });
      }
    }
  }
  
  // Goal position at end of stage
  const goalX = width - 100;
  
  return { platforms, coins, enemies, width, goalX };
}
