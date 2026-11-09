import { renderBossHUD, renderBossWorld } from './bosses';
import { BIOMES, CHARACTERS, GAME_HEIGHT } from './constants';
import { drawPixelText, getTileAtlas, measurePixelText } from './tileAtlas';
import { BiomeId, CharacterId, GameState } from './types';

const skyGradientCache: Partial<Record<BiomeId, CanvasGradient>> = {};
let helmetScratchCanvas: HTMLCanvasElement | null = null;
let helmetScratchCtx: CanvasRenderingContext2D | null = null;
let lastPlayerScreenX: number | null = null;

export function getPlayerSpriteKey(selectedChar: CharacterId, frameName: string): string {
  const prefix = selectedChar === 'guy1' ? '' : `${selectedChar}_`;
  const isUpperPng = selectedChar === 'guy1';

  switch (frameName) {
    case 'idle':
      return `${prefix}standing.png`;
    case 'walk1':
      return `${prefix}step1.${isUpperPng ? 'PNG' : 'png'}`;
    case 'walk2':
      return `${prefix}step2.${isUpperPng ? 'PNG' : 'png'}`;
    case 'walk3':
      return `${prefix}step3.${isUpperPng ? 'PNG' : 'png'}`;
    case 'walk4':
      return `${prefix}step4.${isUpperPng ? 'PNG' : 'png'}`;
    case 'jump1':
      return `${prefix}jump1.${isUpperPng ? 'PNG' : 'png'}`;
    case 'crouch':
      return `${prefix}jumpfall.png`;
    default:
      return `${prefix}standing.png`;
  }
}

function drawSpriteFrame(
  ctx: CanvasRenderingContext2D,
  sprites: Record<string, HTMLImageElement>,
  selectedChar: CharacterId,
  frameName: string,
  x: number,
  y: number,
  facingLeft: boolean
) {
  const key = getPlayerSpriteKey(selectedChar, frameName);
  const img = sprites[key];

  // Player physics hitbox is 12x14; sprite PNGs are 16x16 (-2px X, -2px Y aligns feet cleanly)
  const ox = -2;
  const oy = -2;

  if (img && img.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (facingLeft) {
      ctx.translate(x + 14, y + oy);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, 16, 16);
    } else {
      ctx.drawImage(img, x + ox, y + oy, 16, 16);
    }
    ctx.restore();
  } else {
    ctx.fillStyle = CHARACTERS[selectedChar].color;
    ctx.fillRect(x, y, 12, 14);
  }
}

