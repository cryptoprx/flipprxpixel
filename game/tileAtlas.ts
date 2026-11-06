import { BIOMES, BiomePalette } from './constants';
import { BiomeId } from './types';

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

export interface BiomeTiles {
  ground: HTMLCanvasElement;
  brick: HTMLCanvasElement;
  pipe_top_l: HTMLCanvasElement;
  pipe_top_r: HTMLCanvasElement;
  pipe_body_l: HTMLCanvasElement;
  pipe_body_r: HTMLCanvasElement;
  cloud: HTMLCanvasElement;
  bush: [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement];
}

export interface SharedTiles {
  used: HTMLCanvasElement;
  question: [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement];
  moving: HTMLCanvasElement;
  crumble: HTMLCanvasElement;
  crumble_cracked: HTMLCanvasElement;
  bounce_idle: HTMLCanvasElement;
  bounce_active: HTMLCanvasElement;
  spike: HTMLCanvasElement;
  gate: HTMLCanvasElement;
  coins: HTMLCanvasElement[];
  heartFull: HTMLCanvasElement;
  heartEmpty: HTMLCanvasElement;
}

export interface TileAtlas {
  biomes: Record<BiomeId, BiomeTiles>;
  shared: SharedTiles;
}

let cachedAtlas: TileAtlas | null = null;

