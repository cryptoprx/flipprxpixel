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
  
  // Stage widths increase dramatically with difficulty - each stage much longer
  const stageWidths = [
    1000,   // Stage 1 - Tutorial
    1800,   // Stage 2
    2600,   // Stage 3
    3400,   // Stage 4
    4200,   // Stage 5
    5000,   // Stage 6
    5800,   // Stage 7
    6600,   // Stage 8
    7400,   // Stage 9
    8200    // Stage 10 - Final challenge
  ];
  const width = stageWidths[stageNumber - 1] || 1000;
  
  // Difficulty scaling
  const difficulty = stageNumber;
  
  // Ground with deadly gaps (cliffs/pits) - more gaps in harder stages
  const gapCount = Math.floor(difficulty * 1.5); // More gaps as difficulty increases
  const gapPositions: Array<{ start: number; end: number }> = [];
  
  // Generate gap positions - ensure they're spaced out
  for (let i = 0; i < gapCount; i++) {
    const minGapStart = 200 + (i * (width - 400) / (gapCount + 1));
    const gapStart = minGapStart + Math.random() * 100;
    const gapWidth = 48 + (difficulty * 8) + Math.random() * 32; // Wider gaps in later stages
    const gapEnd = gapStart + gapWidth;
    
    // Ensure gap doesn't overlap with other gaps
    const overlaps = gapPositions.some(gap => 
      (gapStart >= gap.start && gapStart <= gap.end) ||
      (gapEnd >= gap.start && gapEnd <= gap.end)
    );
    
    if (!overlaps && gapEnd < width - 200) {
      gapPositions.push({ start: gapStart, end: gapEnd });
    }
  }
  
  // Build ground with gaps
  for (let x = 0; x < width; x += 16) {
    const isInGap = gapPositions.some(gap => x >= gap.start && x < gap.end);
    
    if (!isInGap) {
      platforms.push({ x, y: 128, width: 16, height: 16, type: 'ground' });
    }
  }
  
  // Difficulty scaling with balanced progression
  const platformDensity = 0.2 + (difficulty * 0.05);
  const enemyCount = Math.min(6 + difficulty * 2, 35); // Balanced enemy count
  const coinCount = Math.min(35 + difficulty * 7, 90); // Strategic coin placement
  const questionBlockCount = Math.min(10 + difficulty * 2, 22);
  const minGapBetweenPlatforms = Math.max(68, 100 - difficulty * 4); // Balanced jump difficulty
  
  // Generate structured platform formations with increasing difficulty
  let x = 96;
  let patternIndex = 0;
  
  while (x < width - 150) {
    // Check if we're near a gap - if so, create platforms to cross it
    const nearGap = gapPositions.find(gap => x >= gap.start - 100 && x <= gap.end + 50);
    
    if (nearGap) {
      // Create challenging platforms to cross the gap
      const gapWidth = nearGap.end - nearGap.start;
      const platformCount = Math.ceil(gapWidth / 48) + 1;
      
      for (let i = 0; i < platformCount; i++) {
        const platformX = nearGap.start - 32 + (i * (gapWidth + 64) / platformCount);
        const platformY = 88 - (i % 2) * 16 - (difficulty * 2); // Zigzag pattern
        
        // Single or double block platforms
        const blockCount = difficulty < 5 ? 2 : 1; // Harder stages = smaller platforms
        for (let b = 0; b < blockCount; b++) {
          platforms.push({ x: platformX + b * 16, y: platformY, width: 16, height: 16, type: 'brick' });
        }
      }
      
      x = nearGap.end + 80;
    } else {
      // Normal platform patterns - more challenging in later stages
      const pattern = patternIndex % 5;
      
      if (pattern === 0) {
        // Horizontal platform series - organized spacing
        const platformLength = 3 + Math.floor(difficulty / 2);
        const baseY = 94 - (difficulty * 2.5);
        for (let i = 0; i < platformLength; i++) {
          platforms.push({ x: x + i * 16, y: baseY, width: 16, height: 16, type: 'brick' });
        }
        x += platformLength * 16 + minGapBetweenPlatforms;
      } else if (pattern === 1) {
        // Pyramid formation - cleaner structure
        const pyramidHeight = 3 + Math.floor(difficulty / 3);
        const baseY = 106;
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
        x += pyramidHeight * 16 + minGapBetweenPlatforms + 24;
      } else if (pattern === 2) {
        // Floating island with multiple levels - better organized
        const baseY = 90 - (difficulty * 2);
        const bottomBlocks = difficulty < 5 ? 4 : 3;
        const topBlocks = difficulty < 5 ? 3 : 2;
        
        // Bottom level
        for (let i = 0; i < bottomBlocks; i++) {
          platforms.push({ x: x + i * 16, y: baseY + 16, width: 16, height: 16, type: 'brick' });
        }
        // Top level - centered
        const topOffset = Math.floor((bottomBlocks - topBlocks) * 8);
        for (let i = 0; i < topBlocks; i++) {
          platforms.push({ x: x + topOffset + i * 16, y: baseY, width: 16, height: 16, type: 'brick' });
        }
        x += bottomBlocks * 16 + minGapBetweenPlatforms;
      } else if (pattern === 3) {
        // Stepping stones - organized pattern
        const stepCount = 3 + Math.floor(difficulty / 3);
        const baseY = 84 - (difficulty * 2);
        for (let i = 0; i < stepCount; i++) {
          const stepY = baseY + (i % 2) * 12;
          platforms.push({ x: x + i * 24, y: stepY, width: 16, height: 16, type: 'brick' });
        }
        x += stepCount * 24 + minGapBetweenPlatforms;
      } else {
        // Vertical column challenge - cleaner spacing
        const columnHeight = 3 + Math.floor(difficulty / 4);
        const baseY = 112;
        for (let h = 0; h < columnHeight; h++) {
          platforms.push({ x: x, y: baseY - h * 16, width: 16, height: 16, type: 'brick' });
        }
        x += 16 + minGapBetweenPlatforms + 44;
      }
    }
    
    patternIndex++;
  }
  
  // Add final stretch platforms to ensure content reaches near the goal
  const finalStretchStart = width - 400;
  let finalX = finalStretchStart;
  while (finalX < width - 120) {
    const pattern = Math.floor(Math.random() * 3);
    
    if (pattern === 0) {
      // Horizontal platform
      for (let i = 0; i < 3; i++) {
        platforms.push({ x: finalX + i * 16, y: 96, width: 16, height: 16, type: 'brick' });
      }
      finalX += 48 + 64;
    } else if (pattern === 1) {
      // Single jump platform
      platforms.push({ x: finalX, y: 80, width: 16, height: 16, type: 'brick' });
      platforms.push({ x: finalX + 16, y: 80, width: 16, height: 16, type: 'brick' });
      finalX += 32 + 72;
    } else {
      // Stair up
      for (let i = 0; i < 3; i++) {
        platforms.push({ x: finalX + i * 16, y: 112 - i * 16, width: 16, height: 16, type: 'brick' });
      }
      finalX += 48 + 64;
    }
  }
  
  // Add challenging staircases - more complex in later stages
  const staircaseCount = 3 + Math.floor(difficulty / 2);
  for (let s = 0; s < staircaseCount; s++) {
    const stairX = 250 + s * Math.floor((width - 500) / staircaseCount);
    const stairLength = 5 + Math.floor(difficulty / 2);
    const ascending = s % 2 === 0;
    
    // Check if staircase would be in a gap
    const inGap = gapPositions.some(gap => 
      stairX >= gap.start && stairX + stairLength * 16 <= gap.end
    );
    
    if (!inGap) {
      for (let i = 0; i < stairLength; i++) {
        const yOffset = ascending ? -i * 16 : i * 16;
        platforms.push({ x: stairX + i * 16, y: 112 + yOffset, width: 16, height: 16, type: 'brick' });
      }
    }
  }
  
  // Add question blocks in strategic positions above platforms - better organized
  let qBlocksPlaced = 0;
  for (let i = 0; i < questionBlockCount && qBlocksPlaced < questionBlockCount; i++) {
    const qx = 140 + (i * Math.floor((width - 280) / questionBlockCount));
    const qy = 68; // Consistent height for better gameplay
    
    // Check if there's a platform below (within reasonable distance)
    const hasPlatformBelow = platforms.some(p => 
      Math.abs(p.x - qx) < 40 && p.y > qy && p.y < qy + 60
    );
    
    // Ensure question blocks are accessible
    if (hasPlatformBelow || i % 2 === 0) {
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
  
  // Place coins above platforms in organized arcs and patterns
  for (const platform of platforms) {
    if (platform.type === 'brick' && coinsPlaced < coinCount) {
      // Strategic coin placement above platforms
      if (Math.random() < 0.45) {
        // Create organized arc of 3-5 coins
        const arcSize = Math.min(3 + Math.floor(Math.random() * 3), coinCount - coinsPlaced);
        for (let c = 0; c < arcSize; c++) {
          const coinX = platform.x + c * 14; // Better spacing
          const coinY = platform.y - 32 - Math.abs(c - arcSize / 2) * 5; // Cleaner arc
          
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
  
  // Generate enemies - organized spawn locations with variety
  // Spawn on ground and platforms to avoid getting stuck
  let enemiesPlaced = 0;
  const enemySpacing = (width - 240) / (enemyCount + 1);
  
  for (let i = 0; i < enemyCount && enemiesPlaced < enemyCount; i++) {
    const ex = 140 + (i * enemySpacing) + Math.random() * 30;
    const ey = 116; // Spawn on ground level
    const direction = Math.random() > 0.5 ? 1 : -1;
    
    // Check if spawn position collides with any platform
    const collidesWithPlatform = platforms.some(p => {
      return ex + 12 > p.x && ex < p.x + p.width && 
             ey + 12 > p.y && ey < p.y + p.height;
    });
    
    // Check if too close to player start
    const tooCloseToStart = ex < 200;
    
    // Only spawn if not colliding and not too close to start
    if (!collidesWithPlatform && !tooCloseToStart) {
      // 35% chance for snake, increases with stage difficulty
      const snakeChance = 0.35 + (difficulty * 0.04);
      const isSnake = Math.random() < snakeChance;
      
      if (isSnake) {
        enemies.push({ x: ex, y: ey, direction, alive: true, type: 'snake', waveOffset: Math.random() * Math.PI * 2 });
      } else {
        enemies.push({ x: ex, y: ey, direction, alive: true, type: 'goomba' });
      }
      enemiesPlaced++;
    }
  }
  
  // Goal position at end of stage
  const goalX = width - 100;
  
  return { platforms, coins, enemies, width, goalX };
}
