import { getBiomeForStage } from './constants';
import { Boss, Checkpoint, Coin, Enemy, Platform, PlatformType, StageData } from './types';

export function generateStage(stageNumber: number): StageData {
  const platforms: Platform[] = [];
  const coins: Coin[] = [];
  const enemies: Enemy[] = [];
  let nextId = 1;

  const addPlat = (
    x: number,
    y: number,
    width: number,
    height: number,
    type: PlatformType,
    extra: Partial<Platform> = {}
  ): Platform => {
    const p: Platform = {
      id: nextId++,
      x: Math.round(x),
      y: Math.round(y),
      width,
      height,
      type,
      ...extra,
    };
    platforms.push(p);
    return p;
  };

  const biome = getBiomeForStage(stageNumber);

  // Full-length arcade stages (~30s on Stage 1 scaling up to ~95s epic gauntlet on Stage 10)
  const stageWidths = [
    3520,  // Stage 1 - Grasslands Outskirts
    4480,  // Stage 2 - Rolling Hills
    5440,  // Stage 3 - Emerald Pipeworks
    6400,  // Stage 4 - Sunset Canyon
    7360,  // Stage 5 - Canyon Fortress + EMPEROR VIPER Mini-Boss!
    8320,  // Stage 6 - Neon Haunt Entry
    9280,  // Stage 7 - Phantom Alley
    10240, // Stage 8 - Midnight Spires
    11200, // Stage 9 - Magma Approach
    12160, // Stage 10 - Citadel of Rektus + OVERLORD REKTUS Final Boss!
  ];
  const width = stageWidths[stageNumber - 1] || 4480;
  const difficulty = stageNumber;

  const hasMiniBoss = stageNumber === 5;
  const hasFinalBoss = stageNumber === 10;
  const hasBoss = hasMiniBoss || hasFinalBoss;

  // Reserve clean flat ground at end of stage for Boss Arena + Flagpole Victory Runway
  const arenaWidth = hasFinalBoss ? 224 : hasMiniBoss ? 192 : 0;
  const arenaLeft = hasBoss ? width - arenaWidth - 144 : width - 208;
  const arenaRight = hasBoss ? width - 144 : width - 112;

  // Checkpoints: 1 Checkpoint on Stages 1–3; 2 Checkpoints (34% & 68%) on longer Stages 4–10!
  const checkpointXs: number[] =
    stageNumber <= 3
      ? [Math.floor((arenaLeft * 0.5) / 16) * 16]
      : [
          Math.floor((arenaLeft * 0.34) / 16) * 16,
          Math.floor((arenaLeft * 0.68) / 16) * 16,
        ];

  const isNearAnyCheckpoint = (startX: number, endX: number, pad = 72) =>
    checkpointXs.some((cpX) => startX < cpX + pad && endX > cpX - pad);

  // 1. Generate cliff gaps proportional to stage length (safe around spawn, checkpoints & arena)
  const gapCount = Math.max(4, Math.floor((arenaLeft - 400) / 560));
  const gapPositions: Array<{ start: number; end: number }> = [];

  for (let i = 0; i < gapCount; i++) {
    const usableSpan = arenaLeft - 420;
    if (usableSpan <= 240) break;
    const sectionStart = 256 + (i * usableSpan) / (gapCount + 0.6);
    const rawStart = sectionStart + Math.random() * 80;
    const gapStart = Math.floor(rawStart / 16) * 16;

    const baseTiles = Math.min(8, 3 + Math.floor(difficulty / 2) + Math.floor(Math.random() * 3));
    const gapWidth = baseTiles * 16; // 48px to 128px
    const gapEnd = gapStart + gapWidth;

    const nearArena = gapEnd > arenaLeft - 96;
    const overlaps = gapPositions.some((g) => gapStart < g.end + 80 && gapEnd > g.start - 80);

    if (!isNearAnyCheckpoint(gapStart, gapEnd, 80) && !nearArena && !overlaps && gapStart >= 240) {
      gapPositions.push({ start: gapStart, end: gapEnd });
    }
  }

  const isInGap = (x: number): boolean =>
    gapPositions.some((g) => x >= g.start && x < g.end);

  // 2. Build solid ground tiles (y=128)
  for (let x = 0; x < width; x += 16) {
    if (!isInGap(x)) {
      addPlat(x, 128, 16, 16, 'ground');
    }
  }

  // 3. Bridge every gap with Moving Hover-Platforms or Stepping/Crumble Bridges
  for (const gap of gapPositions) {
    const gapW = gap.end - gap.start;
    if (gapW >= 80 && (stageNumber >= 2 || gapW >= 96) && Math.random() < 0.65) {
      const platW = 32;
      const center = gap.start + (gapW - platW) / 2;
      const range = Math.max(16, (gapW - platW) / 2 + 8);
      addPlat(center, 106, platW, 8, 'moving', {
        baseX: center,
        baseY: 106,
        moveRangeX: range,
        moveRangeY: 0,
        moveSpeed: 1.55 + difficulty * 0.07,
        movePhase: Math.random() * Math.PI * 2,
      });
      for (let c = 0; c < 3; c++) {
        coins.push({
          x: gap.start + gapW * 0.25 + c * 16,
          y: 74 - (c === 1 ? 8 : 0),
          collected: false,
          floatOffset: c * 0.7,
        });
      }
    } else {
      const useCrumble = stageNumber >= 3 && Math.random() < 0.42;
      const stepCount = Math.max(1, Math.ceil(gapW / 56));
      for (let s = 0; s < stepCount; s++) {
        const sx = Math.floor((gap.start + ((s + 0.5) * gapW) / stepCount - 8) / 16) * 16;
        const sy = 96 - (s % 2) * 12;
        addPlat(sx, sy, 16, 16, useCrumble ? 'crumble' : 'brick');
        if (gapW <= 64 || difficulty < 5) {
          addPlat(sx + 16, sy, 16, 16, useCrumble ? 'crumble' : 'brick');
        }
      }
    }
  }

  // 4. Generate 9 varied platform set-pieces along the main course
  let x = 128;
  let patternIdx = 0;
  const minSpacing = Math.max(64, 92 - difficulty * 2.5);

  while (x < arenaLeft - 144) {
    const nearCp = checkpointXs.find((cpX) => Math.abs(x - cpX) < 56);
    if (nearCp !== undefined) {
      x = nearCp + 64;
      continue;
    }

    const nearGap = gapPositions.find((g) => x >= g.start - 64 && x <= g.end + 32);
    if (nearGap) {
      x = nearGap.end + 48;
      continue;
    }

    const pattern = patternIdx % 9;

    if (pattern === 0) {
      // Classic brick row with embedded '?' block
      const len = 3 + (patternIdx % 3);
      for (let i = 0; i < len; i++) {
        const isQ = i === Math.floor(len / 2);
        addPlat(x + i * 16, 88, 16, 16, isQ ? 'question' : 'brick');
      }
      x += len * 16 + minSpacing;
    } else if (pattern === 1) {
      // Connected 2-Wide Pipe with coins overhead
      const px = Math.floor(x / 16) * 16;
      if (!isInGap(px) && !isInGap(px + 16)) {
        const pipeH = 2 + (patternIdx % 2);
        for (let h = 0; h < pipeH; h++) {
          const py = 128 - (h + 1) * 16;
          const isTop = h === pipeH - 1;
          addPlat(px, py, 16, 16, isTop ? 'pipe_top_l' : 'pipe_body_l');
          addPlat(px + 16, py, 16, 16, isTop ? 'pipe_top_r' : 'pipe_body_r');
        }
        coins.push({ x: px + 4, y: 128 - (pipeH + 1) * 16 - 6, collected: false, floatOffset: 0 });
        coins.push({ x: px + 18, y: 128 - (pipeH + 1) * 16 - 6, collected: false, floatOffset: 0.6 });
      }
      x += 32 + minSpacing;
    } else if (pattern === 2) {
      // Bounce Spring Pad + High Sky Platform with Loot!
      addPlat(x, 112, 16, 16, 'bounce');
      const highX = x + 24;
      for (let i = 0; i < 3; i++) {
        addPlat(highX + i * 16, 48, 16, 16, i === 1 ? 'question' : 'brick');
        coins.push({
          x: highX + i * 16 + 4,
          y: 30,
          collected: false,
          floatOffset: i * 0.5,
        });
      }
      x += 80 + minSpacing;
    } else if (pattern === 3) {
      // Ascending Staircase
      const steps = 3 + (difficulty >= 5 ? 1 : 0);
      for (let s = 0; s < steps; s++) {
        if (!isInGap(x + s * 16)) {
          addPlat(x + s * 16, 112 - s * 16, 16, 16, 'brick');
        }
      }
      x += steps * 16 + minSpacing;
    } else if (pattern === 4 && stageNumber >= 2) {
      // Vertical Moving Lift + Upper '?' Vault
      addPlat(x, 88, 32, 8, 'moving', {
        baseX: x,
        baseY: 84,
        moveRangeX: 0,
        moveRangeY: 28,
        moveSpeed: 1.8,
        movePhase: patternIdx,
      });
      addPlat(x + 48, 56, 16, 16, 'brick');
      addPlat(x + 64, 56, 16, 16, 'question');
      x += 96 + minSpacing;
    } else if (pattern === 5 && stageNumber >= 2) {
      // Spike Hazard on flat ground with overhead Brick Bypass!
      const spX = Math.floor(x / 16) * 16;
      if (!isInGap(spX - 16) && !isInGap(spX) && !isInGap(spX + 16) && !isInGap(spX + 32)) {
        addPlat(spX, 118, 16, 10, 'spike');
        if (difficulty >= 6) {
          addPlat(spX + 16, 118, 16, 10, 'spike');
        }
        addPlat(spX - 8, 84, 16, 16, 'brick');
        addPlat(spX + 8, 84, 16, 16, 'brick');
        coins.push({ x: spX + 4, y: 66, collected: false, floatOffset: 0.3 });
      }
      x += 48 + minSpacing;
    } else if (pattern === 6) {
      // Twin-Pipe Skyway (Two 2-tile pipes framing a raised bonus catwalk!)
      const p1 = Math.floor(x / 16) * 16;
      const p2 = p1 + 96;
      if (
        p2 + 32 < arenaLeft - 120 &&
        !isInGap(p1) &&
        !isInGap(p1 + 16) &&
        !isInGap(p2) &&
        !isInGap(p2 + 16)
      ) {
        for (const px of [p1, p2]) {
          addPlat(px, 112, 16, 16, 'pipe_body_l');
          addPlat(px + 16, 112, 16, 16, 'pipe_body_r');
          addPlat(px, 96, 16, 16, 'pipe_top_l');
          addPlat(px + 16, 96, 16, 16, 'pipe_top_r');
        }
        for (let b = 0; b < 3; b++) {
          const bx = p1 + 40 + b * 16;
          addPlat(bx, 64, 16, 16, b === 1 ? 'question' : 'brick');
          coins.push({ x: bx + 4, y: 46, collected: false, floatOffset: b * 0.4 });
        }
        x = p2 + 32 + minSpacing;
      } else {
        x += 48 + minSpacing;
      }
    } else if (pattern === 7) {
      // Elevated Speed Runway (great for Speedster slides, Dashes & Slammer brick-smashing!)
      const runLen = 4;
      for (let r = 0; r < runLen; r++) {
        addPlat(x + r * 16, 96, 16, 16, 'brick');
        if (r % 2 === 0) {
          coins.push({ x: x + r * 16 + 4, y: 78, collected: false, floatOffset: r * 0.3 });
        }
      }
      if (stageNumber >= 3) {
        addPlat(x + runLen * 16 + 16, 72, 16, 16, 'crumble');
        addPlat(x + runLen * 16 + 32, 72, 16, 16, 'question');
        x += (runLen + 3) * 16 + minSpacing;
      } else {
        x += runLen * 16 + minSpacing;
      }
    } else {
      // Double-decker '?' Pyramid
      addPlat(x, 92, 16, 16, 'brick');
      addPlat(x + 16, 92, 16, 16, 'question');
      addPlat(x + 32, 92, 16, 16, 'brick');
      if (difficulty >= 3) {
        addPlat(x + 16, 56, 16, 16, 'question');
      }
      x += 48 + minSpacing;
    }

    patternIdx++;
  }

  // 5. Boss Arena on Stage 5 (EMPEROR VIPER) & Stage 10 (OVERLORD REKTUS)
  let boss: Boss | null = null;
  if (hasBoss) {
    const arenaMid = (arenaLeft + arenaRight) / 2;
    addPlat(arenaLeft + 24, 92, 32, 8, 'moving', {
      baseX: arenaLeft + 24,
      baseY: 92,
      moveRangeX: 0,
      moveRangeY: 0,
      moveSpeed: 0,
    });
    addPlat(arenaRight - 56, 92, 32, 8, 'moving', {
      baseX: arenaRight - 56,
      baseY: 92,
      moveRangeX: 0,
      moveRangeY: 0,
      moveSpeed: 0,
    });
    addPlat(arenaLeft - 48, 84, 16, 16, 'question');
    if (hasFinalBoss) {
      addPlat(arenaMid - 16, 66, 32, 8, 'moving', {
        baseX: arenaMid - 16,
        baseY: 66,
        moveRangeX: 20,
        moveRangeY: 0,
        moveSpeed: 1.4,
        movePhase: 0,
      });
    }

    if (hasMiniBoss) {
      boss = {
        kind: 'miniboss',
        name: 'EMPEROR VIPER',
        subtitle: 'CANYON GUARDIAN',
        x: arenaRight - 44,
        y: 128 - 26,
        width: 22,
        height: 26,
        spriteWidth: 28,
        spriteHeight: 28,
        vx: 0,
        vy: 0,
        onGround: true,
        facingLeft: true,
        hp: 6,
        maxHp: 6,
        phase: 1,
        aiState: 'inactive',
        stateTimer: 0,
        hurtFlashTimer: 0,
        invulnTimer: 0,
        animTimer: 0,
        attackCounter: 0,
        arenaLeft,
        arenaRight,
        arenaFloorY: 128,
        targetX: arenaMid,
        gateClosed: false,
      };
    } else {
      boss = {
        kind: 'finalboss',
        name: 'OVERLORD REKTUS',
        subtitle: 'LORD OF RED CANDLES',
        x: arenaRight - 52,
        y: 128 - 34,
        width: 28,
        height: 34,
        spriteWidth: 40,
        spriteHeight: 38,
        vx: 0,
        vy: 0,
        onGround: true,
        facingLeft: true,
        hp: 12,
        maxHp: 12,
        phase: 1,
        aiState: 'inactive',
        stateTimer: 0,
        hurtFlashTimer: 0,
        invulnTimer: 0,
        animTimer: 0,
        attackCounter: 0,
        arenaLeft,
        arenaRight,
        arenaFloorY: 128,
        targetX: arenaMid,
        gateClosed: false,
      };
    }
  }

  // 6. Checkpoints
  const checkpoints: Checkpoint[] = checkpointXs.map((cpX) => ({
    x: cpX,
    y: 128,
    activated: false,
  }));

  // 7. Overlap check helper
  const overlapsTile = (bx: number, by: number, bw: number, bh: number): boolean =>
    platforms.some(
      (p) => bx + bw > p.x && bx < p.x + p.width && by + bh > p.y && by < p.y + p.height
    );

  // Populate coin trails scaled to stage length
  const targetCoins = Math.min(130, Math.round(width / 92));
  for (const p of platforms) {
    if (coins.length >= targetCoins) break;
    if (p.type === 'brick' && p.x < arenaLeft - 60 && Math.random() < 0.28) {
      for (let c = 0; c < 2; c++) {
        const cx = p.x + c * 14 + 2;
        const cy = p.y - 22;
        if (!overlapsTile(cx, cy, 8, 8)) {
          coins.push({ x: cx, y: cy, collected: false, floatOffset: Math.random() * Math.PI * 2 });
        }
      }
    }
  }

  let coinTries = 0;
  while (coins.length < targetCoins && coinTries < targetCoins * 3) {
    const cx = 140 + Math.random() * (arenaLeft - 220);
    const cy = 52 + Math.random() * 52;
    if (!overlapsTile(cx, cy, 8, 8)) {
      coins.push({
        x: Math.round(cx),
        y: Math.round(cy),
        collected: false,
        floatOffset: Math.random() * Math.PI * 2,
      });
    }
    coinTries++;
  }

  // 8. Spawn Water Blaster Power-Ups (1 on Stages 1–4; 2 on longer Stages 5–10!)
  const waterGuns: Array<{ x: number; y: number; collected: boolean }> = [];
  const zones =
    stageNumber >= 5
      ? [
          [260, arenaLeft * 0.48],
          [arenaLeft * 0.55, arenaLeft - 120],
        ]
      : [[260, arenaLeft * 0.65]];

  for (const [zStart, zEnd] of zones) {
    const highCandidates = platforms.filter(
      (p) =>
        (p.type === 'brick' || p.type === 'moving') &&
        p.y <= 96 &&
        p.x >= zStart &&
        p.x <= zEnd &&
        !overlapsTile(p.x + 4, p.y - 14, 10, 12)
    );
    if (highCandidates.length > 0) {
      const pick = highCandidates[Math.floor(Math.random() * highCandidates.length)];
      waterGuns.push({ x: pick.x + 3, y: pick.y - 12, collected: false });
    }
  }

  // 9. Market Chart Portal (45% chance on Stages 2–9)
  let portal: { x: number; y: number; animationFrame: number; active: boolean } | null = null;
  if (stageNumber >= 2 && stageNumber <= 9 && Math.random() < 0.45) {
    for (let attempt = 0; attempt < 24; attempt++) {
      const px = Math.floor((320 + Math.random() * (arenaLeft - 480)) / 16) * 16;
      const py = 92;
      if (
        !isInGap(px) &&
        !isInGap(px + 16) &&
        !isNearAnyCheckpoint(px, px + 16, 64) &&
        !overlapsTile(px - 4, py - 4, 24, 24)
      ) {
        portal = { x: px, y: py, animationFrame: 0, active: true };
        break;
      }
    }
  }

  // 10. Spawn Enemies scaled evenly across the full stage length
  const enemyCount = Math.min(72, Math.max(16, Math.round((arenaLeft - 260) / 165)));
  const safeStart = 240;
  const spawnSpan = Math.max(300, arenaLeft - 96 - safeStart);
  const spacing = spawnSpan / enemyCount;

  for (let i = 0; i < enemyCount; i++) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const ex = Math.round(safeStart + i * spacing + (Math.random() - 0.5) * spacing * 0.45);
      const ey = 116;
      if (ex < safeStart || ex > arenaLeft - 96) continue;
      if (isNearAnyCheckpoint(ex, ex + 12, 48)) continue;
      if (isInGap(ex) || isInGap(ex + 12)) continue;
      if (overlapsTile(ex - 2, ey - 2, 16, 14)) continue;

      const dir = Math.random() > 0.5 ? 1 : -1;
      const roll = Math.random();

      const ghostChance =
        stageNumber >= 6 && stageNumber <= 8 ? 0.28 : stageNumber >= 4 ? 0.16 : 0;
      const snakeChance = 0.26 + difficulty * 0.03;

      if (roll < ghostChance) {
        enemies.push({
          x: ex,
          y: 78,
          direction: dir,
          alive: true,
          type: 'badguy',
          velocityY: 0,
          opacity: 0.85,
          frozen: false,
          disappearTimer: 4 + Math.random() * 4,
          mimicJumpTimer: 0,
          floatOffset: Math.random() * Math.PI * 2,
          stalkerMode: false,
          rushTimer: 0,
        });
      } else if (roll < ghostChance + snakeChance) {
        enemies.push({
          x: ex,
          y: ey,
          direction: dir,
          alive: true,
          type: 'snake',
          velocityY: 0,
          waveOffset: Math.random() * Math.PI * 2,
          attackCooldown: 2 + Math.random() * 2,
          isLunging: false,
          lungeTimer: 0,
          hopTimer: 1.5 + Math.random() * 2,
        });
      } else {
        enemies.push({
          x: ex,
          y: ey,
          direction: dir,
          alive: true,
          type: 'goomba',
          velocityY: 0,
          patrolTimer: 2 + Math.random() * 2,
          isChasing: false,
          chaseSpeed: 52 + difficulty * 1.5,
        });
      }
      break;
    }
  }

  // Grand Flagpole at goalX with clear 88px victory dance runway to the right!
  const goalX = width - 88;

  return {
    biome,
    platforms,
    coins,
    enemies,
    checkpoints,
    portal,
    waterGuns,
    boss,
    width,
    goalX,
  };
}