function buildBiomeTiles(b: BiomePalette): BiomeTiles {
  // 1. Ground 16x16
  const [ground, gCtx] = makeCanvas(16, 16);
  gCtx.fillStyle = '#000000';
  gCtx.fillRect(0, 0, 16, 16);
  gCtx.fillStyle = b.groundBase;
  gCtx.fillRect(1, 1, 14, 14);
  gCtx.fillStyle = b.groundMid;
  gCtx.fillRect(1, 5, 14, 9);
  gCtx.fillStyle = b.groundTop;
  gCtx.fillRect(1, 1, 14, 4);
  gCtx.fillStyle = b.groundHighlight;
  gCtx.fillRect(1, 1, 14, 1);
  // Grass/crust tufts
  gCtx.fillStyle = b.groundTop;
  gCtx.fillRect(3, 5, 2, 1);
  gCtx.fillRect(8, 5, 3, 1);
  gCtx.fillRect(13, 5, 1, 1);
  // Pebbles
  gCtx.fillStyle = b.groundBase;
  gCtx.fillRect(3, 8, 2, 2);
  gCtx.fillRect(10, 10, 2, 2);
  gCtx.fillRect(6, 12, 2, 1);

  // 2. Brick 16x16
  const [brick, brCtx] = makeCanvas(16, 16);
  brCtx.fillStyle = '#000000';
  brCtx.fillRect(0, 0, 16, 16);
  brCtx.fillStyle = b.brickBase;
  brCtx.fillRect(1, 1, 14, 14);
  brCtx.fillStyle = b.brickFace;
  brCtx.fillRect(2, 2, 12, 12);
  brCtx.fillStyle = b.brickHighlight;
  brCtx.fillRect(2, 2, 12, 2);
  brCtx.fillRect(2, 2, 2, 12);
  brCtx.fillStyle = b.brickMortar;
  brCtx.fillRect(1, 8, 14, 1);
  brCtx.fillRect(8, 1, 1, 7);
  brCtx.fillRect(4, 8, 1, 7);
  brCtx.fillRect(12, 8, 1, 7);
  brCtx.fillRect(2, 13, 12, 1);

  // 3. Connected Pipe Top Left & Right (16x16 each -> forms 32px wide pipe lip!)
  const [pipe_top_l, ptl] = makeCanvas(16, 16);
  ptl.fillStyle = '#000000';
  ptl.fillRect(0, 0, 16, 15); // Wide rim y=0..14
  ptl.fillRect(2, 14, 14, 2); // Neck indent at y=14..15
  ptl.fillStyle = b.pipeMid;
  ptl.fillRect(1, 1, 15, 13);
  ptl.fillStyle = b.pipeLight;
  ptl.fillRect(2, 1, 4, 13); // Cylindrical specular highlight band!
  ptl.fillRect(1, 1, 15, 2);
  ptl.fillStyle = b.pipeDark;
  ptl.fillRect(1, 13, 15, 1);
  ptl.fillStyle = b.pipeMid;
  ptl.fillRect(3, 15, 13, 1);
  ptl.fillStyle = b.pipeLight;
  ptl.fillRect(4, 15, 3, 1);

  const [pipe_top_r, ptr] = makeCanvas(16, 16);
  ptr.fillStyle = '#000000';
  ptr.fillRect(0, 0, 16, 15);
  ptr.fillRect(0, 14, 14, 2);
  ptr.fillStyle = b.pipeMid;
  ptr.fillRect(0, 1, 15, 13);
  ptr.fillStyle = b.pipeLight;
  ptr.fillRect(0, 1, 15, 2);
  ptr.fillStyle = b.pipeDark;
  ptr.fillRect(9, 2, 6, 12); // Cylindrical right shadow!
  ptr.fillRect(0, 13, 15, 1);
  ptr.fillStyle = b.pipeMid;
  ptr.fillRect(0, 15, 13, 1);
  ptr.fillStyle = b.pipeDark;
  ptr.fillRect(8, 15, 5, 1);

  // 4. Connected Pipe Body Left & Right (16x16 each, indented 2px on outer edges -> 28px shaft!)
  const [pipe_body_l, pbl] = makeCanvas(16, 16);
  pbl.fillStyle = '#000000';
  pbl.fillRect(2, 0, 14, 16);
  pbl.fillStyle = b.pipeMid;
  pbl.fillRect(3, 0, 13, 16);
  pbl.fillStyle = b.pipeLight;
  pbl.fillRect(4, 0, 4, 16);
  pbl.fillRect(10, 0, 1, 16);

  const [pipe_body_r, pbr] = makeCanvas(16, 16);
  pbr.fillStyle = '#000000';
  pbr.fillRect(0, 0, 14, 16);
  pbr.fillStyle = b.pipeMid;
  pbr.fillRect(0, 0, 13, 16);
  pbr.fillStyle = b.pipeDark;
  pbr.fillRect(7, 0, 6, 16);

  // 5. Cloud 28x16
  const [cloud, cCtx] = makeCanvas(28, 16);
  cCtx.fillStyle = '#000000';
  cCtx.fillRect(5, 5, 18, 9);
  cCtx.fillRect(9, 1, 10, 5);
  cCtx.fillRect(2, 7, 5, 6);
  cCtx.fillRect(21, 6, 5, 7);
  cCtx.fillStyle = b.cloudMain;
  cCtx.fillRect(6, 6, 16, 7);
  cCtx.fillRect(10, 2, 8, 5);
  cCtx.fillRect(3, 8, 4, 4);
  cCtx.fillRect(21, 7, 4, 5);
  cCtx.fillStyle = b.cloudHighlight;
  cCtx.fillRect(10, 2, 5, 2);
  cCtx.fillRect(6, 6, 6, 2);
  cCtx.fillStyle = b.cloudShadow;
  cCtx.fillRect(6, 11, 16, 2);

  // 6. Bushes (3 variants, 20x46)
  const bushes = [0, 1, 2].map((variant) => {
    const [bs, bsCtx] = makeCanvas(20, 46);
    const ox = 4;
    const oy = 6;
    bsCtx.fillStyle = '#000000';
    bsCtx.fillRect(ox - 1, oy, 14, 40);
    bsCtx.fillRect(ox + 1, oy - 3, 10, 3);
    if (variant === 0) {
      bsCtx.fillRect(ox - 3, oy + 2, 2, 38);
      bsCtx.fillRect(ox + 13, oy + 2, 2, 38);
    } else if (variant === 1) {
      bsCtx.fillRect(ox + 3, oy - 5, 6, 3);
    }
    bsCtx.fillStyle = b.bushMain;
    bsCtx.fillRect(ox, oy, 12, 40);
    bsCtx.fillRect(ox + 2, oy - 2, 8, 2);
    if (variant === 0) {
      bsCtx.fillRect(ox - 2, oy + 3, 2, 37);
      bsCtx.fillRect(ox + 12, oy + 3, 2, 37);
    } else if (variant === 1) {
      bsCtx.fillRect(ox + 4, oy - 4, 4, 2);
    }
    bsCtx.fillStyle = b.bushHighlight;
    bsCtx.fillRect(ox + 1, oy + 1, 4, 2);
    bsCtx.fillRect(ox + 3, oy - 1, 3, 1);
    bsCtx.fillStyle = b.bushDark;
    bsCtx.fillRect(ox + 7, oy + 4, 2, 2);
    bsCtx.fillRect(ox + 3, oy + 7, 2, 2);
    return bs;
  }) as [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement];

  return { ground, brick, pipe_top_l, pipe_top_r, pipe_body_l, pipe_body_r, cloud, bush: bushes };
}

