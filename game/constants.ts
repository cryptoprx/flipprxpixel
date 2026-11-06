import { BiomeId, CharacterId } from './types';

export const GAME_WIDTH_BASE = 160;
export const GAME_HEIGHT = 144;

export const GRAVITY = 850;
export const PLAYER_SPEED = 145;
export const PLAYER_ACCEL = 1550;
export const PLAYER_FRICTION = 1750;
export const AIR_FRICTION = 320;
export const JUMP_VELOCITY = -325;
export const DOUBLE_JUMP_VELOCITY = -285;
export const BOUNCE_PAD_VELOCITY = -435;
export const DASH_SPEED = 290;
export const DASH_DURATION = 0.18;
export const DASH_COOLDOWN = 0.75;
export const COYOTE_TIME = 0.18;
export const JUMP_BUFFER = 0.22;
export const MAX_FALL_SPEED = 480;
export const MAX_PARTICLES = 180;
export const FIXED_DT = 1 / 60;

export interface CharacterMeta {
  id: CharacterId;
  name: string;
  shortLabel: string;
  color: string;
  abilityName: string;
  abilityHint: string;
  passiveHint: string;
  stats: { speed: number; jump: number; power: number };
}

export const CHARACTERS: Record<CharacterId, CharacterMeta> = {
  guy1: {
    id: 'guy1',
    name: 'CLASSIC',
    shortLabel: 'CLS',
    color: '#60A5FA',
    abilityName: 'SHADOW DASH + DBL JUMP',
    abilityHint: 'A×2: Double Jump  |  B / SHIFT: Invincible Dash',
    passiveHint: '+25% Longer Star Helmet',
    stats: { speed: 3, jump: 5, power: 3 },
  },
  guy2: {
    id: 'guy2',
    name: 'SPEEDSTER',
    shortLabel: 'SPD',
    color: '#4ADE80',
    abilityName: 'TURBO AIR-SLIDE',
    abilityHint: 'B in Air (or Hold Jump): 2× Fart Boost + Turbo Land',
    passiveHint: '+35% Run Speed & Coin Magnet',
    stats: { speed: 5, jump: 4, power: 2 },
  },
  guy3: {
    id: 'guy3',
    name: 'SLAMMER',
    shortLabel: 'SLM',
    color: '#FB923C',
    abilityName: 'METEOR SLAM',
    abilityHint: 'B in Air (or Hold Jump): Quake Slam (2× Boss DMG!)',
    passiveHint: 'Smashes Bricks & Shockwaves Enemies',
    stats: { speed: 2, jump: 3, power: 5 },
  },
};

export interface BiomePalette {
  id: BiomeId;
  label: string;
  skyStops: [string, string, string, string];
  hasStars: boolean;
  hasEmbers: boolean;
  cloudMain: string;
  cloudHighlight: string;
  cloudShadow: string;
  mountainMain: string;
  mountainCap: string;
  hillMain: string;
  bushMain: string;
  bushHighlight: string;
  bushDark: string;
  groundTop: string;
  groundMid: string;
  groundBase: string;
  groundHighlight: string;
  brickBase: string;
  brickFace: string;
  brickHighlight: string;
  brickMortar: string;
  pipeLight: string;
  pipeMid: string;
  pipeDark: string;
}

export const BIOMES: Record<BiomeId, BiomePalette> = {
  day: {
    id: 'day',
    label: 'GRASSLANDS',
    skyStops: ['#38BDF8', '#7DD3FC', '#BAE6FD', '#E0F2FE'],
    hasStars: false,
    hasEmbers: false,
    cloudMain: '#FFFFFF',
    cloudHighlight: '#F0F9FF',
    cloudShadow: '#CBD5E1',
    mountainMain: '#64748B',
    mountainCap: '#F8FAFC',
    hillMain: '#22C55E',
    bushMain: '#10B981',
    bushHighlight: '#34D399',
    bushDark: '#047857',
    groundTop: '#22C55E',
    groundMid: '#B45309',
    groundBase: '#78350F',
    groundHighlight: '#4ADE80',
    brickBase: '#991B1B',
    brickFace: '#DC2626',
    brickHighlight: '#F87171',
    brickMortar: '#450A0A',
    pipeLight: '#4ADE80',
    pipeMid: '#16A34A',
    pipeDark: '#14532D',
  },
  sunset: {
    id: 'sunset',
    label: 'SUNSET CANYON',
    skyStops: ['#311042', '#9D174D', '#EA580C', '#FDE047'],
    hasStars: false,
    hasEmbers: false,
    cloudMain: '#FED7AA',
    cloudHighlight: '#FEF3C7',
    cloudShadow: '#FB923C',
    mountainMain: '#581C87',
    mountainCap: '#FDBA74',
    hillMain: '#B45309',
    bushMain: '#D97706',
    bushHighlight: '#FBBF24',
    bushDark: '#92400E',
    groundTop: '#EA580C',
    groundMid: '#9A3412',
    groundBase: '#431407',
    groundHighlight: '#FB923C',
    brickBase: '#7C2D12',
    brickFace: '#C2410C',
    brickHighlight: '#FB923C',
    brickMortar: '#431407',
    pipeLight: '#FCD34D',
    pipeMid: '#D97706',
    pipeDark: '#78350F',
  },
  night: {
    id: 'night',
    label: 'NEON HAUNT',
    skyStops: ['#050517', '#0F172A', '#1E1B4B', '#312E81'],
    hasStars: true,
    hasEmbers: false,
    cloudMain: '#312E81',
    cloudHighlight: '#4338CA',
    cloudShadow: '#1E1B4B',
    mountainMain: '#1E293B',
    mountainCap: '#818CF8',
    hillMain: '#0F766E',
    bushMain: '#0D9488',
    bushHighlight: '#2DD4BF',
    bushDark: '#115E59',
    groundTop: '#6366F1',
    groundMid: '#312E81',
    groundBase: '#1E1B4B',
    groundHighlight: '#A5B4FC',
    brickBase: '#4C1D95',
    brickFace: '#6D28D9',
    brickHighlight: '#A78BFA',
    brickMortar: '#2E1065',
    pipeLight: '#22D3EE',
    pipeMid: '#0891B2',
    pipeDark: '#164E63',
  },
  volcano: {
    id: 'volcano',
    label: 'CITADEL OF REKTUS',
    skyStops: ['#09040A', '#2A0813', '#68101D', '#B91C1C'],
    hasStars: false,
    hasEmbers: true,
    cloudMain: '#451A2B',
    cloudHighlight: '#7F1D1D',
    cloudShadow: '#1F0910',
    mountainMain: '#1C1917',
    mountainCap: '#EF4444',
    hillMain: '#44403C',
    bushMain: '#991B1B',
    bushHighlight: '#F97316',
    bushDark: '#450A0A',
    groundTop: '#F97316',
    groundMid: '#292524',
    groundBase: '#0C0A09',
    groundHighlight: '#FACC15',
    brickBase: '#27272A',
    brickFace: '#3F3F46',
    brickHighlight: '#EF4444',
    brickMortar: '#09090B',
    pipeLight: '#F87171',
    pipeMid: '#B91C1C',
    pipeDark: '#450A0A',
  },
};

export function getBiomeForStage(stageNum: number): BiomeId {
  if (stageNum <= 3) return 'day';
  if (stageNum <= 5) return 'sunset';
  if (stageNum <= 8) return 'night';
  return 'volcano';
}
