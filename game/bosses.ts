import { GRAVITY } from './constants';
import { SoundManager } from './audio';
import { drawPixelText } from './tileAtlas';
import { Boss, CharacterId, GameState } from './types';

export function spawnFloatingText(
  state: GameState,
  x: number,
  y: number,
  text: string,
  color = '#FFD700',
  life = 0.9
) {
  state.floatingTexts.push({
    x,
    y,
    vy: -26,
    text,
    color,
    life,
    maxLife: life,
  });
}

function openArenaGates(state: GameState) {
  for (const p of state.platforms) {
    if (p.type === 'gate') {
      p.broken = true;
    }
  }
}

function closeArenaGates(state: GameState, boss: Boss) {
  if (boss.gateClosed) return;
  boss.gateClosed = true;
  let maxId = state.platforms.reduce((m, p) => Math.max(m, p.id), 0) + 1;
  // Left & Right iron gates sealing the arena from y=48..128
  for (let y = 48; y < 128; y += 16) {
    state.platforms.push({
      id: maxId++,
      x: boss.arenaLeft - 16,
      y,
      width: 16,
      height: 16,
      type: 'gate',
    });
    state.platforms.push({
      id: maxId++,
      x: boss.arenaRight,
      y,
      width: 16,
      height: 16,
      type: 'gate',
    });
  }
}

export function resetBossOnPlayerDeath(state: GameState) {
  const boss = state.boss;
  if (!boss || boss.aiState === 'dead') return;
  boss.aiState = 'inactive';
  boss.hp = boss.maxHp;
  boss.phase = 1;
  boss.vx = 0;
  boss.vy = 0;
  boss.x = boss.arenaRight - (boss.kind === 'finalboss' ? 52 : 44);
  boss.y = boss.arenaFloorY - boss.height;
  boss.facingLeft = true;
  boss.gateClosed = false;
  boss.hurtFlashTimer = 0;
  boss.invulnTimer = 0;
  boss.attackCounter = 0;
  state.bossProjectiles = [];
  // Remove any gate blocks so player can re-enter cleanly
  state.platforms = state.platforms.filter((p) => p.type !== 'gate');
}

export function damageBoss(
  state: GameState,
  boss: Boss,
  amount: number,
  sound: SoundManager,
  label?: string
): boolean {
  if (
    boss.invulnTimer > 0 ||
    boss.aiState === 'intro' ||
    boss.aiState === 'phase_transition' ||
    boss.aiState === 'dying' ||
    boss.aiState === 'dead'
  ) {
    return false;
  }

  boss.hp = Math.max(0, boss.hp - amount);
  boss.hurtFlashTimer = 0.22;
  boss.invulnTimer = amount >= 1 ? 0.35 : 0.12;
  sound.play('bossHit');
  state.screenShake = Math.max(state.screenShake, amount >= 2 ? 0.25 : 0.14);
  if (amount >= 1) {
    state.hitStopTimer = amount >= 2 ? 0.065 : 0.04;
  }

  const popup = label || (amount >= 2 ? 'MEGA SLAM! -2' : amount >= 1 ? '-1 HP!' : 'HIT!');
  spawnFloatingText(
    state,
    boss.x + boss.width / 2,
    boss.y - 6,
    popup,
    amount >= 2 ? '#FF4500' : '#FDE047'
  );

  // Hit burst particles
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i) / 12;
    const spd = 65 + Math.random() * 55;
    state.particles.push({
      x: boss.x + boss.width / 2,
      y: boss.y + boss.height / 2,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd - 20,
      life: 0.45,
      maxLife: 0.45,
      color: i % 2 === 0 ? '#FFFFFF' : '#EF4444',
    });
  }

  // Check defeat!
  if (boss.hp <= 0) {
    boss.aiState = 'dying';
    boss.stateTimer = 2.2;
    boss.vx = 0;
    boss.vy = 0;
    state.bossProjectiles = [];
    sound.play('bossExplosion');
    state.screenShake = 0.35;
    spawnFloatingText(state, boss.x + boss.width / 2, boss.y - 12, 'DEFEATED!', '#4ADE80', 1.5);
    return true;
  }

  // Check Final Boss Phase 2 Enrage Transition at 50% HP!
  if (boss.kind === 'finalboss' && boss.phase === 1 && boss.hp <= boss.maxHp / 2) {
    boss.phase = 2;
    boss.aiState = 'phase_transition';
    boss.stateTimer = 1.5;
    boss.invulnTimer = 1.5;
    boss.vx = 0;
    boss.vy = 0;
    sound.play('bossRoar');
    state.screenShake = 0.3;
    spawnFloatingText(state, boss.x + boss.width / 2, boss.y - 14, 'ENRAGED!', '#22D3EE', 1.4);

    for (let i = 0; i < 28; i++) {
      const angle = (Math.PI * 2 * i) / 28;
      const spd = 80 + Math.random() * 80;
      state.particles.push({
        x: boss.x + boss.width / 2,
        y: boss.y + boss.height / 2,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        life: 0.7,
        maxLife: 0.7,
        color: i % 2 === 0 ? '#22D3EE' : '#D946EF',
      });
    }
  }

  return true;
}