function buildSharedTiles(): SharedTiles {
  // Used ? block
  const [used, uCtx] = makeCanvas(16, 16);
  uCtx.fillStyle = '#000000';
  uCtx.fillRect(0, 0, 16, 16);
  uCtx.fillStyle = '#57534E';
  uCtx.fillRect(1, 1, 14, 14);
  uCtx.fillStyle = '#78716C';
  uCtx.fillRect(2, 2, 12, 12);
  uCtx.fillStyle = '#A8A29E';
  uCtx.fillRect(2, 2, 11, 1);
  uCtx.fillStyle = '#292524';
  uCtx.fillRect(2, 2, 1, 1);
  uCtx.fillRect(13, 2, 1, 1);
  uCtx.fillRect(2, 13, 1, 1);
  uCtx.fillRect(13, 13, 1, 1);

  // 3 shimmer frames of Question Block
  const question = [0, 1, 2].map((shimmer) => {
    const [q, qCtx] = makeCanvas(16, 16);
    qCtx.fillStyle = '#000000';
    qCtx.fillRect(0, 0, 16, 16);
    const base = shimmer === 0 ? '#FACC15' : shimmer === 1 ? '#FDE047' : '#EAB308';
    qCtx.fillStyle = base;
    qCtx.fillRect(1, 1, 14, 14);
    qCtx.fillStyle = '#FEF9C3';
    qCtx.fillRect(2, 2, 12, 2);
    qCtx.fillRect(2, 2, 2, 12);
    qCtx.fillStyle = '#CA8A04';
    qCtx.fillRect(2, 13, 12, 2);
    qCtx.fillRect(13, 2, 2, 12);
    // Corner rivets
    qCtx.fillStyle = '#713F12';
    qCtx.fillRect(2, 2, 1, 1);
    qCtx.fillRect(13, 2, 1, 1);
    qCtx.fillRect(2, 13, 1, 1);
    qCtx.fillRect(13, 13, 1, 1);
    // '?' glyph
    qCtx.fillStyle = '#000000';
    qCtx.fillRect(5, 4, 6, 2);
    qCtx.fillRect(9, 6, 2, 2);
    qCtx.fillRect(7, 8, 2, 2);
    qCtx.fillRect(7, 11, 2, 2);
    qCtx.fillStyle = '#FFFFFF';
    qCtx.fillRect(5, 4, 4, 1);
    qCtx.fillRect(7, 11, 1, 1);
    return q;
  }) as [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement];

  // Moving hover-platform tile (16x8)
  const [moving, mCtx] = makeCanvas(16, 8);
  mCtx.fillStyle = '#000000';
  mCtx.fillRect(0, 0, 16, 8);
  mCtx.fillStyle = '#334155';
  mCtx.fillRect(1, 1, 14, 6);
  mCtx.fillStyle = '#FACC15';
  mCtx.fillRect(1, 1, 14, 2);
  mCtx.fillStyle = '#38BDF8';
  mCtx.fillRect(3, 5, 3, 2);
  mCtx.fillRect(10, 5, 3, 2);

  // Crumble block (16x16) & cracked state
  const [crumble, crCtx] = makeCanvas(16, 16);
  crCtx.fillStyle = '#000000';
  crCtx.fillRect(0, 0, 16, 16);
  crCtx.fillStyle = '#92400E';
  crCtx.fillRect(1, 1, 14, 14);
  crCtx.fillStyle = '#D97706';
  crCtx.fillRect(2, 2, 12, 10);
  crCtx.fillStyle = '#FDE68A';
  crCtx.fillRect(2, 2, 12, 2);
  crCtx.fillStyle = '#451A03';
  crCtx.fillRect(5, 6, 2, 3);
  crCtx.fillRect(7, 9, 3, 2);
  crCtx.fillRect(10, 5, 2, 2);

  const [crumble_cracked, ccCtx] = makeCanvas(16, 16);
  ccCtx.drawImage(crumble, 0, 0);
  ccCtx.fillStyle = '#000000';
  ccCtx.fillRect(3, 2, 2, 5);
  ccCtx.fillRect(5, 7, 3, 4);
  ccCtx.fillRect(8, 11, 2, 4);
  ccCtx.fillRect(11, 3, 2, 6);

  // Bounce pad idle & active (16x16)
  const [bounce_idle, biCtx] = makeCanvas(16, 16);
  // Top pad y=4..8, spring coils y=8..13, base y=13..16
  biCtx.fillStyle = '#000000';
  biCtx.fillRect(0, 4, 16, 5);
  biCtx.fillRect(1, 13, 14, 3);
  biCtx.fillStyle = '#EF4444';
  biCtx.fillRect(1, 5, 14, 3);
  biCtx.fillStyle = '#FCA5A5';
  biCtx.fillRect(2, 5, 12, 1);
  biCtx.fillStyle = '#FACC15';
  biCtx.fillRect(6, 6, 4, 1);
  // Coils
  biCtx.fillStyle = '#CBD5E1';
  biCtx.fillRect(3, 9, 10, 1);
  biCtx.fillRect(5, 10, 6, 1);
  biCtx.fillRect(3, 11, 10, 1);
  biCtx.fillRect(5, 12, 6, 1);
  // Base
  biCtx.fillStyle = '#475569';
  biCtx.fillRect(2, 14, 12, 1);

  const [bounce_active, baCtx] = makeCanvas(16, 16);
  baCtx.fillStyle = '#000000';
  baCtx.fillRect(0, 1, 16, 5);
  baCtx.fillRect(1, 13, 14, 3);
  baCtx.fillStyle = '#22C55E';
  baCtx.fillRect(1, 2, 14, 3);
  baCtx.fillStyle = '#86EFAC';
  baCtx.fillRect(2, 2, 12, 1);
  baCtx.fillStyle = '#FEF08A';
  baCtx.fillRect(4, 6, 8, 7);
  baCtx.fillStyle = '#000000';
  baCtx.fillRect(5, 8, 6, 1);
  baCtx.fillRect(5, 11, 6, 1);
  baCtx.fillStyle = '#475569';
  baCtx.fillRect(2, 14, 12, 1);

  // Spike hazard (16x10 — two sharp 8px metallic spikes!)
  const [spike, spCtx] = makeCanvas(16, 10);
  for (const ox of [0, 8]) {
    spCtx.fillStyle = '#000000';
    spCtx.fillRect(ox + 3, 0, 2, 2);
    spCtx.fillRect(ox + 2, 2, 4, 3);
    spCtx.fillRect(ox + 1, 5, 6, 3);
    spCtx.fillRect(ox, 8, 8, 2);
    spCtx.fillStyle = '#E2E8F0';
    spCtx.fillRect(ox + 3, 2, 2, 6);
    spCtx.fillRect(ox + 2, 5, 2, 4);
    spCtx.fillRect(ox + 1, 8, 6, 1);
    spCtx.fillStyle = '#64748B';
    spCtx.fillRect(ox + 4, 5, 2, 4);
    // Crimson danger tip
    spCtx.fillStyle = '#EF4444';
    spCtx.fillRect(ox + 3, 1, 2, 2);
  }

  // Boss Arena Gate tile (16x16)
  const [gate, gtCtx] = makeCanvas(16, 16);
  gtCtx.fillStyle = '#000000';
  gtCtx.fillRect(0, 0, 16, 16);
  gtCtx.fillStyle = '#1E293B';
  gtCtx.fillRect(1, 1, 14, 14);
  gtCtx.fillStyle = '#EF4444';
  gtCtx.fillRect(2, 2, 12, 2);
  gtCtx.fillRect(2, 12, 12, 2);
  gtCtx.fillStyle = '#94A3B8';
  gtCtx.fillRect(3, 5, 2, 6);
  gtCtx.fillRect(7, 5, 2, 6);
  gtCtx.fillRect(11, 5, 2, 6);

  // 8 Spinning Coin Frames (8x8 each)
  const coins = Array.from({ length: 8 }, (_, spinFrame) => {
    const [cn, ctx] = makeCanvas(8, 8);
    ctx.fillStyle = '#000000';
    if (spinFrame < 2 || spinFrame > 5) {
      ctx.fillRect(2, 0, 4, 8);
      ctx.fillRect(1, 1, 6, 6);
      ctx.fillRect(0, 2, 8, 4);
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(2, 1, 4, 6);
      ctx.fillRect(1, 2, 6, 4);
      ctx.fillStyle = '#FEF9C3';
      ctx.fillRect(2, 1, 2, 1);
      ctx.fillRect(1, 2, 2, 2);
      ctx.fillStyle = '#CA8A04';
      ctx.fillRect(4, 3, 1, 3);
      ctx.fillRect(5, 4, 1, 2);
    } else if (spinFrame === 2 || spinFrame === 5) {
      ctx.fillRect(2, 0, 4, 8);
      ctx.fillRect(1, 1, 6, 6);
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(2, 1, 4, 6);
      ctx.fillStyle = '#FEF9C3';
      ctx.fillRect(2, 2, 1, 4);
      ctx.fillStyle = '#CA8A04';
      ctx.fillRect(4, 2, 1, 4);
    } else {
      ctx.fillRect(3, 0, 2, 8);
      ctx.fillRect(2, 1, 4, 6);
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(3, 1, 2, 6);
    }
    return cn;
  });

  // Hearts (9x8)
  const [heartFull, hf] = makeCanvas(9, 8);
  const [heartEmpty, he] = makeCanvas(9, 8);
  const heartRows = [
    '.OO.OO.',
    'ORRORRO',
    'ORWRRRO',
    'ORRRRRO',
    '.ORRRRO',
    '..ORRO.',
    '...OO..',
  ];
  heartRows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      hf.fillStyle = ch === 'O' ? '#000000' : ch === 'W' ? '#FFFFFF' : '#EF4444';
      hf.fillRect(x, y, 1, 1);
      he.fillStyle = ch === 'O' ? '#000000' : '#3F3F46';
      he.fillRect(x, y, 1, 1);
    }
  });

  return {
    used,
    question,
    moving,
    crumble,
    crumble_cracked,
    bounce_idle,
    bounce_active,
    spike,
    gate,
    coins,
    heartFull,
    heartEmpty,
  };
}

