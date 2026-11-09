import { SoundManager } from './audio';
import { damageBoss, resetBossOnPlayerDeath, spawnFloatingText, updateBoss } from './bosses';
import {
  AIR_FRICTION,
  BOUNCE_PAD_VELOCITY,
  COYOTE_TIME,
  DASH_COOLDOWN,
  DASH_DURATION,
  DASH_SPEED,
  DOUBLE_JUMP_VELOCITY,
  GAME_HEIGHT,
  GRAVITY,
  JUMP_VELOCITY,
  MAX_FALL_SPEED,
  MAX_PARTICLES,
  PLAYER_ACCEL,
  PLAYER_FRICTION,
  PLAYER_SPEED,
} from './constants';
import { SpatialGrid } from './spatialGrid';
import { generateStage } from './stageGenerator';
import { CharacterId, GameState, PlayerSprite } from './types';

export function createDefaultPlayer(): PlayerSprite {
  return {
    x: 80,
    y: 112,
    prevX: 80,
    prevY: 112,
    width: 12,
    height: 14,
    velocityX: 0,
    velocityY: 0,
    onGround: false,
    facingLeft: false,
    currentAnimation: 'idle',
    animationFrame: 0,
    animationTimer: 0,
    rotation: 0,
    squashX: 1,
    squashY: 1,
    hasHelmet: false,
    helmetTimer: 0,
    landingTimer: 0,
    hasWaterGun: false,
    waterGunTimer: 0,
    shootCooldown: 0,
    invincibilityTimer: 0,
    bullRunTimer: 0,
    isAirSliding: false,
    airSlideTimer: 0,
    airSlideUsed: false,
    speedBoostTimer: 0,
    airDashCount: 0,
    isSlamming: false,
    slamCharging: false,
    jumpHoldTime: 0,
    groundPoundRadius: 0,
    chargeLevel: 0,
    doubleJumpAvailable: false,
    dashAvailable: true,
    dashTimer: 0,
    isDashing: false,
    dashCooldown: 0,
  };
}

export function resetPlayerAbilities(player: PlayerSprite) {
  player.velocityX = 0;
  player.velocityY = 0;
  player.rotation = 0;
  player.squashX = 1;
  player.squashY = 1;
  player.hasHelmet = false;
  player.helmetTimer = 0;
  player.hasWaterGun = false;
  player.waterGunTimer = 0;
  player.shootCooldown = 0;
  player.bullRunTimer = 0;
  player.isDashing = false;
  player.dashTimer = 0;
  player.dashCooldown = 0;
  player.dashAvailable = true;
  player.isAirSliding = false;
  player.airSlideTimer = 0;
  player.airSlideUsed = false;
  player.speedBoostTimer = 0;
  player.isSlamming = false;
  player.slamCharging = false;
  player.chargeLevel = 0;
  player.groundPoundRadius = 0;
  player.doubleJumpAvailable = false;
  player.airDashCount = 0;
  player.jumpHoldTime = 0;
  player.landingTimer = 0;
}

export function createInitialGameState(): GameState {
  return {
    player: createDefaultPlayer(),
    keys: {},
    abilityJustPressed: false,
    shootJustPressed: false,
    coyoteTime: 0,
    jumpBuffer: 0,
    combo: 0,
    comboTimer: 0,
    screenShake: 0,
    hitStopTimer: 0,
    camera: { x: 0, y: 0, prevX: 0, prevY: 0, targetX: 0 },
    currentStage: 1,
    biome: 'day',
    stageWidth: 3520,
    goalX: 3432,
    respawnX: 80,
    respawnY: 112,
    stageTime: 0,
    lastFootstepTime: 0,
    coinsCollectedThisStage: 0,
    totalCoinsThisStage: 0,
    celebrating: false,
    celebrationTimer: 0,
    celebrationElapsed: 0,
    flagSlideComplete: false,
    flagRaiseProgress: 0,
    fireworkTimer: 0,
    stageBonusAwarded: 0,
    flagPoleBonus: 0,
    stageStars: 0,
    gameStarted: false,
    gameStartTimer: 0,
    coins: [],
    enemies: [],
    boss: null,
    bossProjectiles: [],
    bossWarningTimer: 0,
    checkpoints: [],
    waterGuns: [],
    waterProjectiles: [],
    particles: [],
    floatingTexts: [],
    platforms: [],
    movingPlatforms: [],
    portal: null,
    inBlackhole: false,
    blackholeTimer: 0,
    blackholeFallSpeed: 0,
    chartBars: [],
    chartComplete: false,
    chartResult: '',
    speechBubble: null,
    speechCooldown: 2,
    deathFlashTimer: 0,
    score: 0,
  };
}

export function loadStageIntoState(state: GameState, grid: SpatialGrid, stageNum: number) {
  const data = generateStage(stageNum);
  state.currentStage = stageNum;
  state.biome = data.biome;
  state.platforms = data.platforms;
  state.movingPlatforms = data.platforms.filter(
    (p) => p.type === 'moving' || p.type === 'crumble' || p.type === 'bounce' || p.type === 'question'
  );
  state.coins = data.coins;
  state.enemies = data.enemies;
  state.checkpoints = data.checkpoints;
  state.portal = data.portal;
  state.waterGuns = data.waterGuns;
  state.boss = data.boss;
  state.bossProjectiles = [];
  state.bossWarningTimer = 0;
  state.stageWidth = data.width;
  state.goalX = data.goalX;
  state.respawnX = 80;
  state.respawnY = 112;
  state.stageTime = 0;
  state.coinsCollectedThisStage = 0;
  state.totalCoinsThisStage = data.coins.length;
  state.celebrating = false;
  state.celebrationTimer = 0;
  state.celebrationElapsed = 0;
  state.flagSlideComplete = false;
  state.flagRaiseProgress = 0;
  state.fireworkTimer = 0;
  state.stageBonusAwarded = 0;
  state.flagPoleBonus = 0;
  state.stageStars = 0;
  state.shootJustPressed = false;
  state.gameStarted = false;
  state.gameStartTimer = 1.2; // Snappy 1.8s 3-2-1 countdown instead of sluggish 3.0s!
  state.waterProjectiles = [];
  state.particles = [];
  state.floatingTexts = [];
  state.inBlackhole = false;
  state.blackholeTimer = 0;
  state.blackholeFallSpeed = 0;
  state.chartBars = [];
  state.chartComplete = false;
  state.chartResult = '';
  state.combo = 0;
  state.comboTimer = 0;
  state.hitStopTimer = 0;
  state.camera.x = 0;
  state.camera.y = 0;
  state.camera.prevX = 0;
  state.camera.prevY = 0;
  state.camera.targetX = 0;

  resetPlayerAbilities(state.player);
  state.player.x = 80;
  state.player.y = 112;
  state.player.prevX = 80;
  state.player.prevY = 112;
  state.player.onGround = true;
  state.player.invincibilityTimer = 0;

  grid.build(state.platforms);
}

export interface EngineCallbacks {
  onScoreChange: (newScore: number) => void;
  onStageAdvance: (nextStage: number) => void;
  onPlayerLoseLife: () => void;
  onGameWin: () => void;
  vibrate: (ms: number) => void;
}