export function updateBoss(
  state: GameState,
  dt: number,
  selectedChar: CharacterId,
  sound: SoundManager,
  onAddScore: (pts: number) => void,
  onKillPlayer: () => void,
  rebuildSpatialGrid: () => void
) {
  const boss = state.boss;
  const player = state.player;

  // Update boss projectiles even if boss just shifted state
  state.bossProjectiles = state.bossProjectiles.filter((proj) => {
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;
    if (proj.kind === 'venom') {
      proj.vy += GRAVITY * 0.45 * dt;
      if (proj.y + proj.height >= 128) {
        proj.y = 128 - proj.height;
        proj.vy = -125; // Bouncing venom orb!
      }
    }
    proj.life -= dt;

    // Trail sparks
    if (Math.random() > 0.65) {
      state.particles.push({
        x: proj.x + proj.width / 2,
        y: proj.y + proj.height / 2,
        vx: -proj.vx * 0.15,
        vy: (Math.random() - 0.5) * 15,
        life: 0.2,
        maxLife: 0.2,
        color: proj.color,
      });
    }

    // Check collision with player
    if (
      proj.life > 0 &&
      player.x + player.width - 2 > proj.x &&
      player.x + 2 < proj.x + proj.width &&
      player.y + player.height - 2 > proj.y &&
      player.y + 2 < proj.y + proj.height
    ) {
      if (player.invincibilityTimer <= 0 && !player.hasHelmet) {
        proj.life = 0;
        onKillPlayer();
        return false;
      } else if (player.hasHelmet) {
        proj.life = 0;
        return false;
      }
    }

    return proj.life > 0 && proj.x > (boss ? boss.arenaLeft - 32 : 0) && proj.x < state.stageWidth + 32;
  });

  if (!boss || boss.aiState === 'dead') return;

  boss.animTimer += dt;
  if (boss.hurtFlashTimer > 0) boss.hurtFlashTimer -= dt;
  if (boss.invulnTimer > 0) boss.invulnTimer -= dt;

  // 1. Activate Boss when player enters Arena!
  if (boss.aiState === 'inactive') {
    if (player.x >= boss.arenaLeft + 20) {
      // Auto-save checkpoint just outside arena so retries start right at the boss door!
      state.respawnX = boss.arenaLeft - 36;
      state.respawnY = 112;
      for (const cp of state.checkpoints) cp.activated = true;

      closeArenaGates(state, boss);
      rebuildSpatialGrid();
      boss.aiState = 'intro';
      boss.stateTimer = 1.5;
      state.bossWarningTimer = 1.5;
      sound.play('bossWarning');
      sound.play('bossRoar');
      state.screenShake = 0.22;
    }
    return;
  }

  // 2. Dying explosion sequence
  if (boss.aiState === 'dying') {
    boss.stateTimer -= dt;
    if (Math.random() < 0.45) {
      const ex = boss.x + Math.random() * boss.width;
      const ey = boss.y + Math.random() * boss.height;
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 40 + Math.random() * 80;
        state.particles.push({
          x: ex,
          y: ey,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd - 30,
          life: 0.55,
          maxLife: 0.55,
          color: ['#FFD700', '#EF4444', '#FB923C', '#FFFFFF'][i % 4],
        });
      }
    }

    if (boss.stateTimer <= 0) {
      boss.aiState = 'dead';
      openArenaGates(state);
      rebuildSpatialGrid();
      const reward = boss.kind === 'finalboss' ? 5000 : 2500;
      onAddScore(reward);
      sound.play('celebration');
      spawnFloatingText(state, boss.x + boss.width / 2, boss.y, `+${reward}!`, '#FFD700', 1.6);

      // Fountain of celebratory gold coins across the arena!
      const coinBurst = boss.kind === 'finalboss' ? 24 : 14;
      for (let i = 0; i < coinBurst; i++) {
        const cx = boss.arenaLeft + 20 + ((boss.arenaRight - boss.arenaLeft - 40) * i) / coinBurst;
        state.coins.push({
          x: cx,
          y: 88 + (i % 3) * 10,
          collected: false,
          floatOffset: i * 0.4,
        });
        state.totalCoinsThisStage++;
      }
    }
    return;
  }

  // 3. Intro / Phase Transition dramatic pause
  if (boss.aiState === 'intro' || boss.aiState === 'phase_transition') {
    boss.stateTimer -= dt;
    boss.facingLeft = player.x < boss.x;
    if (boss.stateTimer <= 0) {
      boss.aiState = 'walk';
      boss.stateTimer = 0.8;
    }
    return;
  }

  const enraged = boss.phase === 2;
  const speedScale = enraged ? 1.28 : 1.0;

  // Apply gravity when airborne
  if (!boss.onGround && boss.aiState !== 'slam_dive') {
    boss.vy += GRAVITY * 0.85 * dt;
  }

  // 4. Boss AI State Transitions
  boss.stateTimer -= dt;

  switch (boss.aiState) {
    case 'idle':
    case 'walk': {
      boss.facingLeft = player.x < boss.x + boss.width / 2;
      const walkSpeed = (boss.kind === 'finalboss' ? 42 : 48) * speedScale;
      boss.vx = (boss.facingLeft ? -1 : 1) * walkSpeed;

      if (boss.stateTimer <= 0) {
        boss.vx = 0;
        const pattern = boss.attackCounter % (boss.kind === 'finalboss' ? 3 : 2);
        boss.attackCounter++;

        if (pattern === 0) {
          boss.aiState = 'telegraph_shoot';
          boss.stateTimer = enraged ? 0.42 : 0.55;
        } else if (pattern === 1) {
          boss.aiState = 'telegraph_charge';
          boss.stateTimer = enraged ? 0.48 : 0.62;
          sound.play('bossRoar');
        } else {
          boss.aiState = 'telegraph_slam';
          boss.stateTimer = enraged ? 0.4 : 0.52;
          sound.play('bossRoar');
        }
      }
      break;
    }

    case 'telegraph_shoot': {
      boss.vx = 0;
      boss.facingLeft = player.x < boss.x + boss.width / 2;
      if (boss.stateTimer <= 0) {
        boss.aiState = 'shooting';
        boss.stateTimer = 0.55;
        const dir = boss.facingLeft ? -1 : 1;
        const spawnX = boss.facingLeft ? boss.x - 8 : boss.x + boss.width;

        if (boss.kind === 'miniboss') {
          // Spit 2 bouncing venom orbs!
          sound.play('shoot');
          state.bossProjectiles.push({
            x: spawnX,
            y: boss.y + 8,
            vx: dir * 115,
            vy: -95,
            width: 6,
            height: 6,
            kind: 'venom',
            life: 3.0,
            color: '#4ADE80',
          });
          state.bossProjectiles.push({
            x: spawnX,
            y: boss.y + 6,
            vx: dir * 155,
            vy: -140,
            width: 6,
            height: 6,
            kind: 'venom',
            life: 3.0,
            color: '#A3E635',
          });
        } else {
          // OVERLORD REKTUS: Red-Candle Energy Cleaver Barrage!
          sound.play('shoot');
          const bladeColor = enraged ? '#22D3EE' : '#EF4444';
          // Low ground wave (jumpable) + high shot
          state.bossProjectiles.push({
            x: spawnX,
            y: boss.arenaFloorY - 12,
            vx: dir * (enraged ? 155 : 130),
            vy: 0,
            width: 10,
            height: 8,
            kind: 'candle',
            life: 2.5,
            color: bladeColor,
          });
          state.bossProjectiles.push({
            x: spawnX,
            y: boss.arenaFloorY - 34,
            vx: dir * (enraged ? 130 : 105),
            vy: 0,
            width: 10,
            height: 6,
            kind: 'candle',
            life: 2.5,
            color: '#FACC15',
          });

          // Phase 2 rains 2 telegraphed overhead magma meteors!
          if (enraged) {
            for (let m = 0; m < 2; m++) {
              const mx =
                boss.arenaLeft + 30 + Math.random() * (boss.arenaRight - boss.arenaLeft - 60);
              state.bossProjectiles.push({
                x: mx,
                y: 8,
                vx: 0,
                vy: 95 + m * 20,
                width: 8,
                height: 10,
                kind: 'meteor',
                life: 2.0,
                color: '#F97316',
              });
            }
          }
        }
      }
      break;
    }

    case 'shooting': {
      boss.vx = 0;
      if (boss.stateTimer <= 0) {
        boss.aiState = 'walk';
        boss.stateTimer = enraged ? 0.7 : 0.95;
      }
      break;
    }

    case 'telegraph_charge': {
      boss.vx = 0;
      boss.facingLeft = player.x < boss.x + boss.width / 2;
      // Angry charge dust sparks at feet
      if (Math.random() > 0.5) {
        state.particles.push({
          x: boss.x + boss.width / 2,
          y: boss.arenaFloorY - 2,
          vx: (boss.facingLeft ? 1 : -1) * (35 + Math.random() * 30),
          vy: -15 - Math.random() * 20,
          life: 0.25,
          maxLife: 0.25,
          color: '#FACC15',
        });
      }
      if (boss.stateTimer <= 0) {
        boss.aiState = 'charging';
        boss.stateTimer = 1.6;
        const chargeSpd = (boss.kind === 'finalboss' ? 185 : 165) * speedScale;
        boss.vx = (boss.facingLeft ? -1 : 1) * chargeSpd;
      }
      break;
    }

    case 'charging': {
      // Check if boss rams into arena boundary wall -> STUNNED!
      const minX = boss.arenaLeft + 2;
      const maxX = boss.arenaRight - boss.width - 2;
      if (
        (boss.vx < 0 && boss.x <= minX) ||
        (boss.vx > 0 && boss.x >= maxX) ||
        boss.stateTimer <= 0
      ) {
        boss.x = Math.max(minX, Math.min(maxX, boss.x));
        boss.vx = 0;
        boss.aiState = 'stunned';
        boss.stateTimer = enraged ? 1.35 : 1.75;
        sound.play('break');
        state.screenShake = 0.2;
        for (let i = 0; i < 12; i++) {
          state.particles.push({
            x: boss.x + boss.width / 2,
            y: boss.y + 8,
            vx: (Math.random() - 0.5) * 90,
            vy: -30 - Math.random() * 60,
            life: 0.45,
            maxLife: 0.45,
            color: '#FDE047',
          });
        }
      }
      break;
    }

    case 'telegraph_slam': {
      boss.vx = 0;
      boss.facingLeft = player.x < boss.x + boss.width / 2;
      if (boss.stateTimer <= 0) {
        boss.aiState = 'slam_jump';
        boss.onGround = false;
        boss.vy = -340;
        boss.targetX = Math.max(
          boss.arenaLeft + 16,
          Math.min(boss.arenaRight - boss.width - 16, player.x - boss.width / 2)
        );
        boss.vx = (boss.targetX - boss.x) * 1.4;
        sound.play('jump');
      }
      break;
    }

    case 'slam_jump': {
      if (boss.vy >= -20) {
        boss.aiState = 'slam_dive';
        boss.vx = 0;
        boss.vy = enraged ? 480 : 420;
      }
      break;
    }

    case 'slam_dive': {
      // Fiery meteor trail while diving!
      for (let i = 0; i < 2; i++) {
        state.particles.push({
          x: boss.x + 4 + Math.random() * (boss.width - 8),
          y: boss.y + boss.height,
          vx: (Math.random() - 0.5) * 30,
          vy: -50,
          life: 0.25,
          maxLife: 0.25,
          color: enraged ? '#22D3EE' : '#F97316',
        });
      }
      if (boss.y + boss.height >= boss.arenaFloorY) {
        boss.y = boss.arenaFloorY - boss.height;
        boss.vy = 0;
        boss.onGround = true;
        boss.aiState = 'stunned';
        boss.stateTimer = enraged ? 1.3 : 1.65;
        sound.play('stomp');
        sound.play('break');
        state.screenShake = 0.26;

        // Spawn left & right floor shockwaves!
        const waveSpd = enraged ? 155 : 125;
        const waveColor = enraged ? '#D946EF' : '#EF4444';
        state.bossProjectiles.push({
          x: boss.x - 6,
          y: boss.arenaFloorY - 9,
          vx: -waveSpd,
          vy: 0,
          width: 10,
          height: 9,
          kind: 'shockwave',
          life: 1.8,
          color: waveColor,
        });
        state.bossProjectiles.push({
          x: boss.x + boss.width - 4,
          y: boss.arenaFloorY - 9,
          vx: waveSpd,
          vy: 0,
          width: 10,
          height: 9,
          kind: 'shockwave',
          life: 1.8,
          color: waveColor,
        });
      }
      break;
    }

    case 'stunned': {
      boss.vx = 0;
      if (boss.stateTimer <= 0) {
        boss.aiState = 'walk';
        boss.stateTimer = enraged ? 0.65 : 0.9;
      }
      break;
    }
  }

  // Integrate Boss Position within Arena Bounds
  boss.x += boss.vx * dt;
  boss.y += boss.vy * dt;

  if (boss.y + boss.height >= boss.arenaFloorY) {
    boss.y = boss.arenaFloorY - boss.height;
    boss.vy = 0;
    boss.onGround = true;
  }
  boss.x = Math.max(boss.arenaLeft + 2, Math.min(boss.arenaRight - boss.width - 2, boss.x));

  // 5. Player vs Boss Collision (Generous Stomp / Slam / Dash Priority!)
  const overlapX = player.x + player.width > boss.x + 2 && player.x < boss.x + boss.width - 2;
  const overlapY = player.y + player.height > boss.y + 2 && player.y < boss.y + boss.height;

  if (overlapX && overlapY) {
    const pushDir = player.x + player.width / 2 < boss.x + boss.width / 2 ? -1 : 1;

    // Priority 1: Guy3 Slammer Ground-Pound = 2x Heavy Damage!
    if (selectedChar === 'guy3' && player.isSlamming) {
      player.isSlamming = false;
      player.velocityY = -280;
      player.velocityX = pushDir * 110;
      player.invincibilityTimer = Math.max(player.invincibilityTimer, 0.55);
      damageBoss(state, boss, 2, sound, 'MEGA SLAM! -2');
      onAddScore(400);
      return;
    }

    // Priority 2: Stomp on upper half of Boss!
    const isFallingOntoHead =
      player.velocityY > 0 && player.y + player.height <= boss.y + boss.height * 0.58;
    if (isFallingOntoHead && boss.aiState !== 'slam_dive') {
      player.velocityY = -270;
      player.velocityX = pushDir * 95;
      player.invincibilityTimer = Math.max(player.invincibilityTimer, 0.45);
      player.doubleJumpAvailable = selectedChar === 'guy1';
      player.airDashCount = 0;
      damageBoss(state, boss, 1, sound, 'STOMP! -1');
      onAddScore(250);
      return;
    }

    // Priority 3: Star Helmet or Dashing into Stunned Boss!
    if (player.hasHelmet || (player.isDashing && boss.aiState === 'stunned')) {
      player.velocityY = -200;
      player.velocityX = pushDir * 120;
      player.invincibilityTimer = Math.max(player.invincibilityTimer, 0.45);
      damageBoss(state, boss, 1, sound, 'STRIKE! -1');
      onAddScore(250);
      return;
    }

    // Otherwise: Boss hurts player (unless player has dash/respawn invincibility)
    if (player.invincibilityTimer <= 0) {
      onKillPlayer();
    }
  }
}