export function getTileAtlas(): TileAtlas {
  if (cachedAtlas) return cachedAtlas;
  cachedAtlas = {
    biomes: {
      day: buildBiomeTiles(BIOMES.day),
      sunset: buildBiomeTiles(BIOMES.sunset),
      night: buildBiomeTiles(BIOMES.night),
      volcano: buildBiomeTiles(BIOMES.volcano),
    },
    shared: buildSharedTiles(),
  };
  return cachedAtlas;
}

// Crisp 4x5 Pixel Bitmap Font for Canvas HUD, Banners, Boss Nameplates & Score Popups!
const FONT_4X5: Record<string, number[]> = {
  A: [0b0110, 0b1001, 0b1111, 0b1001, 0b1001],
  B: [0b1110, 0b1001, 0b1110, 0b1001, 0b1110],
  C: [0b0111, 0b1000, 0b1000, 0b1000, 0b0111],
  D: [0b1110, 0b1001, 0b1001, 0b1001, 0b1110],
  E: [0b1111, 0b1000, 0b1110, 0b1000, 0b1111],
  F: [0b1111, 0b1000, 0b1110, 0b1000, 0b1000],
  G: [0b0111, 0b1000, 0b1011, 0b1001, 0b0111],
  H: [0b1001, 0b1001, 0b1111, 0b1001, 0b1001],
  I: [0b1110, 0b0100, 0b0100, 0b0100, 0b1110],
  J: [0b0011, 0b0001, 0b0001, 0b1001, 0b0110],
  K: [0b1001, 0b1010, 0b1100, 0b1010, 0b1001],
  L: [0b1000, 0b1000, 0b1000, 0b1000, 0b1111],
  M: [0b1001, 0b1111, 0b1111, 0b1001, 0b1001],
  N: [0b1001, 0b1101, 0b1011, 0b1001, 0b1001],
  O: [0b0110, 0b1001, 0b1001, 0b1001, 0b0110],
  P: [0b1110, 0b1001, 0b1110, 0b1000, 0b1000],
  Q: [0b0110, 0b1001, 0b1001, 0b0110, 0b0011],
  R: [0b1110, 0b1001, 0b1110, 0b1010, 0b1001],
  S: [0b0111, 0b1000, 0b0110, 0b0001, 0b1110],
  T: [0b1110, 0b0100, 0b0100, 0b0100, 0b0100],
  U: [0b1001, 0b1001, 0b1001, 0b1001, 0b0110],
  V: [0b1001, 0b1001, 0b1001, 0b0110, 0b0110],
  W: [0b1001, 0b1001, 0b1111, 0b1111, 0b1001],
  X: [0b1001, 0b0110, 0b0110, 0b1001, 0b1001],
  Y: [0b1001, 0b1001, 0b0110, 0b0100, 0b0100],
  Z: [0b1111, 0b0010, 0b0100, 0b1000, 0b1111],
  '0': [0b0110, 0b1011, 0b1001, 0b1101, 0b0110],
  '1': [0b0100, 0b1100, 0b0100, 0b0100, 0b1110],
  '2': [0b1110, 0b0001, 0b0110, 0b1000, 0b1111],
  '3': [0b1110, 0b0001, 0b0110, 0b0001, 0b1110],
  '4': [0b1001, 0b1001, 0b1111, 0b0001, 0b0001],
  '5': [0b1111, 0b1000, 0b1110, 0b0001, 0b1110],
  '6': [0b0111, 0b1000, 0b1110, 0b1001, 0b0110],
  '7': [0b1111, 0b0001, 0b0010, 0b0100, 0b0100],
  '8': [0b0110, 0b1001, 0b0110, 0b1001, 0b0110],
  '9': [0b0110, 0b1001, 0b0111, 0b0001, 0b1110],
  '!': [0b0100, 0b0100, 0b0100, 0b0000, 0b0100],
  ':': [0b0000, 0b0100, 0b0000, 0b0100, 0b0000],
  '/': [0b0001, 0b0010, 0b0100, 0b1000, 0b0000],
  '+': [0b0000, 0b0100, 0b1110, 0b0100, 0b0000],
  '-': [0b0000, 0b0000, 0b1110, 0b0000, 0b0000],
  '.': [0b0000, 0b0000, 0b0000, 0b0000, 0b0100],
  '%': [0b1001, 0b0010, 0b0100, 0b1001, 0b0000],
  '?': [0b0110, 0b0001, 0b0110, 0b0000, 0b0100],
  ' ': [0, 0, 0, 0, 0],
};