export function updateGameEngine(
  state: GameState,
  grid: SpatialGrid,
  dt: number,
  gameWidth: number,
  selectedChar: CharacterId,
  sound: SoundManager,
  cb: EngineCallbacks
) {
  const player = state.player;
  player.prevX = player.x;
  player.prevY = player.y;
  state.camera.prevX = state.camera.x;
  state.camera.prevY = state.camera.y;

  const addScore = (pts: number) => {
    const mult = player.bullRunTimer > 0 ? 2 : 1;
    state.score += pts * mult;
    cb.onScoreChange(state.score);
  };

  // Hit-stop impact freeze (renders smoothly while pausing physics for 40ms punch!)
  if (state.hitStopTimer > 0) {
    state.hitStopTimer -= dt;
    return;
  }

  if (state.deathFlashTimer > 0) state.deathFlashTimer -= dt;
  if (state.bossWarningTimer > 0) state.bossWarningTimer -= dt;

  // Recover squash & stretch smoothly toward (1, 1) and snap cleanly to exact 1.0
  // so lingering floating-point scale never causes sub-pixel sprite column shimmer while running!
  player.squashX += (1 - player.squashX) * Math.min(1, dt * 14);
  player.squashY += (1 - player.squashY) * Math.min(1, dt * 14);
  if (Math.abs(1 - player.squashX) < 0.012) player.squashX = 1;
  if (Math.abs(1 - player.squashY) < 0.012) player.squashY = 1;

  // Update floating score popups
  for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
    const ft = state.floatingTexts[i];
    ft.y += ft.vy * dt;
    ft.vy *= 0.94;
    ft.life -= dt;
    if (ft.life <= 0) state.floatingTexts.splice(i, 1);
  }

  // 1. Handle Blackhole Market Chart Mini-Game FIRST (freezes world physics so enemies/pits can't kill player!)
  if (state.inBlackhole) {
    state.blackholeTimer += dt;
    state.blackholeFallSpeed += dt * 32;

    const barInterval = 0.65;
    const currentBarCount = Math.floor(state.blackholeTimer / barInterval);

    if (currentBarCount > state.chartBars.length && state.chartBars.length < 5) {
      const height = 20 + Math.random() * 40;
      const isLastBar = state.chartBars.length === 4;

      if (isLastBar) {
        const isGreen = Math.random() < 0.62; // Slightly player-favorable odds!
        const finalH = isGreen ? 42 + Math.random() * 18 : 22 + Math.random() * 18;
        state.chartBars.push({ height: finalH, color: isGreen ? 'green' : 'red' });
        state.chartResult = isGreen ? 'green' : 'red';
        state.chartComplete = true;
        sound.play(isGreen ? 'powerup' : 'bossWarning');
      } else {
        state.chartBars.push({ height, color: Math.random() > 0.48 ? 'green' : 'red' });
        sound.play('coin');
      }
    }

    if (state.chartComplete && state.blackholeTimer > 4.2) {
      state.inBlackhole = false;
      state.blackholeTimer = 0;
      state.blackholeFallSpeed = 0;
      player.invincibilityTimer = 1.8;

      if (state.chartResult === 'green') {
        // GREEN CANDLE = BULL RUN FRENZY! (2x Score + Coin Magnet + +500 Bonus!)
        player.bullRunTimer = 10.0;
        addScore(500);
        sound.play('celebration');
        spawnFloatingText(state, player.x + 6, player.y - 12, 'BULL RUN! 2X!', '#4ADE80', 1.5);
      } else {
        // RED CANDLE = Escapable BEAR TRAP Ambush (instead of unfair Stage 1 wipe!)
        state.screenShake = 0.25;
        spawnFloatingText(state, player.x + 6, player.y - 12, 'BEAR TRAP!', '#EF4444', 1.4);
        for (const offset of [-42, 48]) {
          const sx = Math.max(60, Math.min(state.stageWidth - 100, player.x + offset));
          state.enemies.push({
            x: sx,
            y: player.y - 24,
            direction: offset > 0 ? -1 : 1,
            alive: true,
            type: 'goomba',
            velocityY: -80,
            patrolTimer: 2,
            isChasing: true,
            chaseSpeed: 60,
          });
        }
      }
    }
    state.abilityJustPressed = false;
    state.shootJustPressed = false;
    return;
  }

  // 2. Stage Start Countdown
  if (!state.gameStarted) {
    state.gameStartTimer += dt;
    if (state.gameStartTimer >= 3.0) {
      state.gameStarted = true;
    }
  }

  // 3. Grand 2-Act Flagpole Slide, Victory Backflip Dance & Sky Fireworks!
  if (state.celebrating) {
    state.celebrationElapsed += dt;
    state.celebrationTimer -= dt;

    // Smoothly frame the flagpole & victory dance runway
    const celebCamTarget = Math.max(
      0,
      Math.min(state.goalX - gameWidth * 0.44, state.stageWidth - gameWidth)
    );
    state.camera.x += (celebCamTarget - state.camera.x) * Math.min(1, 7.5 * dt);
    state.camera.y = 0;

    if (!state.flagSlideComplete) {
      // Act 1A: Slide smoothly down the flagpole while hoisting the FLIPPRX Victory Banner!
      player.x = state.goalX - 5;
      player.facingLeft = false;
      player.currentAnimation = 'jump';
      player.rotation = 0;
      player.y = Math.min(114, player.y + 130 * dt);
      state.flagRaiseProgress = Math.min(1, state.flagRaiseProgress + dt * 2.25);

      if (Math.random() < 0.65) {
        state.particles.push({
          x: state.goalX + (Math.random() - 0.5) * 4,
          y: player.y + 7,
          vx: (Math.random() - 0.5) * 32,
          vy: -15 - Math.random() * 25,
          life: 0.35,
          maxLife: 0.35,
          color: Math.random() > 0.5 ? '#FDE047' : '#4ADE80',
          noGravity: true,
        });
      }

      if (player.y >= 114 && state.flagRaiseProgress >= 1) {
        state.flagSlideComplete = true;
        sound.play('celebration');
        cb.vibrate(25);
        player.velocityX = 52;
        player.velocityY = -225;
        player.onGround = false;
        player.squashX = 0.8;
        player.squashY = 1.24;
        state.speechBubble = { text: 'we Flipping', timer: 3.6, phraseIndex: 2 };
      }
    } else {
      // Act 1B & Act 2: Hero hops onto the victory runway & performs continuous 360° celebratory flips!
      const danceTargetX = Math.min(state.stageWidth - 28, state.goalX + 24);
      if (player.x < danceTargetX) {
        player.x = Math.min(danceTargetX, player.x + 48 * dt);
      } else {
        player.velocityX = 0;
      }

      player.velocityY = Math.min(player.velocityY + GRAVITY * dt, MAX_FALL_SPEED);
      player.y += player.velocityY * dt;

      if (player.y >= 114) {
        player.y = 114;
        player.velocityY = -210;
        player.onGround = true;
        player.rotation = 0;
        player.squashX = 0.8;
        player.squashY = 1.22;
        for (let k = 0; k < 5; k++) {
          state.particles.push({
            x: player.x + 6 + (Math.random() - 0.5) * 8,
            y: 127,
            vx: (Math.random() - 0.5) * 55,
            vy: -25 - Math.random() * 30,
            life: 0.32,
            maxLife: 0.32,
            color: k % 2 === 0 ? '#FDE047' : '#4ADE80',
          });
        }
      } else {
        player.onGround = false;
        player.currentAnimation = 'jump';
        player.rotation = (player.rotation + dt * 720) % 360;
      }
    }

    // Continuous Sky Fireworks Show!
    state.fireworkTimer -= dt;
    if (state.fireworkTimer <= 0) {
      state.fireworkTimer = 0.34 + Math.random() * 0.22;
      const fx = Math.max(
        state.camera.x + 28,
        Math.min(state.camera.x + gameWidth - 28, state.goalX - 58 + Math.random() * 116)
      );
      const fy = 18 + Math.random() * 38;
      const palette = ['#FDE047', '#4ADE80', '#38BDF8', '#F43F5E', '#C084FC', '#FB923C'];
      const mainColor = palette[Math.floor(Math.random() * palette.length)];
      sound.play('firework');

      for (let i = 0; i < 20; i++) {
        const a = (Math.PI * 2 * i) / 20;
        const ringSpd = (i % 2 === 0 ? 78 : 44) + Math.random() * 24;
        state.particles.push({
          x: fx,
          y: fy,
          vx: Math.cos(a) * ringSpd,
          vy: Math.sin(a) * ringSpd - 22,
          life: 0.85,
          maxLife: 0.85,
          color: i % 3 === 0 ? '#FFFFFF' : mainColor,
          size: i % 2 === 0 ? 2 : 1,
        });
      }
    }

    if (state.speechBubble) {
      state.speechBubble.timer -= dt;
      if (state.speechBubble.timer <= 0) state.speechBubble = null;
    }

    updateParticlesInPlace(state, dt);

    // Optional speedrunner skip after scoreboard tally completes (~2.1s)
    if (
      state.celebrationElapsed > 2.1 &&
      (state.jumpBuffer > 0 || state.abilityJustPressed || state.shootJustPressed)
    ) {
      state.celebrationTimer = 0;
    }

    state.jumpBuffer = Math.max(0, state.jumpBuffer - dt);
    state.abilityJustPressed = false;
    state.shootJustPressed = false;

    if (state.celebrationTimer <= 0) {
      state.celebrating = false;
      state.speechBubble = null;
      if (state.currentStage < 10) {
        const nextStage = state.currentStage + 1;
        loadStageIntoState(state, grid, nextStage);
        cb.onStageAdvance(nextStage);
      } else {
        cb.onGameWin();
      }
    }
    return;
  }

  // Freeze controls before stage countdown finishes
  if (!state.gameStarted) {
    player.velocityX = 0;
    if (!player.onGround) {
      player.velocityY = Math.min(player.velocityY + GRAVITY * dt, MAX_FALL_SPEED);
      player.y += player.velocityY * dt;
      const nearby = grid.query(player.x - 4, player.x + player.width + 4);
      for (const p of nearby) {
        if (p.type === 'spike') continue;
        if (
          player.x + player.width > p.x &&
          player.x < p.x + p.width &&
          player.y + player.height >= p.y &&
          player.y < p.y + p.height &&
          player.velocityY >= 0
        ) {
          player.y = p.y - player.height;
          player.velocityY = 0;
          player.onGround = true;
        }
      }
    }
    state.abilityJustPressed = false;
    state.shootJustPressed = false;
    return;
  }

  state.stageTime += dt;

  // 4. Update Dynamic Platforms (Moving Hover-Pads, Crumbling Blocks, Bounce Springs, Question Block Bounce)
  for (let i = 0; i < state.movingPlatforms.length; i++) {
    const p = state.movingPlatforms[i];
    p.deltaX = 0;
    p.deltaY = 0;

    if (p.bounceOffset && p.bounceOffset > 0) {
      p.bounceOffset = Math.max(0, p.bounceOffset - dt * 45);
    }
    if (p.springTimer && p.springTimer > 0) {
      p.springTimer = Math.max(0, p.springTimer - dt);
    }

    if (p.type === 'moving' && !p.broken) {
      p.movePhase = (p.movePhase || 0) + dt * (p.moveSpeed || 1.5);
      const nextX = Math.round((p.baseX ?? p.x) + Math.sin(p.movePhase) * (p.moveRangeX || 0));
      const nextY = Math.round((p.baseY ?? p.y) + Math.cos(p.movePhase) * (p.moveRangeY || 0));
      p.deltaX = nextX - p.x;
      p.deltaY = nextY - p.y;
      p.x = nextX;
      p.y = nextY;
    } else if (p.type === 'crumble') {
      if (p.broken) {
        p.respawnTimer = (p.respawnTimer || 0) - dt;
        if (p.respawnTimer <= 0) {
          p.broken = false;
          p.crumbling = false;
          p.crumbleTimer = 0;
        }
      } else if (p.crumbling) {
        p.crumbleTimer = (p.crumbleTimer || 0) - dt;
        if (p.crumbleTimer <= 0) {
          p.broken = true;
          p.crumbling = false;
          p.respawnTimer = 3.2;
          sound.play('break');
          for (let k = 0; k < 8; k++) {
            state.particles.push({
              x: p.x + 8,
              y: p.y + 8,
              vx: (Math.random() - 0.5) * 70,
              vy: -20 + Math.random() * 50,
              life: 0.45,
              maxLife: 0.45,
              color: '#D97706',
            });
          }
        }
      }
    }
  }

  // 5. Global Player Timers (FIXED: invincibilityTimer & bullRunTimer decrement for ALL characters!)
  if (player.invincibilityTimer > 0) {
    player.invincibilityTimer = Math.max(0, player.invincibilityTimer - dt);
  }
  if (player.bullRunTimer > 0) {
    player.bullRunTimer = Math.max(0, player.bullRunTimer - dt);
    if (Math.random() > 0.65) {
      state.particles.push({
        x: player.x + Math.random() * 12,
        y: player.y + Math.random() * 14,
        vx: (Math.random() - 0.5) * 20,
        vy: -25,
        life: 0.25,
        maxLife: 0.25,
        color: Math.random() > 0.5 ? '#4ADE80' : '#FFD700',
        noGravity: true,
      });
    }
  }
  if (player.hasHelmet) {
    player.helmetTimer -= dt;
    if (player.helmetTimer <= 0) {
      player.hasHelmet = false;
      player.helmetTimer = 0;
    }
  }
  if (player.hasWaterGun) {
    player.waterGunTimer -= dt;
    if (player.waterGunTimer <= 0) {
      player.hasWaterGun = false;
      player.waterGunTimer = 0;
    }
  }
  if (player.shootCooldown > 0) player.shootCooldown -= dt;
  if (player.dashCooldown > 0) player.dashCooldown -= dt;
  if (player.speedBoostTimer > 0) player.speedBoostTimer -= dt;
  if (player.landingTimer > 0) player.landingTimer -= dt;

  // Coyote time & jump buffer
  if (player.onGround) {
    state.coyoteTime = COYOTE_TIME;
  } else {
    state.coyoteTime = Math.max(0, state.coyoteTime - dt);
  }
  if (state.jumpBuffer > 0) {
    state.jumpBuffer = Math.max(0, state.jumpBuffer - dt);
  }

  // 6. Player Input & Character Movement / Abilities
  const rightPressed = !!(state.keys['ArrowRight'] || state.keys['d'] || state.keys['D']);
  const leftPressed = !!(state.keys['ArrowLeft'] || state.keys['a'] || state.keys['A']);
  const jumpKeyPressed = !!(
    state.keys['ArrowUp'] ||
    state.keys['w'] ||
    state.keys['W'] ||
    state.keys[' '] ||
    state.keys['z'] ||
    state.keys['Z']
  );
  const downKeyPressed = !!(state.keys['ArrowDown'] || state.keys['s'] || state.keys['S']);
  const abilityTriggered = state.abilityJustPressed;
  state.abilityJustPressed = false;
  const shootHeld = !!(
    state.keys['ShootWater'] ||
    state.keys['KeyShoot'] ||
    state.keys['f'] ||
    state.keys['F']
  );
  const shootTriggered = state.shootJustPressed;
  state.shootJustPressed = false;

  let inputAxis = 0;
  if (rightPressed && !leftPressed) inputAxis = 1;
  else if (leftPressed && !rightPressed) inputAxis = -1;

  // Speed multipliers (FIXED: Speedster landing speedBoostTimer & Bull Run now actually boost speed!)
  let speedMultiplier = 1.0;
  let accelMultiplier = 1.0;
  if (selectedChar === 'guy2') {
    speedMultiplier = 1.35 + (player.speedBoostTimer > 0 ? 0.25 : 0);
    accelMultiplier = 1.25;
  } else if (selectedChar === 'guy3') {
    speedMultiplier = 0.92;
    accelMultiplier = 0.95;
  }
  if (player.bullRunTimer > 0) {
    speedMultiplier *= 1.15;
  }

  if (!player.isDashing && !player.isAirSliding) {
    if (inputAxis !== 0) {
      const targetVel = inputAxis * PLAYER_SPEED * speedMultiplier;
      const accel = (player.onGround ? PLAYER_ACCEL : PLAYER_ACCEL * 0.68) * accelMultiplier * dt;
      const diff = targetVel - player.velocityX;
      // Dust puff when skidding / reversing direction on ground
      if (player.onGround && Math.sign(inputAxis) !== Math.sign(player.velocityX) && Math.abs(player.velocityX) > 90) {
        state.particles.push({
          x: player.x + 6,
          y: player.y + 13,
          vx: -inputAxis * 35,
          vy: -20,
          life: 0.22,
          maxLife: 0.22,
          color: '#E2E8F0',
        });
      }
      player.velocityX += Math.sign(diff) * Math.min(Math.abs(diff), accel);
      player.facingLeft = inputAxis < 0;
    } else {
      const friction = (player.onGround ? PLAYER_FRICTION : AIR_FRICTION) * dt;
      player.velocityX -= Math.sign(player.velocityX) * Math.min(Math.abs(player.velocityX), friction);
      if (Math.abs(player.velocityX) < 0.5) player.velocityX = 0;
    }
  }

  // Gravity
  if (!player.onGround) {
    player.velocityY = Math.min(player.velocityY + GRAVITY * dt, MAX_FALL_SPEED);
  }

  // Primary Jump (Coyote + Buffer)
  if (state.jumpBuffer > 0 && state.coyoteTime > 0) {
    player.velocityY = JUMP_VELOCITY;
    player.onGround = false;
    state.jumpBuffer = 0;
    state.coyoteTime = 0;
    player.landingTimer = 0;
    player.squashX = 0.8;
    player.squashY = 1.22;

    if (selectedChar === 'guy1') {
      player.doubleJumpAvailable = true;
    }

    sound.play('jump');
    cb.vibrate(12);

    for (let i = 0; i < 8; i++) {
      const angle = Math.PI * (0.25 + Math.random() * 0.5);
      const spd = 45 + Math.random() * 60;
      state.particles.push({
        x: player.x + 6 + (Math.random() - 0.5) * 8,
        y: player.y + 14,
        vx: Math.cos(angle) * spd * (Math.random() > 0.5 ? 1 : -1),
        vy: -Math.sin(angle) * spd,
        life: 0.4,
        maxLife: 0.4,
        color: i % 2 === 0 ? '#FDE047' : '#FB923C',
      });
    }
  }

  // === CHARACTER-SPECIFIC ABILITIES (Mobile B Button + Keyboard!) ===
  if (selectedChar === 'guy1') {
    // Double Jump
    if (player.doubleJumpAvailable && !player.onGround && state.jumpBuffer > 0) {
      player.velocityY = DOUBLE_JUMP_VELOCITY;
      player.doubleJumpAvailable = false;
      state.jumpBuffer = 0;
      player.rotation = 0;
      player.squashX = 0.82;
      player.squashY = 1.2;
      sound.play('doubleJump');
      cb.vibrate(12);

      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8;
        state.particles.push({
          x: player.x + 6,
          y: player.y + 10,
          vx: Math.cos(a) * 65,
          vy: Math.sin(a) * 65,
          life: 0.38,
          maxLife: 0.38,
          color: i % 2 === 0 ? '#38BDF8' : '#E0F2FE',
        });
      }
    }
    if (player.onGround) {
      player.doubleJumpAvailable = false;
      player.dashAvailable = true;
    }

    // Shadow Dash (works with Mobile B button OR Shift/X!)
    if ((abilityTriggered || state.keys['Shift']) && player.dashAvailable && player.dashCooldown <= 0 && !player.isDashing) {
      player.isDashing = true;
      player.dashTimer = DASH_DURATION;
      player.dashCooldown = DASH_COOLDOWN;
      player.dashAvailable = false;
      player.invincibilityTimer = Math.max(player.invincibilityTimer, DASH_DURATION + 0.04);
      player.squashX = 1.28;
      player.squashY = 0.78;
      sound.play('flip');
      cb.vibrate(15);

      for (let i = 0; i < 8; i++) {
        state.particles.push({
          x: player.x + 6,
          y: player.y + 7,
          vx: (player.facingLeft ? 45 : -45) + (Math.random() - 0.5) * 30,
          vy: (Math.random() - 0.5) * 35,
          life: 0.35,
          maxLife: 0.35,
          color: i % 2 === 0 ? '#60A5FA' : '#FDE047',
        });
      }
    }

    if (player.isDashing) {
      player.dashTimer -= dt;
      player.velocityX = (player.facingLeft ? -1 : 1) * DASH_SPEED;
      player.velocityY *= 0.4;
      state.particles.push({
        x: player.x + 6,
        y: player.y + 7 + (Math.random() - 0.5) * 6,
        vx: player.facingLeft ? 25 : -25,
        vy: 0,
        life: 0.22,
        maxLife: 0.22,
        color: '#60A5FA',
        noGravity: true,
      });
      if (player.dashTimer <= 0) {
        player.isDashing = false;
      }
    }
  } else if (selectedChar === 'guy2') {
    // SPEEDSTER: Instant Air-Slide via B button OR classic hold-jump release!
    if (jumpKeyPressed && !player.onGround && Math.abs(player.velocityX) > 40) {
      player.jumpHoldTime += dt;
      player.slamCharging = true;
    } else {
      player.slamCharging = false;
    }

    const holdReleaseSlide = !jumpKeyPressed && player.jumpHoldTime > 0.24;
    const buttonSlide = abilityTriggered && !player.onGround;

    if ((buttonSlide || holdReleaseSlide) && !player.onGround && !player.isAirSliding && player.airDashCount < 2) {
      player.isAirSliding = true;
      player.airDashCount++;
      player.airSlideTimer = 0.26;
      player.velocityX = (player.facingLeft ? -1 : 1) * PLAYER_SPEED * 2.35;
      player.velocityY = -15;
      player.jumpHoldTime = 0;
      player.squashX = 1.3;
      player.squashY = 0.76;
      sound.play('fart');
      cb.vibrate(15);

      for (let i = 0; i < 14; i++) {
        state.particles.push({
          x: player.x + 6,
          y: player.y + 8,
          vx: (player.facingLeft ? 55 : -55) + (Math.random() - 0.5) * 35,
          vy: (Math.random() - 0.5) * 45,
          life: 0.4,
          maxLife: 0.4,
          color: i % 2 === 0 ? '#4ADE80' : '#BEF264',
        });
      }
    } else if (abilityTriggered && player.onGround && player.speedBoostTimer <= 0) {
      // Ground Turbo Sprint burst when pressing B on the ground!
      player.speedBoostTimer = 1.5;
      player.velocityX = (player.facingLeft ? -1 : 1) * PLAYER_SPEED * 1.75;
      sound.play('flip');
    }

    if (player.isAirSliding) {
      player.airSlideTimer -= dt;
      player.velocityX = (player.facingLeft ? -1 : 1) * PLAYER_SPEED * 2.3;
      player.velocityY = Math.min(player.velocityY, 45);

      state.particles.push({
        x: player.x + 6,
        y: player.y + 8 + (Math.random() - 0.5) * 6,
        vx: player.facingLeft ? 35 : -35,
        vy: (Math.random() - 0.5) * 20,
        life: 0.28,
        maxLife: 0.28,
        color: '#4ADE80',
      });

      if (player.airSlideTimer <= 0 || player.onGround) {
        player.isAirSliding = false;
        if (player.onGround) player.speedBoostTimer = 2.0;
      }
    }

    if (player.onGround) {
      player.airDashCount = 0;
      player.jumpHoldTime = 0;
    }

    if (player.speedBoostTimer > 0 && player.onGround && Math.abs(player.velocityX) > 60 && Math.random() > 0.55) {
      state.particles.push({
        x: player.x + 6,
        y: player.y + 12,
        vx: player.facingLeft ? 20 : -20,
        vy: -8,
        life: 0.2,
        maxLife: 0.2,
        color: '#22D3EE',
      });
    }
  } else if (selectedChar === 'guy3') {
    // SLAMMER: Instant Meteor Slam via B / Down in mid-air OR hold-jump charge!
    if (jumpKeyPressed && !player.onGround && player.velocityY < 0) {
      player.jumpHoldTime += dt;
      player.slamCharging = true;
      player.chargeLevel = Math.min(3, Math.floor(player.jumpHoldTime / 0.26));
    } else {
      player.slamCharging = false;
    }

    const holdSlam = !jumpKeyPressed && player.jumpHoldTime > 0.26 && !player.onGround;
    const instantSlam = (abilityTriggered || downKeyPressed) && !player.onGround;

    if ((instantSlam || holdSlam) && !player.isSlamming) {
      player.isSlamming = true;
      if (instantSlam && player.chargeLevel < 2) player.chargeLevel = 2;
      player.velocityX *= 0.25;
      player.velocityY = 520 + player.chargeLevel * 80;
      player.groundPoundRadius = Math.min(52, 26 + player.chargeLevel * 9);
      player.squashX = 0.76;
      player.squashY = 1.32;
      sound.play('flip');
    }
  }

  // Variable jump height cut when releasing jump early
  if (!jumpKeyPressed && player.velocityY < 0 && !player.isSlamming) {
    player.velocityY *= 0.55;
  }

  // Dedicated Water Blaster Firing (Mobile FIRE button + Keyboard F / X / Gamepad!)
  if (player.hasWaterGun && player.shootCooldown <= 0 && (shootHeld || shootTriggered)) {
    player.shootCooldown = 0.22;
    const dir = player.facingLeft ? -1 : 1;
    const muzzleX = player.x + (dir > 0 ? 13 : -3);
    const muzzleY = player.y + 6;
    state.waterProjectiles.push({
      x: muzzleX,
      y: muzzleY,
      vx: dir * 275,
      vy: 0,
      life: 1.35,
    });
    for (let i = 0; i < 4; i++) {
      state.particles.push({
        x: muzzleX,
        y: muzzleY + 1,
        vx: dir * (45 + Math.random() * 45),
        vy: (Math.random() - 0.5) * 32,
        life: 0.16,
        maxLife: 0.16,
        color: i % 2 === 0 ? '#38BDF8' : '#E0F2FE',
        noGravity: true,
      });
    }
    sound.play('shoot');
    cb.vibrate(8);
  }

  // 7. SEPARATE X-AXIS THEN Y-AXIS COLLISION RESOLUTION (Zero corner-snagging!)
  const killPlayer = (isPit = false) => {
    sound.play(isPit ? 'huh' : 'death');
    state.deathFlashTimer = 0.28;
    cb.vibrate(85);

    for (let i = 0; i < 20; i++) {
      const a = (Math.PI * 2 * i) / 20;
      const spd = 45 + Math.random() * 65;
      state.particles.push({
        x: player.x + 6,
        y: Math.min(player.y + 7, GAME_HEIGHT - 6),
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 50,
        life: 0.65,
        maxLife: 0.65,
        color: i % 2 === 0 ? '#EF4444' : '#FACC15',
      });
    }

    resetBossOnPlayerDeath(state);
    grid.build(state.platforms);

    resetPlayerAbilities(player);
    player.x = state.respawnX;
    player.y = state.respawnY;
    player.prevX = player.x;
    player.prevY = player.y;
    player.onGround = true;
    player.invincibilityTimer = 2.0;
    state.camera.x = Math.max(0, Math.min(player.x - gameWidth / 2, state.stageWidth - gameWidth));
    state.camera.y = 0;
    state.camera.prevX = state.camera.x;
    state.camera.prevY = 0;
    state.camera.targetX = state.camera.x;
    state.combo = 0;
    state.comboTimer = 0;

    cb.onPlayerLoseLife();
  };

  // --- Move X ---
  player.x += player.velocityX * dt;
  if (player.x < 0) {
    player.x = 0;
    player.velocityX = 0;
  } else if (player.x > state.stageWidth - player.width) {
    player.x = state.stageWidth - player.width;
    player.velocityX = 0;
  }

  let spikeHit = false;
  const candidatesX = grid.query(player.x - 4, player.x + player.width + 4);
  for (let i = 0; i < candidatesX.length; i++) {
    const p = candidatesX[i];
    if (p.broken) continue;

    if (p.type === 'spike') {
      if (
        player.x + player.width - 2 > p.x + 2 &&
        player.x + 2 < p.x + p.width - 2 &&
        player.y + player.height > p.y + 3 &&
        player.y < p.y + p.height
      ) {
        spikeHit = true;
      }
      continue;
    }

    if (p.type === 'moving') continue; // Moving platforms are one-way / top-solid or non-snagging on X

    if (
      player.x + player.width > p.x &&
      player.x < p.x + p.width &&
      player.y + player.height - 1 > p.y &&
      player.y + 1 < p.y + p.height
    ) {
      if (player.hasHelmet && p.type === 'brick') {
        p.broken = true;
        sound.play('break');
        state.screenShake = 0.1;
        addScore(50);
        spawnBrickDebris(state, p.x, p.y);
        continue;
      }

      if (player.velocityX > 0) {
        player.x = p.x - player.width;
        player.velocityX = 0;
      } else if (player.velocityX < 0) {
        player.x = p.x + p.width;
        player.velocityX = 0;
      }
    }
  }

  // --- Move Y ---
  const oldBottom = player.y + player.height;
  const wasOnGround = player.onGround;
  player.y += player.velocityY * dt;
  player.onGround = false;

  const candidatesY = grid.query(player.x - 4, player.x + player.width + 4);
  for (let i = 0; i < candidatesY.length; i++) {
    const p = candidatesY[i];
    if (p.broken) continue;

    if (p.type === 'spike') {
      if (
        player.x + player.width - 2 > p.x + 2 &&
        player.x + 2 < p.x + p.width - 2 &&
        player.y + player.height > p.y + 3 &&
        player.y < p.y + p.height
      ) {
        spikeHit = true;
      }
      continue;
    }

    const overlapX = player.x + player.width > p.x && player.x < p.x + p.width;
    if (!overlapX) continue;

    // Slammer or Star Helmet smashing through bricks from above!
    if (
      p.type === 'brick' &&
      player.y + player.height > p.y &&
      player.y < p.y + p.height &&
      (player.hasHelmet || (selectedChar === 'guy3' && player.isSlamming))
    ) {
      p.broken = true;
      sound.play('break');
      state.screenShake = 0.14;
      addScore(selectedChar === 'guy3' ? 100 : 50);
      spawnBrickDebris(state, p.x, p.y);
      continue;
    }

    // Landing on top of platform
    const platTop = p.y;
    if (
      player.velocityY >= 0 &&
      oldBottom <= platTop + Math.max(3, Math.abs(p.deltaY || 0) + 2) &&
      player.y + player.height >= platTop - (wasOnGround ? 2 : 0)
    ) {
      // Bounce Spring Pad!
      if (p.type === 'bounce') {
        player.y = platTop - player.height;
        player.velocityY = BOUNCE_PAD_VELOCITY;
        player.onGround = false;
        player.isSlamming = false;
        player.doubleJumpAvailable = selectedChar === 'guy1';
        player.airDashCount = 0;
        player.squashX = 0.72;
        player.squashY = 1.35;
        p.springTimer = 0.25;
        sound.play('bounce');
        cb.vibrate(15);
        continue;
      }

      const landingSpeed = player.velocityY;
      player.y = platTop - player.height;
      player.velocityY = 0;
      player.onGround = true;

      // Carry player smoothly with moving platform!
      if (p.deltaX) player.x += p.deltaX;

      // Trigger crumble timer when stepped on
      if (p.type === 'crumble' && !p.crumbling) {
        p.crumbling = true;
        p.crumbleTimer = 0.45;
      }

      if (!wasOnGround && landingSpeed > 80) {
        player.landingTimer = 0.12;
        player.squashX = 1.22;
        player.squashY = 0.8;
        if (landingSpeed > 150) sound.play('land');
      }
      continue;
    }

    // Hitting ceiling / bottom of non-one-way block
    if (
      p.type !== 'moving' &&
      player.velocityY < 0 &&
      player.y < p.y + p.height &&
      player.y + player.height > p.y + p.height - 2
    ) {
      player.y = p.y + p.height;
      player.velocityY = 0;

      if (p.type === 'brick') {
        p.broken = true;
        sound.play('break');
        state.screenShake = 0.1;
        addScore(selectedChar === 'guy3' ? 100 : 50);
        spawnBrickDebris(state, p.x, p.y);
      } else if (p.type === 'question' && !p.used) {
        triggerQuestionBlock(state, p, selectedChar, sound, addScore);
      }
    }
  }

  // Handle Spike Damage
  if (spikeHit && !player.hasHelmet && player.invincibilityTimer <= 0) {
    killPlayer(false);
    return;
  }

  // Guy3 Ground-Pound Shockwave Impact on Landing!
  if (selectedChar === 'guy3') {
    if (player.isSlamming && player.onGround) {
      player.isSlamming = false;
      const radius = player.groundPoundRadius || 36;
      state.screenShake = 0.16 + player.chargeLevel * 0.04;
      state.hitStopTimer = 0.035;
      player.squashX = 1.35;
      player.squashY = 0.7;
      sound.play('stomp');
      cb.vibrate(25);

      for (let i = 0; i < 18; i++) {
        const a = (Math.PI * 2 * i) / 18;
        const spd = 70 + Math.random() * 70;
        state.particles.push({
          x: player.x + 6,
          y: player.y + 13,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd * 0.28 - 25,
          life: 0.5,
          maxLife: 0.5,
          color: i % 2 === 0 ? '#FB923C' : '#FDE047',
        });
      }

      // Defeat nearby enemies in shockwave!
      for (const enemy of state.enemies) {
        if (!enemy.alive) continue;
        const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
        if (dist < radius) {
          enemy.alive = false;
          state.combo++;
          state.comboTimer = 3.2;
          const pts = 300 + (state.combo > 1 ? state.combo * 100 : 0);
          addScore(pts);
          spawnFloatingText(state, enemy.x + 6, enemy.y, `+${pts}`, '#FB923C');
        }
      }

      // Also damage Boss if shockwave reaches Boss on ground!
      if (state.boss && state.boss.aiState !== 'inactive' && state.boss.aiState !== 'dead') {
        const distBoss = Math.hypot(
          state.boss.x + state.boss.width / 2 - (player.x + 6),
          state.boss.y + state.boss.height - (player.y + 14)
        );
        if (distBoss < radius + 14) {
          damageBoss(state, state.boss, 2, sound, 'QUAKE! -2');
          addScore(350);
        }
      }

      // Smash nearby bricks
      const nearbySlam = grid.query(player.x - radius, player.x + player.width + radius);
      for (const p of nearbySlam) {
        if (p.type === 'brick' && !p.broken) {
          if (Math.hypot(p.x - player.x, p.y - player.y) < radius * 1.15) {
            p.broken = true;
            addScore(100);
            spawnBrickDebris(state, p.x, p.y);
          }
        }
      }

      player.jumpHoldTime = 0;
      player.chargeLevel = 0;
    } else if (player.onGround) {
      player.jumpHoldTime = 0;
      player.chargeLevel = 0;
    }
  }

  // 8. Player Animation & Flip Rotation
  if (!player.onGround && player.velocityY < 0) {
    const rotSpeed = player.facingLeft ? -720 : 720;
    player.rotation = Math.max(-360, Math.min(360, player.rotation + dt * rotSpeed));
  } else {
    player.rotation = 0;
  }

  if (!player.onGround) {
    player.currentAnimation = player.velocityY > 100 ? 'crouch' : 'jump';
    player.animationFrame = 0;
    player.animationTimer = 0;
  } else if (player.landingTimer > 0 && Math.abs(player.velocityX) < 25) {
    player.currentAnimation = 'crouch';
  } else if (Math.abs(player.velocityX) < 5) {
    player.currentAnimation = 'idle';
    player.animationFrame = 0;
  } else {
    if (player.currentAnimation !== 'walk') {
      player.currentAnimation = 'walk';
      player.animationFrame = 0;
      player.animationTimer = 0;
    }
    const speedFactor = Math.max(0.5, Math.abs(player.velocityX) / PLAYER_SPEED);
    const frameDuration = 0.1 / speedFactor;
    player.animationTimer += dt;
    if (player.animationTimer >= frameDuration) {
      player.animationFrame = (player.animationFrame + 1) % 4;
      player.animationTimer -= frameDuration;
    }
  }

  // 9. Multi-Checkpoint Activation!
  for (let c = 0; c < state.checkpoints.length; c++) {
    const cp = state.checkpoints[c];
    if (!cp.activated && Math.abs(player.x - cp.x) < 18 && Math.abs(player.y - (cp.y - 16)) < 30) {
      cp.activated = true;
      state.respawnX = cp.x;
      state.respawnY = 112;
      sound.play('checkpoint');
      cb.vibrate(18);
      addScore(500);
      spawnFloatingText(state, cp.x, cp.y - 28, 'CHECKPOINT!', '#4ADE80', 1.3);
      for (let i = 0; i < 14; i++) {
        const a = (Math.PI * 2 * i) / 14;
        state.particles.push({
          x: cp.x + 4,
          y: cp.y - 16,
          vx: Math.cos(a) * 65,
          vy: Math.sin(a) * 65 - 20,
          life: 0.5,
          maxLife: 0.5,
          color: i % 2 === 0 ? '#4ADE80' : '#FDE047',
        });
      }
    }
  }

  // 10. Portal Interaction
  if (state.portal && state.portal.active) {
    state.portal.animationFrame += dt * 8;
    if (Math.abs(player.x - state.portal.x) < 15 && Math.abs(player.y - state.portal.y) < 16) {
      state.inBlackhole = true;
      state.blackholeTimer = 0;
      state.blackholeFallSpeed = 16;
      state.chartBars = [];
      state.chartComplete = false;
      state.chartResult = '';
      state.portal.active = false;
      sound.play('powerup');
      return;
    }
  }

  // 11. Coins (with Speedster & Bull Run Coin Magnet!)
  const magnetRadius = player.bullRunTimer > 0 ? 58 : selectedChar === 'guy2' ? 28 : 0;
  for (let i = 0; i < state.coins.length; i++) {
    const coin = state.coins[i];
    if (coin.collected) continue;
    coin.floatOffset += dt * 2.4;

    const dx = player.x + 4 - coin.x;
    const dy = player.y + 5 - coin.y;
    const dist = Math.hypot(dx, dy);

    if (magnetRadius > 0 && dist < magnetRadius && dist > 4) {
      coin.x += (dx / dist) * 165 * dt;
      coin.y += (dy / dist) * 165 * dt;
    }

    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
      coin.collected = true;
      state.coinsCollectedThisStage++;
      state.combo++;
      state.comboTimer = 3.2;
      sound.play('coin', state.combo);
      const pts = 100 + (state.combo > 1 ? Math.min(400, state.combo * 35) : 0);
      addScore(pts);
      if (state.combo >= 5 && state.combo % 5 === 0) {
        spawnFloatingText(state, coin.x, coin.y - 6, `X${state.combo} COMBO!`, '#FDE047');
      }

      for (let j = 0; j < 8; j++) {
        const a = (Math.PI * 2 * j) / 8;
        state.particles.push({
          x: coin.x + 4,
          y: coin.y + 4,
          vx: Math.cos(a) * 55,
          vy: Math.sin(a) * 55 - 20,
          life: 0.4,
          maxLife: 0.4,
          color: j % 2 === 0 ? '#FFD700' : '#FEF9C3',
        });
      }
    }
  }

  // 12. Water Blaster Pickups & Projectiles
  for (let w = 0; w < state.waterGuns.length; w++) {
    const wg = state.waterGuns[w];
    if (!wg.collected && Math.abs(player.x - wg.x) < 14 && Math.abs(player.y - wg.y) < 14) {
      wg.collected = true;
      player.hasWaterGun = true;
      player.waterGunTimer = 18;
      sound.play('powerup');
      cb.vibrate(15);
      addScore(500);
      spawnFloatingText(state, wg.x, wg.y - 8, 'WATER BLASTER!', '#38BDF8', 1.25);
    }
  }

  state.waterProjectiles = state.waterProjectiles.filter((proj) => {
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;
    proj.life -= dt;

    if (proj.x < 0 || proj.x > state.stageWidth) return false;

    // Hit regular enemies
    for (const enemy of state.enemies) {
      if (enemy.alive && Math.abs(proj.x - enemy.x) < 12 && Math.abs(proj.y - enemy.y) < 12) {
        enemy.alive = false;
        proj.life = 0;
        sound.play('stomp');
        state.combo++;
        state.comboTimer = 3.2;
        const pts = 200 + (state.combo > 1 ? state.combo * 60 : 0);
        addScore(pts);
        spawnFloatingText(state, enemy.x + 6, enemy.y, `+${pts}`, '#38BDF8');
        break;
      }
    }

    // Hit Boss!
    if (
      proj.life > 0 &&
      state.boss &&
      state.boss.aiState !== 'inactive' &&
      state.boss.aiState !== 'dead' &&
      proj.x + 4 > state.boss.x &&
      proj.x < state.boss.x + state.boss.width &&
      proj.y + 4 > state.boss.y &&
      proj.y < state.boss.y + state.boss.height
    ) {
      proj.life = 0;
      damageBoss(state, state.boss, 0.5, sound, 'SPLASH!');
      addScore(75);
    }

    return proj.life > 0;
  });

  // 13. Update Regular Enemies (Using SpatialGrid + Broken Brick Check!)
  const activeLeft = state.camera.x - 220;
  const activeRight = state.camera.x + gameWidth + 220;

  for (let i = 0; i < state.enemies.length; i++) {
    const enemy = state.enemies[i];
    if (!enemy.alive) continue;

    // Cull completely distant enemies for top mobile FPS
    if (enemy.x < activeLeft || enemy.x > activeRight) continue;

    const oldEx = enemy.x;
    const oldEy = enemy.y;

    if (enemy.type !== 'badguy') {
      enemy.velocityY = Math.min((enemy.velocityY || 0) + GRAVITY * dt, MAX_FALL_SPEED);
      enemy.y += enemy.velocityY * dt;
      if (enemy.y > GAME_HEIGHT + 40) {
        enemy.alive = false;
        continue;
      }
    }

    if (enemy.type === 'snake') {
      enemy.waveOffset = (enemy.waveOffset || 0) + dt * 6;
      enemy.attackCooldown = (enemy.attackCooldown ?? 2) - dt;
      const dist = Math.abs(player.x - enemy.x);
      if (dist < 60 && Math.abs(player.y - enemy.y) < 30 && enemy.attackCooldown <= 0 && !enemy.isLunging) {
        enemy.isLunging = true;
        enemy.lungeTimer = 0.36;
        enemy.attackCooldown = 2.8 + Math.random() * 1.5;
        enemy.direction = player.x > enemy.x ? 1 : -1;
        enemy.velocityY = -145;
      }

      if (enemy.isLunging) {
        enemy.lungeTimer = (enemy.lungeTimer || 0) - dt;
        enemy.x += enemy.direction * 115 * dt;
        if (enemy.lungeTimer <= 0) enemy.isLunging = false;
      } else {
        const mult = 1 + Math.abs(Math.sin(enemy.waveOffset)) * 0.28;
        enemy.x += enemy.direction * 48 * mult * dt;
        enemy.hopTimer = (enemy.hopTimer ?? 2) - dt;
        if (enemy.hopTimer <= 0 && Math.abs(enemy.velocityY) < 8) {
          enemy.velocityY = -135;
          enemy.hopTimer = 2.2 + Math.random() * 1.8;
        }
      }
    } else if (enemy.type === 'badguy') {
      // Haunted Ghost AI (Restored!)
      const playerMoving = Math.abs(player.velocityX) > 6 || Math.abs(player.velocityY) > 6;
      const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);

      if (!playerMoving && !enemy.isDisappearing) {
        enemy.frozen = true;
        enemy.opacity = Math.max(0.25, (enemy.opacity ?? 0.85) - dt * 0.7);
        if (dist > 16) {
          enemy.x += Math.sign(player.x - enemy.x) * 14 * dt;
        }
      } else if (!enemy.isDisappearing) {
        enemy.frozen = false;
        enemy.opacity = Math.min(0.88, (enemy.opacity ?? 0.85) + dt * 2.5);
      }

      enemy.disappearTimer = (enemy.disappearTimer ?? 5) - dt;
      if (!enemy.isDisappearing && enemy.disappearTimer <= 0) {
        enemy.isDisappearing = true;
        enemy.disappearTimer = 1.0;
      } else if (enemy.isDisappearing) {
        enemy.opacity = Math.max(0, enemy.disappearTimer);
        if (enemy.disappearTimer <= 0) {
          const offset = (Math.random() > 0.5 ? 1 : -1) * (48 + Math.random() * 25);
          enemy.x = Math.max(32, Math.min(state.stageWidth - 120, player.x + offset));
          enemy.y = Math.max(36, player.y - 18);
          enemy.isDisappearing = false;
          enemy.disappearTimer = 4.5 + Math.random() * 3.5;
        }
      }

      if (!enemy.frozen && !enemy.isDisappearing) {
        const ghostSpeed = 38 + Math.max(0, (90 - dist) / 90) * 24;
        enemy.direction = player.x >= enemy.x ? 1 : -1;
        enemy.x += enemy.direction * ghostSpeed * dt;
        enemy.floatOffset = (enemy.floatOffset || 0) + dt * 2.6;
        const targetY = 82 + Math.sin(enemy.floatOffset) * 14;
        enemy.y += (targetY - enemy.y) * dt * 2.4;
      }
    } else {
      // Goomba AI
      if (enemy.initialPushX !== undefined) {
        enemy.x += enemy.initialPushX * dt;
        enemy.initialPushX *= 0.92;
        if (Math.abs(enemy.initialPushX) < 5) enemy.initialPushX = undefined;
      } else if (Math.abs(player.x - enemy.x) < 76 && Math.abs(player.y - enemy.y) < 36) {
        enemy.direction = player.x > enemy.x ? 1 : -1;
        enemy.x += enemy.direction * (enemy.chaseSpeed || 54) * dt;
      } else {
        enemy.patrolTimer = (enemy.patrolTimer ?? 2) - dt;
        if (enemy.patrolTimer <= 0) {
          if (Math.random() > 0.65) enemy.direction *= -1;
          enemy.patrolTimer = 2 + Math.random() * 2.5;
        }
        enemy.x += enemy.direction * 35 * dt;
      }
    }

    // Enemy Ground & Wall Collision via SpatialGrid (FIXED: skips broken bricks!)
    if (enemy.type !== 'badguy') {
      let onPlat = false;
      let hitWall = false;
      const eNear = grid.query(enemy.x - 16, enemy.x + 28);

      for (let k = 0; k < eNear.length; k++) {
        const p = eNear[k];
        if (p.broken || p.type === 'spike') continue;

        if (enemy.x + 12 > p.x && enemy.x < p.x + p.width) {
          if (enemy.velocityY >= 0 && oldEy + 12 <= p.y + 3 && enemy.y + 12 >= p.y - 1) {
            enemy.y = p.y - 12;
            enemy.velocityY = 0;
            onPlat = true;
          }
        }

        if (p.type !== 'ground' && p.type !== 'moving' && enemy.y + 11 > p.y && enemy.y + 1 < p.y + p.height) {
          if (
            (enemy.direction > 0 && enemy.x + 12 > p.x && oldEx + 12 <= p.x + 2) ||
            (enemy.direction < 0 && enemy.x < p.x + p.width && oldEx >= p.x + p.width - 2)
          ) {
            hitWall = true;
          }
        }
      }

      if (hitWall) {
        enemy.direction *= -1;
        enemy.x = oldEx;
        enemy.isLunging = false;
      } else if (onPlat && enemy.type !== 'snake') {
        const probeX = enemy.direction > 0 ? enemy.x + 13 : enemy.x - 2;
        const hasFloorAhead = eNear.some(
          (p) => !p.broken && probeX >= p.x && probeX <= p.x + p.width && Math.abs(enemy.y + 12 - p.y) < 2
        );
        if (!hasFloorAhead) {
          enemy.direction *= -1;
        }
      }
    }

    // Player vs Enemy Collision
    if (
      !(enemy.type === 'badguy' && enemy.isDisappearing) &&
      Math.abs(player.x - enemy.x) < 11 &&
      Math.abs(player.y - enemy.y) < 12
    ) {
      if (player.hasHelmet || player.isDashing || (selectedChar === 'guy3' && player.isSlamming)) {
        enemy.alive = false;
        sound.play('stomp');
        state.combo++;
        state.comboTimer = 3.2;
        state.screenShake = 0.12;
        const pts = 200 + (state.combo > 1 ? state.combo * 80 : 0);
        addScore(pts);
        spawnFloatingText(state, enemy.x + 6, enemy.y, `+${pts}`, '#FDE047');
        spawnEnemyDefeatBurst(state, enemy.x, enemy.y, '#FB923C');
        continue;
      }

      if (player.velocityY > 0 && player.y < enemy.y - 3) {
        // Stomp!
        enemy.alive = false;
        player.velocityY = -235;
        player.doubleJumpAvailable = selectedChar === 'guy1';
        player.airDashCount = 0;
        player.squashX = 1.2;
        player.squashY = 0.82;
        sound.play('stomp');
        cb.vibrate(14);
        state.combo++;
        state.comboTimer = 3.2;
        state.screenShake = 0.12;
        const pts = 200 + (state.combo > 1 ? state.combo * 80 : 0);
        addScore(pts);
        spawnFloatingText(state, enemy.x + 6, enemy.y, `+${pts}`, '#FDE047');
        spawnEnemyDefeatBurst(state, enemy.x, enemy.y, '#EF4444');
        continue;
      }

      if (player.invincibilityTimer <= 0) {
        killPlayer(false);
        return;
      }
    }
  }

  // 14. Update Boss Arena & Boss AI!
  updateBoss(
    state,
    dt,
    selectedChar,
    sound,
    addScore,
    () => killPlayer(false),
    () => grid.build(state.platforms)
  );

  // 15. Combo & Screen Shake & Particles
  if (state.comboTimer > 0) {
    state.comboTimer -= dt;
    if (state.comboTimer <= 0) state.combo = 0;
  }
  if (state.screenShake > 0) {
    state.screenShake = Math.max(0, state.screenShake - dt);
  }
  updateParticlesInPlace(state, dt);

  // 16. Grand Flagpole Capture (Requires Boss defeated on Boss Stages!)
  const bossBlocking = state.boss && state.boss.aiState !== 'dead';
  if (
    !bossBlocking &&
    !state.celebrating &&
    player.x + player.width >= state.goalX - 5 &&
    player.x <= state.goalX + 20 &&
    player.y + player.height >= 42
  ) {
    // Calculate Flagpole Grab Height Bonus (100 at base -> 1000 at gold finial top!)
    const grabRatio = Math.max(0, Math.min(1, (114 - player.y) / 62));
    state.flagPoleBonus = [100, 200, 400, 800, 1000][Math.min(4, Math.floor(grabRatio * 4.99))];

    // Scale Par Time to Stage Length + Perfect All-Coins Bonus
    const parTime = Math.round(state.stageWidth / 52);
    const timeBonus = Math.max(100, Math.floor(Math.max(0, parTime - state.stageTime) * 10));
    const perfectBonus =
      state.totalCoinsThisStage > 0 && state.coinsCollectedThisStage >= state.totalCoinsThisStage
        ? 1000
        : 0;
    state.stageBonusAwarded = state.flagPoleBonus + timeBonus + perfectBonus;
    addScore(state.stageBonusAwarded);

    // 1 to 3 Star Stage Rating
    let stars = 1;
    if (
      state.coinsCollectedThisStage >= state.totalCoinsThisStage * 0.55 ||
      state.flagPoleBonus >= 800
    ) {
      stars++;
    }
    if (
      state.coinsCollectedThisStage >= state.totalCoinsThisStage * 0.85 ||
      (state.stageTime <= parTime * 0.85 &&
        state.coinsCollectedThisStage >= state.totalCoinsThisStage * 0.4)
    ) {
      stars++;
    }
    state.stageStars = Math.min(3, stars);

    // Trigger 2-Act Flagpole Slide & Fireworks Celebration!
    state.celebrating = true;
    state.celebrationTimer = 4.5;
    state.celebrationElapsed = 0;
    state.flagSlideComplete = false;
    state.flagRaiseProgress = 0;
    state.fireworkTimer = 0.2;

    player.isDashing = false;
    player.isAirSliding = false;
    player.isSlamming = false;
    player.velocityX = 0;
    player.velocityY = 0;
    player.rotation = 0;
    player.facingLeft = false;
    player.x = state.goalX - 5;
    player.y = Math.max(48, Math.min(112, player.y));
    player.prevX = player.x;
    player.prevY = player.y;
    player.squashX = 0.85;
    player.squashY = 1.15;

    sound.play('flagSlide');
    cb.vibrate(20);

    spawnFloatingText(
      state,
      state.goalX + 4,
      Math.max(36, player.y - 6),
      state.flagPoleBonus >= 1000 ? 'TOP! +1000!' : `+${state.flagPoleBonus}!`,
      '#FDE047',
      1.35
    );

    for (let i = 0; i < 24; i++) {
      const a = (Math.PI * 2 * i) / 24;
      const spd = 65 + Math.random() * 85;
      state.particles.push({
        x: state.goalX + 1,
        y: player.y + 5,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 45,
        life: 0.9,
        maxLife: 0.9,
        color: ['#FFD700', '#4ADE80', '#38BDF8', '#F43F5E'][i % 4],
      });
    }
  }

  // 17. Signature FLIPPRX Speech Bubble ("WE FLIP" -> "WE FLIPPING!")
  if (state.speechCooldown > 0) state.speechCooldown -= dt;
  if (state.speechBubble) {
    state.speechBubble.timer -= dt;
    if (state.speechBubble.timer <= 0) {
      if (state.speechBubble.phraseIndex < 2) {
        state.speechBubble.phraseIndex++;
        const phrases = ['we flip', 'we flip', 'we Flipping'];
        state.speechBubble.text = phrases[state.speechBubble.phraseIndex];
        state.speechBubble.timer = 0.75;
      } else {
        state.speechBubble = null;
        state.speechCooldown = 9 + Math.random() * 7;
      }
    }
  } else if (state.speechCooldown <= 0 && (Math.abs(player.velocityX) > 25 || !player.onGround)) {
    if (Math.random() < 0.012) {
      state.speechBubble = { text: 'we flip', timer: 0.75, phraseIndex: 0 };
    }
  }

  // 18. Camera Tracking (Locks smoothly onto Boss Arena when Boss is active!)
  if (state.boss && state.boss.aiState !== 'inactive' && state.boss.aiState !== 'dead') {
    const arenaCenter = (state.boss.arenaLeft + state.boss.arenaRight) / 2;
    state.camera.targetX = Math.max(
      0,
      Math.min(arenaCenter - gameWidth / 2, state.stageWidth - gameWidth)
    );
  } else {
    const lookahead = player.velocityX * 0.16;
    state.camera.targetX = Math.max(
      0,
      Math.min(player.x + lookahead - gameWidth / 2, state.stageWidth - gameWidth)
    );
  }
  const camSpeed = player.onGround ? 12 : 9.5;
  state.camera.x += (state.camera.targetX - state.camera.x) * Math.min(1, camSpeed * dt);
  state.camera.y = state.screenShake > 0 ? Math.floor((Math.random() - 0.5) * state.screenShake * 10) : 0;

  // 19. Pit Death Check
  if (player.y > GAME_HEIGHT + 36) {
    killPlayer(true);
  }
}