export function renderGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  gameWidth: number,
  selectedChar: CharacterId,
  lives: number,
  sprites: Record<string, HTMLImageElement>,
  scanlinesEnabled: boolean,
  now: number,
  alpha = 1
) {
  const atlas = getTileAtlas();
  const biome = BIOMES[state.biome];
  const bTiles = atlas.biomes[state.biome];
  const sTiles = atlas.shared;

  ctx.imageSmoothingEnabled = false;

  // Sub-tick interpolated camera & player coordinates for silky motion across 60Hz/90Hz/120Hz/144Hz displays
  const interpCamX = state.camera.prevX + (state.camera.x - state.camera.prevX) * alpha;
  const interpCamY = state.camera.prevY + (state.camera.y - state.camera.prevY) * alpha;
  const interpPlayerX = state.player.prevX + (state.player.x - state.player.prevX) * alpha;
  const interpPlayerY = state.player.prevY + (state.player.y - state.player.prevY) * alpha;

  // 1. Sky Gradient (Cached per Biome)
  let skyGrad = skyGradientCache[state.biome];
  if (!skyGrad) {
    skyGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    skyGrad.addColorStop(0, biome.skyStops[0]);
    skyGrad.addColorStop(0.4, biome.skyStops[1]);
    skyGrad.addColorStop(0.75, biome.skyStops[2]);
    skyGrad.addColorStop(1, biome.skyStops[3]);
    skyGradientCache[state.biome] = skyGrad;
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, gameWidth, GAME_HEIGHT);

  // 2. Celestial Body & Atmospheric Sky FX (Screen Space with subtle parallax)
  drawSkyAtmosphere(ctx, interpCamX, biome.id, gameWidth, now);

  // 3. Enter World Camera Space
  ctx.save();
  const shakeX =
    state.screenShake > 0 ? Math.round((Math.random() - 0.5) * state.screenShake * 8) : 0;
  const effectiveCamX = interpCamX - shakeX;
  const camX = Math.round(effectiveCamX);
  const camY = Math.round(interpCamY);

  // Lock player's integer world draw X/Y to their screen-relative camera offset with Schmitt-trigger
  // hysteresis so independent rounding of player.x vs camera.x NEVER causes ±1px beat jitter while running!
  const relPlayerX = interpPlayerX - effectiveCamX;
  let playerScreenX: number;
  if (lastPlayerScreenX === null || Math.abs(relPlayerX - lastPlayerScreenX) > 0.56) {
    playerScreenX = Math.round(relPlayerX);
    lastPlayerScreenX = playerScreenX;
  } else {
    playerScreenX = lastPlayerScreenX;
  }
  const playerDrawX = camX + playerScreenX;
  const playerDrawY = camY + Math.round(interpPlayerY - interpCamY);

  ctx.translate(-camX, -camY);

  // Parallax Clouds (O(viewport) infinite coverage across all stage lengths!)
  {
    const shift = Math.floor(camX * 0.14);
    const startI = Math.max(0, Math.floor((shift - 36) / 92));
    const endI = Math.ceil((shift + gameWidth + 36) / 92);
    for (let i = startI; i <= endI; i++) {
      const drawX = camX + (i * 92 + 16 - shift);
      const cy = 10 + (i % 4) * 9;
      ctx.drawImage(bTiles.cloud, drawX, cy);
    }
  }

  // Parallax Mountains
  {
    const shift = Math.floor(camX * 0.24);
    const startI = Math.max(0, Math.floor((shift - 40) / 106));
    const endI = Math.ceil((shift + gameWidth + 40) / 106);
    for (let i = startI; i <= endI; i++) {
      const mx = camX + (i * 106 + 42 - shift);
      ctx.fillStyle = '#000000';
      ctx.fillRect(mx - 17, 90, 34, 60);
      ctx.fillRect(mx - 13, 82, 26, 8);
      ctx.fillRect(mx - 9, 74, 18, 8);

      ctx.fillStyle = biome.mountainMain;
      ctx.fillRect(mx - 16, 90, 32, 60);
      ctx.fillRect(mx - 12, 82, 24, 8);
      ctx.fillRect(mx - 8, 74, 16, 8);

      ctx.fillStyle = biome.mountainCap;
      ctx.fillRect(mx - 6, 74, 12, 4);
      ctx.fillRect(mx - 8, 78, 4, 2);
      ctx.fillRect(mx + 4, 78, 4, 2);
    }
  }

  // Parallax Hills
  {
    const shift = Math.floor(camX * 0.42);
    const startI = Math.max(0, Math.floor((shift - 40) / 68));
    const endI = Math.ceil((shift + gameWidth + 40) / 68);
    for (let i = startI; i <= endI; i++) {
      const hx = camX + (i * 68 + 28 - shift);
      ctx.fillStyle = '#000000';
      ctx.fillRect(hx - 17, 110, 34, 42);
      ctx.fillRect(hx - 13, 106, 26, 4);

      ctx.fillStyle = biome.hillMain;
      ctx.fillRect(hx - 16, 110, 32, 42);
      ctx.fillRect(hx - 12, 106, 24, 4);
    }
  }

  // Foreground Bushes (Blitted from Atlas)
  {
    const shift = Math.floor(camX * 0.72);
    const startI = Math.max(0, Math.floor((shift - 30) / 54));
    const endI = Math.ceil((shift + gameWidth + 30) / 54);
    for (let i = startI; i <= endI; i++) {
      const bx = camX + (i * 54 + 10 - shift);
      ctx.drawImage(bTiles.bush[i % 3], bx, 114);
    }
  }

  // Boss Arena Torches / Pillars (Visual Landmark for Stage 5 & Stage 10 Arenas!)
  if (state.boss) {
    const b = state.boss;
    const flameColor = b.phase === 2 ? '#22D3EE' : '#F97316';
    const coreColor = b.phase === 2 ? '#E879F9' : '#FDE047';
    for (const tx of [b.arenaLeft + 6, b.arenaRight - 12]) {
      if (tx + 12 < camX || tx > camX + gameWidth) continue;
      // Stone brazier pillar
      ctx.fillStyle = '#000000';
      ctx.fillRect(tx - 1, 106, 8, 22);
      ctx.fillStyle = '#334155';
      ctx.fillRect(tx, 107, 6, 21);
      ctx.fillStyle = '#64748B';
      ctx.fillRect(tx + 1, 107, 2, 21);
      // Animated pixel flame
      const flick = Math.floor(now / 90 + tx) % 3;
      ctx.fillStyle = flameColor;
      ctx.fillRect(tx, 100 + (flick === 0 ? 0 : 1), 6, 6);
      ctx.fillRect(tx + 1, 98 + flick, 4, 3);
      ctx.fillStyle = coreColor;
      ctx.fillRect(tx + 2, 102, 2, 3);
    }
  }

  // 4. Platforms (Viewport-Culled Single-Blit Tiles!)
  const cullLeft = camX - 24;
  const cullRight = camX + gameWidth + 24;
  const qShimmer = Math.floor(now / 150) % 3;

  for (let i = 0; i < state.platforms.length; i++) {
    const p = state.platforms[i];
    if (p.broken) continue;
    if (p.x + p.width < cullLeft || p.x > cullRight) continue;

    const px = Math.floor(p.x);
    const py = Math.floor(p.y - (p.bounceOffset || 0));

    switch (p.type) {
      case 'ground': {
        for (let tx = 0; tx < p.width; tx += 16) {
          for (let ty = 0; ty < p.height; ty += 16) {
            ctx.drawImage(bTiles.ground, px + tx, py + ty);
          }
        }
        break;
      }
      case 'brick':
        ctx.drawImage(bTiles.brick, px, py);
        break;
      case 'question':
        ctx.drawImage(p.used ? sTiles.used : sTiles.question[qShimmer], px, py);
        break;
      case 'pipe_top_l':
        ctx.drawImage(bTiles.pipe_top_l, px, py);
        break;
      case 'pipe_top_r':
        ctx.drawImage(bTiles.pipe_top_r, px, py);
        break;
      case 'pipe_body_l':
        ctx.drawImage(bTiles.pipe_body_l, px, py);
        break;
      case 'pipe_body_r':
        ctx.drawImage(bTiles.pipe_body_r, px, py);
        break;
      case 'moving': {
        for (let tx = 0; tx < p.width; tx += 16) {
          ctx.drawImage(sTiles.moving, px + tx, py);
          // Hover thruster pulse underneath
          if (Math.floor(now / 80) % 2 === 0) {
            ctx.fillStyle = '#38BDF8';
            ctx.fillRect(px + tx + 3, py + 8, 3, 2);
            ctx.fillRect(px + tx + 10, py + 8, 3, 2);
          }
        }
        break;
      }
      case 'crumble': {
        const shake = p.crumbling ? ((Math.floor(now / 35) % 2) * 2 - 1) : 0;
        ctx.drawImage(p.crumbling ? sTiles.crumble_cracked : sTiles.crumble, px + shake, py);
        break;
      }
      case 'bounce':
        ctx.drawImage(
          p.springTimer && p.springTimer > 0 ? sTiles.bounce_active : sTiles.bounce_idle,
          px,
          py
        );
        break;
      case 'spike': {
        for (let tx = 0; tx < p.width; tx += 16) {
          ctx.drawImage(sTiles.spike, px + tx, py);
        }
        break;
      }
      case 'gate':
        ctx.drawImage(sTiles.gate, px, py);
        break;
    }
  }

  // 5. Mid-Stage Checkpoint Flags
  for (let c = 0; c < state.checkpoints.length; c++) {
    const cp = state.checkpoints[c];
    if (cp.x + 16 >= cullLeft && cp.x - 8 <= cullRight) {
      const cpx = Math.floor(cp.x);
      const cpy = Math.floor(cp.y - 24);
      // Pole
      ctx.fillStyle = '#000000';
      ctx.fillRect(cpx - 1, cpy, 4, 24);
      ctx.fillStyle = cp.activated ? '#FACC15' : '#94A3B8';
      ctx.fillRect(cpx, cpy + 1, 2, 23);
      // Finial orb
      ctx.fillStyle = cp.activated ? '#4ADE80' : '#EF4444';
      ctx.fillRect(cpx - 1, cpy - 2, 4, 3);
      // Pennant flag
      const wave = cp.activated ? Math.round(Math.sin(now / 160 + c)) : 0;
      ctx.fillStyle = '#000000';
      ctx.fillRect(cpx + 2, cpy + 1 + wave, 11, 8);
      ctx.fillStyle = cp.activated ? '#22C55E' : '#475569';
      ctx.fillRect(cpx + 3, cpy + 2 + wave, 9, 6);
      ctx.fillStyle = cp.activated ? '#FEF08A' : '#CBD5E1';
      ctx.fillRect(cpx + 4, cpy + 4 + wave, 5, 2);
    }
  }

  // 6. Grand 80px Goal Flagpole & Rising FLIPPRX Victory Banner!
  const flagX = Math.floor(state.goalX);
  if (flagX + 26 >= cullLeft && flagX - 14 <= cullRight) {
    const poleTopY = 48;
    const pedestalY = 120;
    const bossLocked = !!(state.boss && state.boss.aiState !== 'dead');
    const flagWave = Math.sin(now / 150) * 1.8;

    // Gleaming Tall Flagpole Shaft (y = 48..120)
    ctx.fillStyle = '#000000';
    ctx.fillRect(flagX - 1, poleTopY - 1, 4, pedestalY - poleTopY + 2);
    ctx.fillStyle = bossLocked ? '#475569' : '#CBD5E1';
    ctx.fillRect(flagX, poleTopY, 2, pedestalY - poleTopY);
    if (!bossLocked) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(flagX, poleTopY, 1, pedestalY - poleTopY);
    }

    // Carved Pedestal Base Block (y = 120..128)
    ctx.fillStyle = '#000000';
    ctx.fillRect(flagX - 5, pedestalY, 12, 8);
    ctx.fillStyle = bossLocked ? '#334155' : '#B45309';
    ctx.fillRect(flagX - 4, pedestalY + 1, 10, 6);
    ctx.fillStyle = bossLocked ? '#64748B' : '#FACC15';
    ctx.fillRect(flagX - 3, pedestalY + 1, 8, 2);

    // Crown Finial Orb at Top (y = 43..48)
    ctx.fillStyle = '#000000';
    ctx.fillRect(flagX - 2, poleTopY - 5, 6, 5);
    ctx.fillStyle = bossLocked
      ? '#EF4444'
      : state.celebrating && Math.floor(now / 90) % 2 === 0
        ? '#FEF08A'
        : '#FACC15';
    ctx.fillRect(flagX - 1, poleTopY - 4, 4, 3);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(flagX - 1, poleTopY - 4, 1, 1);

    if (!state.celebrating) {
      // Pre-clear Checkered / Boss-Sealed Rival Flag at Top (invites high pole-grab!)
      const fy = poleTopY + 2;
      for (let row = 0; row < 3; row++) {
        const waveOff = Math.round(flagWave * (row / 3));
        ctx.fillStyle = '#000000';
        ctx.fillRect(flagX + 2 + waveOff, fy - 1 + row * 3, 13, 5);
        for (let col = 0; col < 4; col++) {
          const dark = (row + col) % 2 === 0;
          ctx.fillStyle = bossLocked
            ? dark
              ? '#450A0A'
              : '#EF4444'
            : dark
              ? '#0F172A'
              : '#FFFFFF';
          ctx.fillRect(flagX + 2 + col * 3 + waveOff, fy + row * 3, 3, 3);
        }
      }
    } else {
      // Celebration: Hoist the Grand Emerald & Gold FLIPPRX Victory Banner up to the crown!
      const bannerY = Math.floor(104 - state.flagRaiseProgress * 54);
      for (let col = 0; col < 5; col++) {
        const segWave = Math.round(Math.sin(now / 120 + col * 0.7) * (col > 0 ? 1.4 : 0.4));
        const sx = flagX + 2 + col * 3;
        const sy = bannerY + segWave;
        ctx.fillStyle = '#000000';
        ctx.fillRect(sx, sy - 1, 4, 13);
        // Gold top & bottom royal trim + emerald core
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(sx, sy, 3, 2);
        ctx.fillRect(sx, sy + 9, 3, 2);
        ctx.fillStyle = col % 2 === 0 ? '#22C55E' : '#16A34A';
        ctx.fillRect(sx, sy + 2, 3, 7);
      }
      // Golden 'F' / Star Crest in center of raised banner
      const crestWave = Math.round(Math.sin(now / 120 + 1.4));
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(flagX + 6, bannerY + 3 + crestWave, 5, 1);
      ctx.fillRect(flagX + 6, bannerY + 3 + crestWave, 2, 5);
      ctx.fillRect(flagX + 6, bannerY + 5 + crestWave, 4, 1);
    }
  }

  // 7. Swirling Market Portal
  if (state.portal && state.portal.active) {
    const px = Math.floor(state.portal.x);
    const py = Math.floor(state.portal.y);
    if (px + 20 >= cullLeft && px - 10 <= cullRight) {
      const t = state.portal.animationFrame;
      const ringColors = ['#1E1B4B', '#4C1D95', '#7E22CE', '#A855F7'];
      for (let r = 3; r >= 0; r--) {
        const sz = 20 - r * 3;
        ctx.fillStyle = ringColors[r];
        ctx.fillRect(px + 8 - sz / 2, py + 8 - sz / 2, sz, sz);
      }
      ctx.fillStyle = '#000000';
      ctx.fillRect(px + 4, py + 4, 8, 8);
      for (let i = 0; i < 6; i++) {
        const ang = ((t * 4 + i * 60) * Math.PI) / 180;
        const rx = Math.floor(px + 8 + Math.cos(ang) * 7);
        const ry = Math.floor(py + 8 + Math.sin(ang) * 7);
        ctx.fillStyle = i % 2 === 0 ? '#22D3EE' : '#F0ABFC';
        ctx.fillRect(rx, ry, 2, 2);
      }
      ctx.fillStyle = Math.floor(t * 2) % 2 === 0 ? '#FFFFFF' : '#FDE047';
      ctx.fillRect(px + 7, py + 7, 2, 2);
    }
  }

  // 8. Coins (Single `drawImage` blit per coin!)
  if (!state.inBlackhole) {
    const spinFrame = Math.floor(now / 95) % 8;
    const coinImg = sTiles.coins[spinFrame];
    for (let i = 0; i < state.coins.length; i++) {
      const coin = state.coins[i];
      if (coin.collected) continue;
      if (coin.x + 8 < cullLeft || coin.x > cullRight) continue;
      const cx = Math.floor(coin.x);
      const cy = Math.floor(coin.y + Math.sin(coin.floatOffset) * 3.5);
      ctx.drawImage(coinImg, cx, cy);
    }
  }

  // 9. Water Blaster Pickups & Projectiles
  for (let w = 0; w < state.waterGuns.length; w++) {
    const wg = state.waterGuns[w];
    if (wg.collected) continue;
    const wgx = Math.floor(wg.x);
    const wgy = Math.floor(wg.y + Math.sin(now / 180 + w) * 2);
    if (wgx + 14 >= cullLeft && wgx - 4 <= cullRight) {
      // Subtle cyan pickup aura
      if (Math.floor(now / 140 + w) % 2 === 0) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
        ctx.fillRect(wgx - 2, wgy - 1, 13, 11);
      }
      ctx.fillStyle = '#000000';
      ctx.fillRect(wgx - 1, wgy, 11, 9);
      ctx.fillStyle = '#0284C7';
      ctx.fillRect(wgx, wgy + 1, 9, 4);
      ctx.fillRect(wgx + 1, wgy + 5, 3, 3);
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(wgx + 1, wgy + 1, 6, 2);
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(wgx + 8, wgy + 2, 2, 2);
    }
  }

  for (let i = 0; i < state.waterProjectiles.length; i++) {
    const proj = state.waterProjectiles[i];
    const wx = Math.floor(proj.x);
    const wy = Math.floor(proj.y);
    ctx.fillStyle = '#000000';
    ctx.fillRect(wx - 2, wy - 1, 6, 4);
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(wx - 1, wy, 4, 2);
    ctx.fillStyle = '#E0F2FE';
    ctx.fillRect(wx, wy, 2, 1);
  }

  // 10. Regular Enemies (Goomba, Directional Segmented Snake, Animated Ghost)
  for (let i = 0; i < state.enemies.length; i++) {
    const enemy = state.enemies[i];
    if (!enemy.alive) continue;
    if (enemy.x + 16 < cullLeft || enemy.x - 12 > cullRight) continue;

    const ex = Math.floor(enemy.x);
    const ey = Math.floor(enemy.y);

    if (enemy.type === 'goomba') {
      const walkCycle = Math.floor(now / 140) % 2;
      const eyOff = Math.floor(ey - Math.abs(Math.sin(now / 150)) * 0.6);

      ctx.fillStyle = '#000000';
      ctx.fillRect(ex + 1, eyOff - 1, 10, 1);
      ctx.fillRect(ex - 1, eyOff, 14, 12);
      ctx.fillRect(ex, eyOff + 12, 12, 1);

      // Mushroom cap
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(ex, eyOff, 12, 6);
      ctx.fillStyle = '#B45309';
      ctx.fillRect(ex + 1, eyOff, 10, 2);
      ctx.fillStyle = '#5C2D0C';
      ctx.fillRect(ex + 1, eyOff + 4, 10, 2);

      // Stem & angry face
      ctx.fillStyle = '#FDE68A';
      ctx.fillRect(ex + 2, eyOff + 6, 8, 5);
      ctx.fillStyle = '#000000';
      ctx.fillRect(ex + 2, eyOff + 6, 3, 1);
      ctx.fillRect(ex + 7, eyOff + 6, 3, 1);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(ex + 2, eyOff + 7, 3, 2);
      ctx.fillRect(ex + 7, eyOff + 7, 3, 2);

      ctx.fillStyle = '#000000';
      const px = enemy.direction > 0 ? 1 : 0;
      ctx.fillRect(ex + 3 + px, eyOff + 8, 1, 1);
      ctx.fillRect(ex + 8 + px, eyOff + 8, 1, 1);
      ctx.fillRect(ex + 4, eyOff + 10, 4, 1);

      // Walking feet
      ctx.fillStyle = '#451A03';
      if (walkCycle === 0) {
        ctx.fillRect(ex + 1, eyOff + 11, 3, 1);
        ctx.fillRect(ex + 8, eyOff + 11, 3, 1);
      } else {
        ctx.fillRect(ex + 2, eyOff + 11, 3, 1);
        ctx.fillRect(ex + 7, eyOff + 11, 3, 1);
      }
    } else if (enemy.type === 'snake') {
      const wavePhase = enemy.waveOffset || 0;
      const dir = enemy.direction >= 0 ? 1 : -1;
      const headBaseX = dir > 0 ? ex + 7 : ex + 1;

      // Segments trail BEHIND movement direction!
      for (let seg = 4; seg >= 0; seg--) {
        const sx = Math.floor(headBaseX - dir * seg * 2.4);
        const sy = Math.floor(ey + 5 + Math.sin(wavePhase + seg * 0.6) * 1.8);
        const sw = seg === 0 ? 4 : 3;
        const sh = seg === 0 ? 5 : 4;

        ctx.fillStyle = '#000000';
        ctx.fillRect(sx - 1, sy - 1, sw + 2, sh + 2);
        ctx.fillStyle = seg === 0 ? '#22C55E' : seg < 2 ? '#16A34A' : '#15803D';
        ctx.fillRect(sx, sy, sw, sh);
        ctx.fillStyle = '#86EFAC';
        ctx.fillRect(sx + 1, sy, Math.max(1, sw - 2), 1);
      }

      const hy = Math.floor(ey + 5 + Math.sin(wavePhase) * 1.8);
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(headBaseX + (dir > 0 ? 2 : 1), hy + 1, 1, 1);

      // Flicking forked tongue
      if (Math.sin(wavePhase * 3) > 0.35) {
        ctx.fillStyle = '#F43F5E';
        const tx = dir > 0 ? headBaseX + 4 : headBaseX - 2;
        ctx.fillRect(tx, hy + 3, 2, 1);
      }
    } else {
      // Haunted Ghost ('badguy' -> 1.png..8.png)
      const animSpd = enemy.frozen ? 1.5 : 5;
      const frameIdx = Math.floor((now / 1000) * animSpd) % 8;
      const ghostImg = sprites[`${frameIdx + 1}.png`];
      const gy = Math.floor(ey + Math.sin(now / 200 + enemy.x / 40) * 2);

      ctx.save();
      ctx.globalAlpha = enemy.opacity !== undefined ? enemy.opacity : 0.85;
      if (ghostImg && ghostImg.complete && ghostImg.naturalWidth > 0) {
        if (enemy.direction < 0) {
          ctx.translate(ex + 16, gy);
          ctx.scale(-1, 1);
          ctx.drawImage(ghostImg, 0, 0, 16, 16);
        } else {
          ctx.drawImage(ghostImg, ex, gy, 16, 16);
        }
      } else {
        ctx.fillStyle = '#A855F7';
        ctx.fillRect(ex + 2, gy + 2, 12, 12);
      }
      ctx.restore();
    }
  }

  // 11. Boss & Boss Projectiles
  renderBossWorld(ctx, state, sprites, now);

  // 12. Player Character (With Squash/Stretch, Afterimages, Bull Run Aura & Rainbow Star Helmet!)
  if (!state.inBlackhole) {
    drawPlayerInWorld(ctx, state, selectedChar, sprites, now, playerDrawX, playerDrawY);
  }

  // 13. World Particles & Floating Score Popups
  for (let i = 0; i < state.particles.length; i++) {
    const p = state.particles[i];
    if (p.x < cullLeft || p.x > cullRight) continue;
    const ratio = p.life / p.maxLife;
    const px = Math.floor(p.x);
    const py = Math.floor(p.y);
    const sz = p.size || (ratio > 0.5 ? 2 : 1);
    ctx.fillStyle = p.color;
    ctx.fillRect(px, py, sz, sz);
  }

  for (let i = 0; i < state.floatingTexts.length; i++) {
    const ft = state.floatingTexts[i];
    if (ft.x < cullLeft - 20 || ft.x > cullRight + 20) continue;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (ft.life / ft.maxLife) * 1.6);
    drawPixelText(ctx, ft.text, ft.x, ft.y, ft.color, 1, 'center', true);
    ctx.restore();
  }

  // 14. Signature FLIPPRX Speech Bubble ("WE FLIP" -> "WE FLIPPING!")
  if (state.speechBubble && !state.inBlackhole) {
    const raw = state.speechBubble.text;
    const label = raw === 'we Flipping' ? 'WE FLIPPING!' : raw.toUpperCase();
    const tw = measurePixelText(label, 1);
    const bw = tw + 6;
    const bh = 9;
    const centerBx = playerDrawX + 6;
    const bx = Math.max(camX + 2, Math.min(camX + gameWidth - bw - 2, Math.floor(centerBx - bw / 2)));
    const by = Math.max(camY + 18, playerDrawY - bh - 7);

    ctx.fillStyle = '#000000';
    ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    ctx.fillRect(centerBx - 1, by + bh, 3, 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillRect(centerBx, by + bh, 1, 2);
    drawPixelText(ctx, label, bx + 3, by + 2, '#0F172A', 1, 'left', false);
  }

  // === EXIT WORLD CAMERA SPACE -> ENTER SCREEN SPACE! ===
  ctx.restore();

  // 15. Screen-Space Canvas HUD (Hearts, Coins, Stage Progress, Power-Up Timers, Combo, Boss Bar)
  drawScreenHUD(ctx, state, gameWidth, lives, now);
  renderBossHUD(ctx, state, gameWidth, now);

  // 16. Stage Intro Countdown Banner
  if (!state.gameStarted && !state.inBlackhole) {
    drawStageIntroOverlay(ctx, state, gameWidth, selectedChar);
  }

  // 17. Stage Clear Celebration Plaque (FIXED: Now drawn in Screen Space after ctx.restore()!)
  if (state.celebrating) {
    drawStageClearOverlay(ctx, state, gameWidth, now);
  }

  // 18. Blackhole Market Chart Mini-Game Overlay (FIXED: Centered & Uses Real Character Sprite!)
  if (state.inBlackhole) {
    drawBlackholeOverlay(ctx, state, gameWidth, selectedChar, sprites);
  }

  // 19. Damage Red Screen Flash
  if (state.deathFlashTimer > 0) {
    const alpha = Math.min(0.45, state.deathFlashTimer * 1.6);
    ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
    ctx.fillRect(0, 0, gameWidth, GAME_HEIGHT);
  }

  // 20. Optional Crisp Retro Scanlines
  if (scanlinesEnabled) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.13)';
    for (let y = 0; y < GAME_HEIGHT; y += 2) {
      ctx.fillRect(0, y, gameWidth, 1);
    }
  }
}