export function measurePixelText(text: string, scale = 1): number {
  if (!text.length) return 0;
  return (text.length * 5 - 1) * scale;
}

export function drawPixelText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  scale = 1,
  align: 'left' | 'center' | 'right' = 'left',
  shadow = true
) {
  const upper = text.toUpperCase();
  const totalW = measurePixelText(upper, scale);
  let startX = Math.floor(x);
  if (align === 'center') startX = Math.floor(x - totalW / 2);
  else if (align === 'right') startX = Math.floor(x - totalW);
  const startY = Math.floor(y);

  const renderPass = (ox: number, oy: number, fill: string) => {
    ctx.fillStyle = fill;
    let cx = startX + ox;
    for (let i = 0; i < upper.length; i++) {
      const glyph = FONT_4X5[upper[i]] || FONT_4X5[' '];
      for (let r = 0; r < 5; r++) {
        const rowBits = glyph[r];
        if (!rowBits) continue;
        for (let c = 0; c < 4; c++) {
          if (rowBits & (1 << (3 - c))) {
            ctx.fillRect(cx + c * scale, startY + oy + r * scale, scale, scale);
          }
        }
      }
      cx += 5 * scale;
    }
  };

  if (shadow) {
    renderPass(scale, scale, '#000000');
  }
  renderPass(0, 0, color);
}