function triggerQuestionBlock(
  state: GameState,
  platform: GameState['platforms'][0],
  selectedChar: CharacterId,
  sound: SoundManager,
  addScore: (pts: number) => void
) {
  platform.used = true;
  platform.bounceOffset = 5;
  sound.play('powerup');
  state.screenShake = 0.08;

  const roll = Math.random();

  if (roll < 0.22) {
    // RESTORED: STAR HELMET INVINCIBILITY!
    state.player.hasHelmet = true;
    state.player.helmetTimer = selectedChar === 'guy1' ? 12.5 : 10.0;
    addScore(300);
    spawnFloatingText(state, platform.x + 8, platform.y - 10, 'STAR HELMET!', '#FDE047', 1.3);
    spawnEnemyDefeatBurst(state, platform.x, platform.y, '#FACC15');
  } else if (roll < 0.62) {
    // 3× Coin Stack!
    for (let i = 0; i < 3; i++) {
      state.coins.push({
        x: platform.x + 4,
        y: platform.y - 16 - i * 10,
        collected: false,
        floatOffset: i * 0.6,
      });
      state.totalCoinsThisStage++;
    }
    spawnFloatingText(state, platform.x + 8, platform.y - 10, '3X COINS!', '#FFD700');
  } else if (roll < 0.85) {
    // Bonus Water Gun refill on Boss Stages or +350 Gold Jackpot!
    if ((state.currentStage === 5 || state.currentStage === 10) && !state.player.hasWaterGun) {
      state.player.hasWaterGun = true;
      state.player.waterGunTimer = 20;
      spawnFloatingText(state, platform.x + 8, platform.y - 10, 'WATER BLASTER!', '#38BDF8', 1.3);
    } else {
      addScore(350);
      spawnFloatingText(state, platform.x + 8, platform.y - 10, '+350 BONUS!', '#4ADE80');
    }
  } else {
    // Surprise Goomba!
    const dir = Math.random() > 0.5 ? 1 : -1;
    state.enemies.push({
      x: platform.x + 2,
      y: platform.y - 13,
      direction: dir,
      alive: true,
      type: 'goomba',
      velocityY: -175,
      initialPushX: dir * 55,
      patrolTimer: 2,
    });
    spawnFloatingText(state, platform.x + 8, platform.y - 10, 'AMBUSH!', '#EF4444');
  }
}

function spawnBrickDebris(state: GameState, x: number, y: number) {
  for (let i = 0; i < 12; i++) {
    const a = (Math.PI * 2 * i) / 12;
    const spd = 45 + Math.random() * 55;
    state.particles.push({
      x: x + 8,
      y: y + 8,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd - 45,
      life: 0.5,
      maxLife: 0.5,
      color: i % 2 === 0 ? '#EF4444' : '#991B1B',
    });
  }
}

function spawnEnemyDefeatBurst(state: GameState, x: number, y: number, color: string) {
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI * 2 * i) / 10;
    state.particles.push({
      x: x + 6,
      y: y + 6,
      vx: Math.cos(a) * 75,
      vy: Math.sin(a) * 75 - 30,
      life: 0.42,
      maxLife: 0.42,
      color,
    });
  }
}

function updateParticlesInPlace(state: GameState, dt: number) {
  if (state.particles.length > MAX_PARTICLES) {
    state.particles.length = MAX_PARTICLES;
  }
  let w = 0;
  for (let i = 0; i < state.particles.length; i++) {
    const p = state.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (!p.noGravity) p.vy += 210 * dt;
    p.life -= dt;
    if (p.life > 0) state.particles[w++] = p;
  }
  state.particles.length = w;
}