function drawSkyAtmosphere(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  biomeId: BiomeId,
  gameWidth: number,
  now: number
) {
  const celestialX = Math.floor(gameWidth * 0.78 - (cameraX * 0.02) % 30);

  if (biomeId === 'day') {
    // Crisp Pixel Sun
    ctx.fillStyle = '#FEF08A';
    ctx.fillRect(celestialX - 1, 14, 14, 12);
    ctx.fillRect(celestialX, 13, 12, 14);
    ctx.fillStyle = '#FDE047';
    ctx.fillRect(celestialX + 1, 15, 10, 10);
  } else if (biomeId === 'sunset') {
    // Giant Low Sunset Sun
    ctx.fillStyle = '#FB923C';
    ctx.fillRect(celestialX - 4, 48, 22, 16);
    ctx.fillRect(celestialX - 2, 46, 18, 20);
    ctx.fillStyle = '#FDE047';
    ctx.fillRect(celestialX, 49, 14, 14);
  } else if (biomeId === 'night') {
    // Twinkling Neon Stars
    for (let s = 0; s < 22; s++) {
      const sx = ((s * 37 + 13) % Math.max(160, gameWidth));
      const sy = 6 + ((s * 19 + 7) % 58);
      const twinkle = Math.floor(now / 260 + s) % 4 === 0;
      ctx.fillStyle = twinkle ? '#22D3EE' : '#E0E7FF';
      ctx.fillRect(sx, sy, twinkle ? 2 : 1, 1);
    }
    // Crescent Moon
    ctx.fillStyle = '#E0E7FF';
    ctx.fillRect(celestialX, 14, 12, 12);
    ctx.fillStyle = BIOMES.night.skyStops[0];
    ctx.fillRect(celestialX + 4, 13, 10, 10);
  } else if (biomeId === 'volcano') {
    // Eclipsed Crimson Blood-Moon
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(celestialX - 2, 13, 16, 16);
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(celestialX - 1, 14, 14, 14);
    ctx.fillStyle = '#18181B';
    ctx.fillRect(celestialX + 1, 15, 11, 12);

    // Rising Volcanic Embers
    for (let e = 0; e < 16; e++) {
      const ex = ((e * 29 + Math.floor(now / 55)) % Math.max(160, gameWidth));
      const ey = 120 - ((Math.floor(now / 38) + e * 17) % 112);
      ctx.fillStyle = e % 2 === 0 ? '#F97316' : '#FACC15';
      ctx.fillRect(ex, ey, 1, 1);
    }
  }
}

