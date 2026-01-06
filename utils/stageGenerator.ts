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
  
  // Difficulty scaling
  const difficulty = stageNumber;
  const platformDensity = 0.15 + (difficulty * 0.05); // More platforms in later stages
  const enemyCount = Math.min(2 + difficulty * 2, 20); // More enemies
  const coinCount = Math.min(15 + difficulty * 5, 50); // More coins
  const questionBlockCount = Math.min(5 + difficulty, 15);
  
  // Generate floating platforms with increasing complexity
  let x = 64;
  while (x < width - 200) {
    const platformLength = Math.floor(Math.random() * 4) + 2 + Math.floor(difficulty / 3);
    const y = 104 - Math.floor(Math.random() * 40) - (difficulty * 2); // Higher platforms in harder stages
    const gapSize = 80 + Math.floor(Math.random() * 60) + (difficulty * 10); // Larger gaps
    
    for (let i = 0; i < platformLength; i++) {
      platforms.push({ x: x + i * 16, y, width: 16, height: 16, type: 'brick' });
    }
    
    x += platformLength * 16 + gapSize;
  }
  
  // Add staircases (more in harder stages)
  const staircaseCount = 1 + Math.floor(difficulty / 2);
  for (let s = 0; s < staircaseCount; s++) {
    const stairX = 200 + s * (width / (staircaseCount + 1));
    const stairLength = 4 + Math.floor(difficulty / 3);
    const ascending = Math.random() > 0.5;
    
    for (let i = 0; i < stairLength; i++) {
      const yOffset = ascending ? -i * 8 : i * 8;
      platforms.push({ x: stairX + i * 16, y: 120 + yOffset, width: 16, height: 16, type: 'brick' });
    }
  }
  
  // Add question blocks
  for (let i = 0; i < questionBlockCount; i++) {
    const qx = 100 + (i * (width - 200) / questionBlockCount);
    const qy = 72 - Math.floor(Math.random() * 16);
    platforms.push({ x: qx, y: qy, width: 16, height: 16, type: 'question' });
  }
  
  // Add pipes (more in harder stages)
  const pipeCount = 2 + Math.floor(difficulty / 2);
  for (let i = 0; i < pipeCount; i++) {
    const px = 150 + (i * (width - 300) / pipeCount);
    for (let j = 0; j < 2; j++) {
      platforms.push({ x: px + j * 16, y: 120, width: 16, height: 16, type: 'pipe' });
      platforms.push({ x: px + j * 16, y: 104, width: 16, height: 16, type: 'pipe' });
    }
  }
  
  // Generate coins
  for (let i = 0; i < coinCount; i++) {
    const cx = 50 + (i * (width - 100) / coinCount) + Math.random() * 20;
    const cy = 56 + Math.floor(Math.random() * 40);
    coins.push({ x: cx, y: cy, collected: false, floatOffset: Math.random() * Math.PI * 2 });
  }
  
  // Generate enemies - mix of goombas and snakes (more snakes in later stages)
  for (let i = 0; i < enemyCount; i++) {
    const ex = 120 + (i * (width - 240) / enemyCount) + Math.random() * 40;
    const ey = 116 - Math.floor(Math.random() * 30);
    const direction = Math.random() > 0.5 ? 1 : -1;
    
    // 30% chance for snake, increases with stage difficulty
    const snakeChance = 0.3 + (difficulty * 0.05);
    const isSnake = Math.random() < snakeChance;
    
    if (isSnake) {
      enemies.push({ x: ex, y: ey, direction, alive: true, type: 'snake', waveOffset: Math.random() * Math.PI * 2 });
    } else {
      enemies.push({ x: ex, y: ey, direction, alive: true, type: 'goomba' });
    }
  }
  
  // Goal position at end of stage
  const goalX = width - 100;
  
  return { platforms, coins, enemies, width, goalX };
}