export function renderBossWorld(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  sprites: Record<string, HTMLImageElement>,
  now: number
) {
  const boss = state.boss;

  // Draw Boss Projectiles
  for (const proj of state.bossProjectiles) {
    const px = Math.floor(proj.x);
    const py = Math.floor(proj.y);

    if (proj.kind === 'candle') {
      // Pixel-art Horizontal Red/Cyan Candlestick Blade!
      ctx.fillStyle = '#000000';
      ctx.fillRect(px - 1, py - 1, proj.width + 2, proj.height + 2);
      ctx.fillStyle = proj.color;
      ctx.fillRect(px, py, proj.width, proj.height);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(px + 2, py + 1, proj.width - 4, 2);
      // Candle wick!
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(proj.vx < 0 ? px - 3 : px + proj.width, py + Math.floor(proj.height / 2), 3, 1);
    } else if (proj.kind === 'shockwave') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(px - 1, py - 1, proj.width + 2, proj.height + 2);
      ctx.fillStyle = proj.color;
      ctx.fillRect(px, py + 2, proj.width, proj.height - 2);
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(px + 2, py, proj.width - 4, 4);
    } else if (proj.kind === 'meteor') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(px - 1, py - 1, proj.width + 2, proj.height + 2);
      ctx.fillStyle = '#EA580C';
      ctx.fillRect(px, py, proj.width, proj.height);
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(px + 2, py + 3, proj.width - 4, proj.height - 4);
    } else {
      // Venom orb
      ctx.fillStyle = '#000000';
      ctx.fillRect(px - 1, py - 1, proj.width + 2, proj.height + 2);
      ctx.fillStyle = proj.color;
      ctx.fillRect(px, py, proj.width, proj.height);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(px + 1, py + 1, 2, 2);
    }
  }

  if (!boss || boss.aiState === 'inactive' || boss.aiState === 'dead') return;

  // Flicker during dying
  if (boss.aiState === 'dying' && Math.floor(now / 45) % 2 === 0) {
    // Draw explosive flash silhouette
  }

  const bx = Math.floor(boss.x - (boss.spriteWidth - boss.width) / 2);
  const by = Math.floor(boss.y - (boss.spriteHeight - boss.height));

  // Ground shadow beneath airborne boss (great telegraph for where Slam will land!)
  if (!boss.onGround) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(Math.floor(boss.x + 2), boss.arenaFloorY - 2, boss.width - 4, 3);
  }

  // Pick crisp pixel-art sprite frame!
  let spriteKey = '';
  if (boss.kind === 'miniboss') {
    let pose = 'idle1';
    if (boss.aiState === 'stunned' || boss.hurtFlashTimer > 0) pose = 'hurt';
    else if (boss.aiState === 'telegraph_charge' || boss.aiState === 'telegraph_shoot') pose = 'charge';
    else if (boss.aiState === 'charging' || boss.aiState === 'shooting') pose = 'attack';
    else pose = Math.floor(boss.animTimer * 4) % 2 === 0 ? 'idle1' : 'idle2';
    spriteKey = `mini_${pose}.png`;
  } else {
    const prefix = boss.phase === 2 ? 'boss_p2_' : 'boss_';
    let pose = 'idle1';
    if (boss.aiState === 'stunned' || boss.aiState === 'dying') pose = 'hurt';
    else if (
      boss.aiState === 'intro' ||
      boss.aiState === 'phase_transition' ||
      boss.aiState === 'telegraph_slam' ||
      boss.aiState === 'slam_jump'
    ) {
      pose = 'roar';
    } else if (boss.aiState === 'slam_dive') {
      pose = 'slam';
    } else if (boss.aiState === 'telegraph_shoot' || boss.aiState === 'shooting') {
      pose = 'attack';
    } else if (boss.aiState === 'charging') {
      pose = Math.floor(boss.animTimer * 12) % 2 === 0 ? 'walk1' : 'walk2';
    } else if (Math.abs(boss.vx) > 5) {
      pose = Math.floor(boss.animTimer * 5) % 2 === 0 ? 'walk1' : 'walk2';
    } else {
      pose = Math.floor(boss.animTimer * 3) % 2 === 0 ? 'idle1' : 'idle2';
    }
    spriteKey = `${prefix}${pose}.png`;
  }

  const img = sprites[spriteKey];

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Phase 2 fiery aura sparks around Final Boss!
  if (boss.kind === 'finalboss' && boss.phase === 2) {
    for (let i = 0; i < 4; i++) {
      const ang = (now / 180 + i * 1.57) % (Math.PI * 2);
      const ax = bx + boss.spriteWidth / 2 + Math.cos(ang) * (boss.spriteWidth * 0.52);
      const ay = by + boss.spriteHeight / 2 + Math.sin(ang) * (boss.spriteHeight * 0.45);
      ctx.fillStyle = i % 2 === 0 ? '#22D3EE' : '#E879F9';
      ctx.fillRect(Math.floor(ax), Math.floor(ay), 2, 2);
    }
  }

  // Note: boss_attack has cleaver on right (+X), so flip when facingLeft!
  if (img && img.complete && img.naturalWidth > 0) {
    if (boss.facingLeft) {
      ctx.translate(bx + boss.spriteWidth, by);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, boss.spriteWidth, boss.spriteHeight);
    } else {
      ctx.drawImage(img, bx, by, boss.spriteWidth, boss.spriteHeight);
    }
  } else {
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(Math.floor(boss.x), Math.floor(boss.y), boss.width, boss.height);
  }

  // White hit-flash overlay on damage
  if (boss.hurtFlashTimer > 0 && Math.floor(now / 40) % 2 === 0) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fillRect(Math.floor(boss.x), Math.floor(boss.y), boss.width, boss.height);
  }

  ctx.restore();

  // Spinning stun stars above crown when Boss is STUNNED (visual cue to STOMP/SLAM!)
  if (boss.aiState === 'stunned') {
    for (let s = 0; s < 3; s++) {
      const a = now / 160 + (s * Math.PI * 2) / 3;
      const sx = Math.floor(boss.x + boss.width / 2 + Math.cos(a) * 11);
      const sy = Math.floor(boss.y - 6 + Math.sin(a) * 3);
      ctx.fillStyle = '#000000';
      ctx.fillRect(sx - 1, sy - 1, 4, 4);
      ctx.fillStyle = s % 2 === 0 ? '#FDE047' : '#FFFFFF';
      ctx.fillRect(sx, sy, 2, 2);
    }
  }
}