function drawPlayerInWorld(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  selectedChar: CharacterId,
  sprites: Record<string, HTMLImageElement>,
  now: number,
  px: number,
  py: number
) {
  const player = state.player;

  let frameName = 'idle';
  if (player.currentAnimation === 'walk') {
    // 4-beat pendulum stride cycle (mid-stride -> full-stride -> mid-stride -> center-pass):
    // excludes step1 ('walk1'), which has a 94% identical upright two-leg standing pose to standing.png,
    // and smoothly bridges step3's 13px split back through step2 before step4's center leg cross!
    const runCycle = ['walk2', 'walk3', 'walk2', 'walk4'] as const;
    const idx = Math.floor(player.animationFrame) % 4;
    frameName = runCycle[idx];
  } else if (player.currentAnimation === 'jump') {
    frameName = 'jump1';
  } else if (player.currentAnimation === 'crouch') {
    frameName = 'crouch';
  }

  // Motion Afterimage Trail for Dash / Air-Slide / Meteor Slam!
  if (player.isDashing || player.isAirSliding || player.isSlamming) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    const trailX = player.isSlamming ? px : px + (player.facingLeft ? 7 : -7);
    const trailY = player.isSlamming ? py - 8 : py;
    drawSpriteFrame(ctx, sprites, selectedChar, frameName, trailX, trailY, player.facingLeft);
    ctx.restore();
  }

  // Bull Run Golden Frenzy Ring
  if (player.bullRunTimer > 0) {
    ctx.fillStyle = Math.floor(now / 80) % 2 === 0 ? '#4ADE80' : '#FFD700';
    ctx.fillRect(px - 2, py + 13, 16, 2);
  }

  ctx.save();
  // Blink cleanly during post-damage respawn invulnerability
  if (
    player.invincibilityTimer > 0 &&
    !player.isDashing &&
    !player.hasHelmet &&
    Math.floor(now / 65) % 2 === 0
  ) {
    ctx.globalAlpha = 0.42;
  }

  // Apply Squash & Stretch + Flip Rotation ONLY when actively deformed/rotating
  // so running on flat ground blits sprites at pure 1:1 integer pixel coordinates!
  const cx = px + 6;
  const cy = py + 7;
  if (player.squashX !== 1 || player.squashY !== 1) {
    ctx.translate(cx, py + 14);
    ctx.scale(player.squashX, player.squashY);
    ctx.translate(-cx, -(py + 14));
  }

  if (player.rotation !== 0) {
    ctx.translate(cx, cy);
    ctx.rotate((player.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  if (player.hasHelmet) {
    if (!helmetScratchCanvas) {
      helmetScratchCanvas = document.createElement('canvas');
      helmetScratchCanvas.width = 16;
      helmetScratchCanvas.height = 16;
      helmetScratchCtx = helmetScratchCanvas.getContext('2d');
    }
    if (helmetScratchCtx && helmetScratchCanvas) {
      helmetScratchCtx.clearRect(0, 0, 16, 16);
      helmetScratchCtx.globalCompositeOperation = 'source-over';
      drawSpriteFrame(helmetScratchCtx, sprites, selectedChar, frameName, 2, 2, player.facingLeft);
      helmetScratchCtx.globalCompositeOperation = 'source-atop';
      const hue = Math.floor((now / 8) % 360);
      helmetScratchCtx.fillStyle = `hsla(${hue}, 90%, 60%, 0.55)`;
      helmetScratchCtx.fillRect(0, 0, 16, 16);
      ctx.drawImage(helmetScratchCanvas, px - 2, py - 2);
    }

    const helmetImg = sprites['helmet.png'];
    if (helmetImg && helmetImg.complete && helmetImg.naturalWidth > 0) {
      if (player.facingLeft) {
        ctx.save();
        ctx.translate(px + 14, py - 2);
        ctx.scale(-1, 1);
        ctx.drawImage(helmetImg, 0, 0, 16, 16);
        ctx.restore();
      } else {
        ctx.drawImage(helmetImg, px - 2, py - 2, 16, 16);
      }
    }
  } else {
    drawSpriteFrame(ctx, sprites, selectedChar, frameName, px, py, player.facingLeft);
  }

  // Draw miniature equipped Water Blaster symmetrically in hero's hand (Left & Right!)
  if (player.hasWaterGun && !state.celebrating) {
    const recoil = player.shootCooldown > 0.14 ? 1 : 0;
    ctx.save();
    if (player.facingLeft) {
      ctx.translate(px + 12, py);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(px, py);
    }
    const gx = 7 - recoil;
    const gy = 6;
    // Crisp black outline + hand grip
    ctx.fillStyle = '#000000';
    ctx.fillRect(gx - 1, gy - 1, 8, 5);
    ctx.fillRect(gx, gy + 3, 3, 2);
    // Blaster body & pressurized cyan water tank
    ctx.fillStyle = '#0284C7';
    ctx.fillRect(gx, gy, 6, 3);
    ctx.fillRect(gx + 1, gy + 3, 1, 1);
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(gx + 1, gy, 4, 2);
    ctx.fillStyle = '#E0F2FE';
    ctx.fillRect(gx + 1, gy, 2, 1);
    // Golden nozzle tip
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(gx + 5, gy, 2, 2);
    ctx.restore();
  }

  ctx.restore();
}

function drawScreenHUD(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  gameWidth: number,
  lives: number,
  now: number
) {
  const sTiles = getTileAtlas().shared;
  const player = state.player;

  // 1. Hearts (Top-Left inside safe canvas margin y = 17 so HTML header never overlaps!)
  // Wait: HTML header bar sits at very top on mobile or outside on desktop; let's place canvas HUD cleanly at y = 16!
  const hudY = 15;
  for (let h = 0; h < 3; h++) {
    ctx.drawImage(h < lives ? sTiles.heartFull : sTiles.heartEmpty, 4 + h * 9, hudY);
  }

  // Coin counter beside hearts
  ctx.drawImage(sTiles.coins[0], 34, hudY);
  drawPixelText(
    ctx,
    `${state.coinsCollectedThisStage}/${state.totalCoinsThisStage}`,
    44,
    hudY + 2,
    '#FDE047',
    1,
    'left'
  );

  // 2. Stage Progress Mini-Bar (Top-Center when Boss HUD isn't occupying it)
  const bossActive = state.boss && state.boss.aiState !== 'inactive' && state.boss.aiState !== 'dead';
  if (!bossActive && gameWidth >= 180) {
    const barW = 46;
    const barX = Math.floor(gameWidth / 2 - barW / 2);
    const barY = hudY + 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, 5);
    ctx.fillStyle = '#334155';
    ctx.fillRect(barX, barY, barW, 3);

    const progress = Math.max(0, Math.min(1, player.x / Math.max(1, state.goalX)));
    ctx.fillStyle = '#4ADE80';
    ctx.fillRect(barX, barY, Math.max(2, Math.floor(barW * progress)), 3);

    for (let c = 0; c < state.checkpoints.length; c++) {
      const cp = state.checkpoints[c];
      const cpRatio = Math.min(1, cp.x / Math.max(1, state.goalX));
      ctx.fillStyle = cp.activated ? '#FDE047' : '#94A3B8';
      ctx.fillRect(barX + Math.floor(barW * cpRatio), barY - 1, 1, 5);
    }
  }

  // 3. Active Power-Up Timers & Combo Badge (Top-Right)
  let rightY = hudY + 1;
  if (state.combo >= 2) {
    const pulse = Math.floor(now / 120) % 2 === 0 ? '#FDE047' : '#FB923C';
    drawPixelText(ctx, `X${state.combo} COMBO`, gameWidth - 5, rightY, pulse, 1, 'right');
    rightY += 7;
  }
  if (player.bullRunTimer > 0) {
    drawPixelText(
      ctx,
      `2X BULL ${Math.ceil(player.bullRunTimer)}S`,
      gameWidth - 5,
      rightY,
      '#4ADE80',
      1,
      'right'
    );
    rightY += 7;
  }
  if (player.hasHelmet) {
    drawPixelText(
      ctx,
      `STAR ${Math.ceil(player.helmetTimer)}S`,
      gameWidth - 5,
      rightY,
      '#FDE047',
      1,
      'right'
    );
    rightY += 7;
  }
  if (player.hasWaterGun) {
    drawPixelText(
      ctx,
      `GUN ${Math.ceil(player.waterGunTimer)}S`,
      gameWidth - 5,
      rightY,
      '#38BDF8',
      1,
      'right'
    );
  }
}

function drawStageIntroOverlay(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  gameWidth: number,
  selectedChar: CharacterId
) {
  const cx = Math.floor(gameWidth / 2);
  const cy = Math.floor(GAME_HEIGHT / 2);
  const biome = BIOMES[state.biome];

  ctx.fillStyle = 'rgba(8, 12, 24, 0.72)';
  ctx.fillRect(0, 0, gameWidth, GAME_HEIGHT);

  // Top Stage Plaque
  drawPixelText(ctx, `STAGE ${state.currentStage}`, cx, 26, '#FFFFFF', 2, 'center');
  drawPixelText(ctx, biome.label, cx, 40, '#FDE047', 1, 'center');

  if (state.boss) {
    drawPixelText(ctx, `BOSS: ${state.boss.name}`, cx, 48, '#EF4444', 1, 'center');
  } else {
    drawPixelText(ctx, CHARACTERS[selectedChar].name, cx, 48, CHARACTERS[selectedChar].color, 1, 'center');
  }

  // Snappy 3 -> 2 -> 1 -> FLIP! Countdown
  const timeLeft = 3.0 - state.gameStartTimer;
  let countStr = 'FLIP!';
  let countColor = '#4ADE80';
  if (timeLeft > 1.2) {
    countStr = '3';
    countColor = '#EF4444';
  } else if (timeLeft > 0.6) {
    countStr = '2';
    countColor = '#FACC15';
  } else if (timeLeft > 0.15) {
    countStr = '1';
    countColor = '#38BDF8';
  }

  const boxW = countStr.length > 1 ? 56 : 24;
  ctx.fillStyle = '#000000';
  ctx.fillRect(cx - boxW / 2 - 2, cy - 2, boxW + 4, 24);
  ctx.fillStyle = countColor;
  ctx.fillRect(cx - boxW / 2 - 1, cy - 1, boxW + 2, 22);
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(cx - boxW / 2 + 1, cy + 1, boxW - 2, 18);

  drawPixelText(ctx, countStr, cx, cy + 5, '#FFFFFF', 2, 'center');
}

const PIXEL_STAR_ROWS = [
  '....X....',
  '...XXX...',
  'XXXXXXXXX',
  '.XXXXXXX.',
  '..XXXXX..',
  '.XXX.XXX.',
  'XX.....XX',
];

function drawPixelStar(ctx: CanvasRenderingContext2D, x: number, y: number, earned: boolean) {
  // 1px black outline silhouette
  ctx.fillStyle = '#000000';
  for (let r = 0; r < PIXEL_STAR_ROWS.length; r++) {
    const row = PIXEL_STAR_ROWS[r];
    for (let c = 0; c < row.length; c++) {
      if (row[c] === 'X') {
        ctx.fillRect(x + c - 1, y + r, 3, 1);
        ctx.fillRect(x + c, y + r - 1, 1, 3);
      }
    }
  }
  // Fill star pixels
  for (let r = 0; r < PIXEL_STAR_ROWS.length; r++) {
    const row = PIXEL_STAR_ROWS[r];
    for (let c = 0; c < row.length; c++) {
      if (row[c] === 'X') {
        ctx.fillStyle = !earned ? '#334155' : r <= 2 ? '#FEF08A' : '#FACC15';
        ctx.fillRect(x + c, y + r, 1, 1);
      }
    }
  }
}

function drawStageClearOverlay(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  gameWidth: number,
  now: number
) {
  const rainbow = ['#FDE047', '#4ADE80', '#38BDF8', '#F472B6'][Math.floor(now / 120) % 4];
  const elapsed = state.celebrationElapsed;

  // Act 1 (< 1.35s): Unobstructed view of Flagpole Slide, Rising FLIPPRX Banner, Hero Backflips & Sky Fireworks!
  if (elapsed < 1.35) {
    const cx = Math.floor(gameWidth / 2);
    const slideIn = Math.min(1, elapsed / 0.25);
    const ry = Math.floor(-20 + slideIn * 30); // Rests cleanly at y = 10
    const title = state.currentStage === 10 ? 'FINAL VICTORY!' : `STAGE ${state.currentStage} CLEAR!`;
    const rw = Math.min(gameWidth - 16, measurePixelText(title, 1) + 22);
    const rx = cx - Math.floor(rw / 2);

    ctx.fillStyle = '#000000';
    ctx.fillRect(rx - 2, ry - 2, rw + 4, 17);
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(rx - 1, ry - 1, rw + 2, 15);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fillRect(rx + 1, ry + 1, rw - 2, 11);
    drawPixelText(ctx, title, cx, ry + 4, rainbow, 1, 'center');
    return;
  }

  // Act 2 (>= 1.35s): Stylish Arcade Scoreboard Plaque (leaves sky fireworks & right-side dancing hero visible!)
  const cardW = Math.min(134, gameWidth - 16);
  const cardH = 92;
  const popProgress = Math.min(1, (elapsed - 1.35) / 0.22);
  const targetCardX =
    gameWidth >= 236
      ? Math.max(12, Math.floor((gameWidth - 88) / 2 - cardW / 2))
      : Math.floor(gameWidth / 2 - cardW / 2);
  const cardX = targetCardX;
  const cardY = Math.floor(GAME_HEIGHT / 2 - cardH / 2 + (1 - popProgress) * 14);
  const cardCx = cardX + Math.floor(cardW / 2);

  ctx.fillStyle = '#000000';
  ctx.fillRect(cardX - 2, cardY - 2, cardW + 4, cardH + 4);
  ctx.fillStyle = '#FACC15';
  ctx.fillRect(cardX - 1, cardY - 1, cardW + 2, cardH + 2);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.93)';
  ctx.fillRect(cardX + 1, cardY + 1, cardW - 2, cardH - 2);

  drawPixelText(
    ctx,
    state.currentStage === 10 ? 'CHAMPION!' : `STAGE ${state.currentStage} CLEAR!`,
    cardCx,
    cardY + 7,
    rainbow,
    1,
    'center'
  );

  // 3-Star Rating Row (Sequential Pop-In!)
  for (let s = 0; s < 3; s++) {
    const revealAt = 1.48 + s * 0.2;
    const earned = s < state.stageStars && elapsed >= revealAt;
    const bounceY =
      earned && elapsed < revealAt + 0.14 ? -2 : 0;
    drawPixelStar(ctx, cardCx - 19 + s * 15, cardY + 18 + bounceY, earned);
  }

  // Coins Collected Row
  const sTiles = getTileAtlas().shared;
  const isPerfect =
    state.totalCoinsThisStage > 0 && state.coinsCollectedThisStage >= state.totalCoinsThisStage;
  ctx.drawImage(sTiles.coins[Math.floor(now / 100) % 8], cardCx - 36, cardY + 32);
  drawPixelText(
    ctx,
    `COINS ${state.coinsCollectedThisStage}/${state.totalCoinsThisStage}`,
    cardCx - 25,
    cardY + 34,
    isPerfect ? '#4ADE80' : '#FDE047',
    1,
    'left'
  );

  // Flagpole Grab Bonus Row
  drawPixelText(
    ctx,
    `POLE BONUS +${state.flagPoleBonus}`,
    cardCx,
    cardY + 46,
    '#4ADE80',
    1,
    'center'
  );

  // Animated Rolling Total Bonus Counter!
  const rollRatio = Math.max(0, Math.min(1, (elapsed - 1.5) / 0.85));
  const displayedBonus = Math.round(state.stageBonusAwarded * rollRatio);
  drawPixelText(
    ctx,
    `TOTAL +${displayedBonus}`,
    cardCx,
    cardY + 58,
    '#38BDF8',
    1,
    'center'
  );

  if (isPerfect) {
    drawPixelText(ctx, 'PERFECT COINS +1000!', cardCx, cardY + 69, '#FDE047', 1, 'center');
  }

  if (Math.floor(now / 260) % 2 === 0) {
    drawPixelText(
      ctx,
      state.currentStage < 10
        ? elapsed > 2.1
          ? `JUMP -> STAGE ${state.currentStage + 1}`
          : `NEXT: STAGE ${state.currentStage + 1}`
        : 'CHAMPION OF FLIPPRX!',
      cardCx,
      cardY + 80,
      '#FFFFFF',
      1,
      'center'
    );
  }
}

