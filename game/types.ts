export type CharacterId = 'guy1' | 'guy2' | 'guy3';
export type BiomeId = 'day' | 'sunset' | 'night' | 'volcano';
export type GameScreen = 'title' | 'playing' | 'gameover';

export type PlatformType =
  | 'ground'
  | 'brick'
  | 'question'
  | 'pipe_top_l'
  | 'pipe_top_r'
  | 'pipe_body_l'
  | 'pipe_body_r'
  | 'moving'
  | 'crumble'
  | 'bounce'
  | 'spike'
  | 'gate';

export interface Platform {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: PlatformType;
  used?: boolean;
  broken?: boolean;
  bounceOffset?: number;
  // Moving platform properties
  baseX?: number;
  baseY?: number;
  moveRangeX?: number;
  moveRangeY?: number;
  moveSpeed?: number;
  movePhase?: number;
  deltaX?: number;
  deltaY?: number;
  // Crumble platform properties
  crumbling?: boolean;
  crumbleTimer?: number;
  respawnTimer?: number;
  // Bounce spring animation
  springTimer?: number;
}

export interface Coin {
  x: number;
  y: number;
  collected: boolean;
  floatOffset: number;
  vx?: number;
  vy?: number;
}

export type EnemyType = 'goomba' | 'snake' | 'badguy';

export interface Enemy {
  x: number;
  y: number;
  direction: number;
  alive: boolean;
  type: EnemyType;
  velocityY: number;
  waveOffset?: number;
  animFrame?: number;
  initialPushX?: number;
  // Goomba AI
  patrolTimer?: number;
  isChasing?: boolean;
  chaseSpeed?: number;
  // Snake AI
  attackCooldown?: number;
  isLunging?: boolean;
  lungeTimer?: number;
  hopTimer?: number;
  // Badguy (ghost) AI
  frozen?: boolean;
  mimicJumpTimer?: number;
  mimicJumpVelocity?: number;
  disappearTimer?: number;
  isDisappearing?: boolean;
  opacity?: number;
  floatOffset?: number;
  stalkerMode?: boolean;
  rushTimer?: boolean | number;
}

export type BossAIState =
  | 'inactive'
  | 'intro'
  | 'idle'
  | 'walk'
  | 'telegraph_charge'
  | 'charging'
  | 'telegraph_slam'
  | 'slam_jump'
  | 'slam_dive'
  | 'telegraph_shoot'
  | 'shooting'
  | 'stunned'
  | 'phase_transition'
  | 'dying'
  | 'dead';

export interface Boss {
  kind: 'miniboss' | 'finalboss';
  name: string;
  subtitle: string;
  x: number;
  y: number;
  width: number;
  height: number;
  spriteWidth: number;
  spriteHeight: number;
  vx: number;
  vy: number;
  onGround: boolean;
  facingLeft: boolean;
  hp: number;
  maxHp: number;
  phase: 1 | 2;
  aiState: BossAIState;
  stateTimer: number;
  hurtFlashTimer: number;
  invulnTimer: number;
  animTimer: number;
  attackCounter: number;
  arenaLeft: number;
  arenaRight: number;
  arenaFloorY: number;
  targetX: number;
  gateClosed: boolean;
}

export interface BossProjectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  kind: 'candle' | 'venom' | 'shockwave' | 'meteor';
  life: number;
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size?: number;
  noGravity?: boolean;
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface Checkpoint {
  x: number;
  y: number;
  activated: boolean;
}

export interface PlayerSprite {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityX: number;
  velocityY: number;
  onGround: boolean;
  facingLeft: boolean;
  currentAnimation: string;
  animationFrame: number;
  animationTimer: number;
  rotation: number;
  squashX: number;
  squashY: number;
  hasHelmet: boolean;
  helmetTimer: number;
  landingTimer: number;
  hasWaterGun: boolean;
  waterGunTimer: number;
  shootCooldown: number;
  invincibilityTimer: number;
  bullRunTimer: number;
  // Air slide / Speedster
  isAirSliding: boolean;
  airSlideTimer: number;
  airSlideUsed: boolean;
  speedBoostTimer: number;
  airDashCount: number;
  // Slammer
  isSlamming: boolean;
  slamCharging: boolean;
  jumpHoldTime: number;
  groundPoundRadius: number;
  chargeLevel: number;
  // Classic
  doubleJumpAvailable: boolean;
  dashAvailable: boolean;
  dashTimer: number;
  isDashing: boolean;
  dashCooldown: number;
}

export interface StageData {
  biome: BiomeId;
  platforms: Platform[];
  coins: Coin[];
  enemies: Enemy[];
  checkpoints: Checkpoint[];
  portal: { x: number; y: number; animationFrame: number; active: boolean } | null;
  waterGuns: Array<{ x: number; y: number; collected: boolean }>;
  boss: Boss | null;
  width: number;
  goalX: number;
}

export interface GameState {
  player: PlayerSprite;
  keys: Record<string, boolean>;
  abilityJustPressed: boolean;
  shootJustPressed: boolean;
  coyoteTime: number;
  jumpBuffer: number;
  combo: number;
  comboTimer: number;
  screenShake: number;
  hitStopTimer: number;
  camera: { x: number; y: number; targetX: number };
  currentStage: number;
  biome: BiomeId;
  stageWidth: number;
  goalX: number;
  respawnX: number;
  respawnY: number;
  stageTime: number;
  lastFootstepTime: number;
  coinsCollectedThisStage: number;
  totalCoinsThisStage: number;
  celebrating: boolean;
  celebrationTimer: number;
  celebrationElapsed: number;
  flagSlideComplete: boolean;
  flagRaiseProgress: number;
  fireworkTimer: number;
  stageBonusAwarded: number;
  flagPoleBonus: number;
  stageStars: number;
  gameStarted: boolean;
  gameStartTimer: number;
  coins: Coin[];
  enemies: Enemy[];
  boss: Boss | null;
  bossProjectiles: BossProjectile[];
  bossWarningTimer: number;
  checkpoints: Checkpoint[];
  waterGuns: Array<{ x: number; y: number; collected: boolean }>;
  waterProjectiles: Array<{ x: number; y: number; vx: number; vy: number; life: number }>;
  particles: Particle[];
  floatingTexts: FloatingText[];
  platforms: Platform[];
  movingPlatforms: Platform[];
  portal: { x: number; y: number; animationFrame: number; active: boolean } | null;
  inBlackhole: boolean;
  blackholeTimer: number;
  blackholeFallSpeed: number;
  chartBars: Array<{ height: number; color: 'green' | 'red' }>;
  chartComplete: boolean;
  chartResult: 'green' | 'red' | '';
  speechBubble: { text: string; timer: number; phraseIndex: number } | null;
  speechCooldown: number;
  deathFlashTimer: number;
  score: number;
}