export function renderBossHUD(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  gameWidth: number,
  now: number
) {
  const boss = state.boss;
  if (!boss || boss.aiState === 'inactive' || boss.aiState === 'dead') return;

  // Boss Warning Flash Banner during Intro
  if (state.bossWarningTimer > 0) {
    const flash = Math.floor(now / 110) % 2 === 0;
    const cy = 52;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, cy - 8, gameWidth, 24);
    ctx.fillStyle = flash ? '#EF4444' : '#FACC15';
    ctx.fillRect(0, cy - 8, gameWidth, 1);
    ctx.fillRect(0, cy + 15, gameWidth, 1);
    drawPixelText(ctx, 'WARNING! BOSS!', gameWidth / 2, cy - 4, flash ? '#FDE047' : '#FFFFFF', 1, 'center');
    drawPixelText(ctx, boss.name, gameWidth / 2, cy + 5, '#EF4444', 1, 'center');
  }

  // Boss Health Bar docked cleanly at top-center (y = 22..33)
  const barW = Math.min(104, gameWidth - 44);
  const barX = Math.floor((gameWidth - barW) / 2);
  const barY = 23;

  drawPixelText(
    ctx,
    boss.phase === 2 ? `${boss.name} II` : boss.name,
    gameWidth / 2,
    barY - 7,
    boss.phase === 2 ? '#22D3EE' : '#FDE047',
    1,
    'center'
  );

  // Outer frame
  ctx.fillStyle = '#000000';
  ctx.fillRect(barX - 2, barY - 1, barW + 4, 7);
  ctx.fillStyle = '#FACC15';
  ctx.fillRect(barX - 1, barY, barW + 2, 5);
  ctx.fillStyle = '#1F2937';
  ctx.fillRect(barX, barY + 1, barW, 3);

  const ratio = Math.max(0, boss.hp / boss.maxHp);
  const fillW = Math.ceil(barW * ratio);
  if (fillW > 0) {
    ctx.fillStyle = boss.phase === 2 ? '#D946EF' : '#EF4444';
    ctx.fillRect(barX, barY + 1, fillW, 3);
    ctx.fillStyle = boss.phase === 2 ? '#22D3EE' : '#FCA5A5';
    ctx.fillRect(barX, barY + 1, fillW, 1);
  }
}