function drawBlackholeOverlay(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  gameWidth: number,
  selectedChar: CharacterId,
  sprites: Record<string, HTMLImageElement>
) {
  const cx = Math.floor(gameWidth / 2);

  // Deep Space Backdrop
  ctx.fillStyle = '#05020D';
  ctx.fillRect(0, 0, gameWidth, GAME_HEIGHT);

  for (let i = 0; i < 28; i++) {
    const sx = (i * 31 + Math.floor(state.blackholeTimer * 24)) % gameWidth;
    const sy = (i * 19) % GAME_HEIGHT;
    ctx.fillStyle = i % 3 === 0 ? '#A855F7' : '#E2E8F0';
    ctx.fillRect(sx, sy, 1, 1);
  }

  // Swirling Vortex at Bottom Center
  const vx = cx;
  const vy = 122;
  const colors = ['#1E1B4B', '#4C1D95', '#7E22CE', '#C084FC'];
  for (let r = 3; r >= 0; r--) {
    const rad = 10 + r * 6;
    ctx.fillStyle = colors[r];
    ctx.fillRect(vx - rad, vy - Math.floor(rad * 0.45), rad * 2, Math.floor(rad * 0.9));
  }
  ctx.fillStyle = '#000000';
  ctx.fillRect(vx - 7, vy - 3, 14, 6);

  // Tumbling Selected Character Sprite (Zero per-frame canvas allocations!)
  const fallY = Math.min(112, 16 + state.blackholeFallSpeed * 1.4);
  const scale = Math.max(0.45, 1 - Math.max(0, fallY - 64) / 95);
  ctx.save();
  ctx.translate(cx, fallY);
  ctx.rotate(state.blackholeTimer * 5.5);
  ctx.scale(scale, scale);
  drawSpriteFrame(ctx, sprites, selectedChar, 'jump1', -6, -7, false);
  ctx.restore();

  // Live Candlestick Market Chart Box
  const chartW = 112;
  const chartH = 74;
  const chartX = cx - chartW / 2;
  const chartY = 14;

  ctx.fillStyle = '#000000';
  ctx.fillRect(chartX - 2, chartY - 2, chartW + 4, chartH + 4);
  ctx.fillStyle = '#A855F7';
  ctx.fillRect(chartX - 1, chartY - 1, chartW + 2, chartH + 2);
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(chartX, chartY, chartW, chartH);

  drawPixelText(ctx, 'MARKET PORTAL', cx, chartY + 4, '#E879F9', 1, 'center');

  // Subtle grid lines
  ctx.fillStyle = '#1E293B';
  for (let gy = chartY + 18; gy < chartY + chartH - 8; gy += 12) {
    ctx.fillRect(chartX + 4, gy, chartW - 8, 1);
  }

  // Candlestick Bars + Wicks
  const barW = 13;
  const gap = 6;
  const startBarX = chartX + 10;
  const baseLineY = chartY + chartH - 8;

  for (let i = 0; i < state.chartBars.length; i++) {
    const bar = state.chartBars[i];
    const bx = startBarX + i * (barW + gap);
    const bh = Math.floor(Math.min(48, bar.height * 0.78));
    const by = baseLineY - bh;
    const isGreen = bar.color === 'green';

    // Candle Wick
    ctx.fillStyle = isGreen ? '#86EFAC' : '#FCA5A5';
    ctx.fillRect(bx + Math.floor(barW / 2), by - 4, 1, bh + 7);

    // Candle Body
    ctx.fillStyle = '#000000';
    ctx.fillRect(bx - 1, by - 1, barW + 2, bh + 2);
    ctx.fillStyle = isGreen ? '#22C55E' : '#EF4444';
    ctx.fillRect(bx, by, barW, bh);
    ctx.fillStyle = isGreen ? '#86EFAC' : '#FCA5A5';
    ctx.fillRect(bx + 1, by + 1, 2, Math.max(1, bh - 2));
  }

  // Outcome Banner
  if (state.chartComplete) {
    const isBull = state.chartResult === 'green';
    const bannerY = 96;
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx - 56, bannerY - 2, 112, 15);
    ctx.fillStyle = isBull ? '#22C55E' : '#EF4444';
    ctx.fillRect(cx - 55, bannerY - 1, 110, 13);
    drawPixelText(
      ctx,
      isBull ? 'BULL RUN! 2X!' : 'BEAR TRAP!',
      cx,
      bannerY + 3,
      '#FFFFFF',
      1,
      'center'
    );
  }
}
