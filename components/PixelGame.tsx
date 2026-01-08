'use client';

import { useEffect, useRef, useState } from 'react';
import { generateStage } from '../utils/stageGenerator';

interface Sprite {
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
  hasHelmet: boolean;
  helmetTimer: number;
  landingTimer: number;
  hasWaterGun: boolean;
  waterGunTimer: number;
  shootCooldown: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

export default function PixelGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [currentStage, setCurrentStage] = useState(1);
  const [spritesLoaded, setSpritesLoaded] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  
  // Detect mobile/tablet device - always show gameboy style on mobile/tablet
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isMobileDevice || isSmallScreen);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const audioContextRef = useRef<AudioContext | null>(null);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const musicStartedRef = useRef(false);
  const spritesRef = useRef<Record<string, HTMLImageElement>>({});
  const gameStateRef = useRef({
    player: {
      x: 80,
      y: 112,
      width: 16,
      height: 16,
      velocityX: 0,
      velocityY: 0,
      onGround: false,
      facingLeft: false,
      currentAnimation: 'idle',
      animationFrame: 0,
      animationTimer: 0,
      rotation: 0,
      hasHelmet: false,
      helmetTimer: 0,
      landingTimer: 0,
      hasWaterGun: false,
      waterGunTimer: 0,
      shootCooldown: 0,
    } as Sprite,
    keys: {} as Record<string, boolean>,
    coyoteTime: 0,
    jumpBuffer: 0,
    combo: 0,
    comboTimer: 0,
    screenShake: 0,
    camera: { x: 0, y: 0, targetX: 0 },
    currentStage: 1,
    stageWidth: 0,
    goalX: 0,
    lastFootstepTime: 0,
    coinsCollectedThisStage: 0,
    totalCoinsThisStage: 0,
    celebrating: false,
    celebrationTimer: 0,
    coins: [] as Array<{ x: number; y: number; collected: boolean; floatOffset: number }>,
    enemies: [] as Array<{ x: number; y: number; direction: number; alive: boolean; type: 'goomba' | 'snake' | 'badguy'; waveOffset?: number; animFrame?: number }>,
    boss: null as { x: number; y: number; health: number; maxHealth: number; direction: number; state: 'idle' | 'walking' | 'attacking' | 'hurt' | 'defeated'; attackTimer: number; moveTimer: number; invulnerable: boolean; invulnerableTimer: number } | null,
    waterGun: null as { x: number; y: number; collected: boolean } | null,
    waterProjectiles: [] as Array<{ x: number; y: number; vx: number; vy: number; life: number }>,
    particles: [] as Particle[],
    platforms: [] as Array<{ x: number; y: number; width: number; height: number; type: string; used?: boolean; broken?: boolean; bounceOffset?: number }>,
    portal: null as { x: number; y: number; animationFrame: number; active: boolean } | null,
    inBlackhole: false,
    blackholeTimer: 0,
    blackholeFallSpeed: 0,
    chartBars: [] as Array<{ height: number; color: string }>,
    chartComplete: false,
    chartResult: '' as 'green' | 'red' | '',
  });

  // Game constants
  const GAME_WIDTH = 160;
  const GAME_HEIGHT = 144;
  const SCALE = 4;
  
  // Stage widths (in pixels) - each stage gets progressively longer and harder
  const STAGE_WIDTHS = [
    1000,   // Stage 1 - Tutorial
    1800,   // Stage 2
    2600,   // Stage 3
    3400,   // Stage 4
    4200,   // Stage 5
    5000,   // Stage 6
    5800,   // Stage 7
    6600,   // Stage 8
    7400,   // Stage 9
    8200,   // Stage 10 - Final challenge
  ];
  const GRAVITY = 800; // Slightly increased for snappier feel
  const PLAYER_SPEED = 140; // Faster movement
  const PLAYER_ACCEL = 1400; // Quicker acceleration
  const PLAYER_FRICTION = 1600; // Better stopping
  const AIR_FRICTION = 280; // More air control
  const JUMP_VELOCITY = -320; // Slightly higher jump
  const COYOTE_TIME = 0.18; // More forgiving edge jumps
  const JUMP_BUFFER = 0.24; // More forgiving jump timing
  const MAX_FALL_SPEED = 500; // Slightly faster falling

  // Audio system - procedural sound generation
  const playSound = (type: string) => {
    if (!audioEnabled) return;
    
    // Play bro.mp3 for death sound
    if (type === 'death') {
      const audio = new Audio('/bro.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
      return;
    }
    
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    
    if (type === 'jump') {
      // Jump sound - rising tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'land') {
      // Landing sound - thud
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'footstep') {
      // Footstep - quick tap
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.setValueAtTime(100, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'coin') {
      // Coin collect - bright ding
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'stomp') {
      // Enemy stomp - powerful hit
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'break') {
      // Brick break - crash
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'powerup') {
      // Power-up / question block - ascending chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'flip') {
      // Flip sound - whoosh
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'stage_clear') {
      // Stage clear - victory fanfare
      const playNote = (freq: number, delay: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0.3, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, now + delay + duration);
        
        osc.start(now + delay);
        osc.stop(now + delay + duration);
      };
      
      playNote(523, 0, 0.15);    // C
      playNote(659, 0.15, 0.15); // E
      playNote(784, 0.3, 0.3);   // G
    } else if (type === 'celebration') {
      // Celebration - full victory fanfare
      const playNote = (freq: number, delay: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.setValueAtTime(freq, now + delay);
        gain.gain.setValueAtTime(0.35, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, now + delay + duration);
        
        osc.start(now + delay);
        osc.stop(now + delay + duration);
      };
      
      // Victory melody
      playNote(523, 0, 0.12);      // C
      playNote(659, 0.12, 0.12);   // E
      playNote(784, 0.24, 0.12);   // G
      playNote(1047, 0.36, 0.25);  // High C
      playNote(784, 0.61, 0.12);   // G
      playNote(1047, 0.73, 0.35);  // High C (hold)
    }
  };

  // Initialize background music
  useEffect(() => {
    const audio = new Audio('/flip.mp3');
    audio.loop = true;
    audio.volume = 0.3; // Set to 30% volume
    bgMusicRef.current = audio;
    
    // Try to start playing, but will likely be blocked by browser
    // Music will start on first user interaction (handled in game loop)
    if (audioEnabled) {
      audio.play().catch(() => {
        // Autoplay blocked - will start on first interaction
      });
    }
    
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  // Handle audio toggle
  useEffect(() => {
    if (bgMusicRef.current) {
      if (audioEnabled) {
        bgMusicRef.current.play().catch(() => {
          // Will start on first user interaction
        });
      } else {
        bgMusicRef.current.pause();
      }
    }
  }, [audioEnabled]);

  // Check if user has seen wallet modal
  useEffect(() => {
    const hasSeenWalletModal = localStorage.getItem('flipprx_wallet_modal_seen');
    if (!hasSeenWalletModal) {
      setShowWalletModal(true);
    }
  }, []);

  // Load character sprites
  useEffect(() => {
    const spriteFiles = [
      'standing.png',
      'step1.PNG',
      'step2.PNG',
      'step3.PNG',
      'step4.PNG',
      'jump1.PNG',
      'jump2.PNG',
      'jump3.PNG',
      'jumpfall.png',
      'helmet.png',
      '1.png',
      '2.png',
      '3.png',
      '4.png',
      '5.png',
      '6.png',
      '7.png',
      '8.png',
    ];

    let loadedCount = 0;
    const totalSprites = spriteFiles.length;
    const startTime = Date.now();
    const minLoadingTime = 1500; // Show loading screen for at least 1.5 seconds

    spriteFiles.forEach(file => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount === totalSprites) {
          // Ensure minimum loading time to show croak.png animation
          const elapsedTime = Date.now() - startTime;
          const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
          setTimeout(() => {
            setSpritesLoaded(true);
          }, remainingTime);
        }
      };
      img.onerror = () => {
        console.error('Failed to load sprite:', file);
        loadedCount++;
        if (loadedCount === totalSprites) {
          const elapsedTime = Date.now() - startTime;
          const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
          setTimeout(() => {
            setSpritesLoaded(true);
          }, remainingTime);
        }
      };
      // Add cache busting for standing.png to force reload
      const cacheBuster = file === 'standing.png' ? `?v=${Date.now()}` : '';
      // helmet.png is in root /public, others are in /sprites
      const path = file === 'helmet.png' ? `/${file}` : `/sprites/${file}${cacheBuster}`;
      img.src = path;
      spritesRef.current[file] = img;
    });

    // Timeout fallback - only if sprites haven't loaded
    const timeout = setTimeout(() => {
      if (loadedCount < spriteFiles.length) {
        console.warn('Sprite loading timeout, proceeding anyway');
        setSpritesLoaded(true);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, []);

  // Draw player sprite using loaded images
  const drawPlayerSprite = (ctx: CanvasRenderingContext2D, x: number, y: number, frame: string, facingLeft: boolean) => {
    if (!spritesLoaded) {
      // Fallback while loading
      ctx.fillStyle = '#FF6B6B';
      ctx.fillRect(x, y, 16, 16);
      return;
    }

    ctx.save();
    
    // Determine which sprite to use
    let spriteKey = 'standing.png';
    if (frame === 'idle') {
      spriteKey = 'standing.png';
    } else if (frame === 'walk1') {
      spriteKey = 'step1.PNG';
    } else if (frame === 'walk2') {
      spriteKey = 'step2.PNG';
    } else if (frame === 'walk3') {
      spriteKey = 'step3.PNG';
    } else if (frame === 'walk4') {
      spriteKey = 'step4.PNG';
    } else if (frame === 'jump1') {
      spriteKey = 'jump1.PNG';
    } else if (frame === 'jump2') {
      spriteKey = 'jump2.PNG';
    } else if (frame === 'jump3') {
      spriteKey = 'jump3.PNG';
    } else if (frame === 'crouch') {
      spriteKey = 'jumpfall.png';
    }

    const sprite = spritesRef.current[spriteKey];
    
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      // Get actual sprite dimensions
      const spriteWidth = sprite.naturalWidth;
      const spriteHeight = sprite.naturalHeight;
      
      // Draw the actual sprite scaled to 16x16
      if (facingLeft) {
        ctx.translate(x + 16, y);
        ctx.scale(-1, 1);
        ctx.drawImage(sprite, 0, 0, spriteWidth, spriteHeight, 0, 0, 16, 16);
      } else {
        ctx.drawImage(sprite, 0, 0, spriteWidth, spriteHeight, x, y, 16, 16);
      }
    } else {
      // Fallback: draw a simple colored rectangle
      ctx.fillStyle = '#FF6B6B';
      ctx.fillRect(x, y, 16, 16);
      ctx.fillStyle = '#FFD4A3';
      ctx.fillRect(x + 4, y + 2, 8, 6);
      ctx.fillStyle = '#2C3E50';
      ctx.fillRect(x + 5, y + 12, 6, 4);
    }

    ctx.restore();
  };

  // Load stage function
  const loadStage = (stageNum: number) => {
    const state = gameStateRef.current;
    const stageData = generateStage(stageNum);
    
    state.platforms = stageData.platforms;
    state.coins = stageData.coins;
    state.enemies = stageData.enemies;
    state.stageWidth = stageData.width;
    state.goalX = stageData.goalX;
    state.currentStage = stageNum;
    state.coinsCollectedThisStage = 0;
    state.totalCoinsThisStage = stageData.coins.length;
    state.celebrating = false;
    state.celebrationTimer = 0;
    
    // Spawn portal randomly (100% chance for testing - change back to 0.3 later)
    if (Math.random() < 1.0) {
      const portalX = 200 + Math.random() * (stageData.width - 400);
      const portalY = 90; // Above ground level
      state.portal = { x: portalX, y: portalY, animationFrame: 0, active: true };
    } else {
      state.portal = null;
    }
    
    // Spawn water gun power-up in hard-to-reach areas (stages 3-9)
    if (stageNum >= 3 && stageNum <= 9) {
      // Find a high platform (hard to reach)
      const highPlatforms = state.platforms.filter(p => 
        p.type === 'brick' && p.y < 80 && p.x > 300 && p.x < stageData.width - 300
      );
      
      if (highPlatforms.length > 0) {
        const randomPlatform = highPlatforms[Math.floor(Math.random() * highPlatforms.length)];
        state.waterGun = {
          x: randomPlatform.x + 4,
          y: randomPlatform.y - 12,
          collected: false
        };
      } else {
        state.waterGun = null;
      }
    } else {
      state.waterGun = null;
    }
    
    // Spawn boss for stage 10
    if (stageNum === 10) {
      state.boss = {
        x: stageData.width - 300,
        y: 80,
        health: 10,
        maxHealth: 10,
        direction: -1,
        state: 'idle',
        attackTimer: 0,
        moveTimer: 0,
        invulnerable: false,
        invulnerableTimer: 0
      };
    } else {
      state.boss = null;
    }
    
    // Reset water projectiles
    state.waterProjectiles = [];
    
    // Reset blackhole state
    state.inBlackhole = false;
    state.blackholeTimer = 0;
    state.blackholeFallSpeed = 0;
    state.chartBars = [];
    state.chartComplete = false;
    state.chartResult = '';
    
    // Reset player position and animation state
    state.player.x = 80;
    state.player.y = 112;
    state.player.velocityX = 0;
    state.player.velocityY = 0;
    state.player.rotation = 0;
    state.player.onGround = true;
    state.player.currentAnimation = 'idle';
    state.player.animationFrame = 0;
    state.player.animationTimer = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.camera.x = 0;
    state.camera.targetX = 0;
  };

  // Initialize game
  useEffect(() => {
    loadStage(currentStage);
    // Stage data loaded by loadStage function
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    let lastTime = performance.now();
    let animationId: number;

    const gameLoop = (currentTime: number) => {
      const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      update(deltaTime);
      render(ctx);

      animationId = requestAnimationFrame(gameLoop);
    };

    const update = (dt: number) => {
      const state = gameStateRef.current;
      const player = state.player;

      // Auto-start music on first user interaction
      if (!musicStartedRef.current && bgMusicRef.current && audioEnabled) {
        const anyKeyPressed = Object.values(state.keys).some(pressed => pressed);
        if (anyKeyPressed) {
          bgMusicRef.current.play().catch(() => {});
          musicStartedRef.current = true;
        }
      }

      // Update coyote time
      if (player.onGround) {
        state.coyoteTime = COYOTE_TIME;
      } else {
        state.coyoteTime = Math.max(0, state.coyoteTime - dt);
      }

      // Update jump buffer
      if (state.jumpBuffer > 0) {
        state.jumpBuffer = Math.max(0, state.jumpBuffer - dt);
      }

      // Horizontal movement with acceleration
      let inputAxis = 0;
      const rightPressed = state.keys['ArrowRight'] || state.keys['d'] || state.keys['D'];
      const leftPressed = state.keys['ArrowLeft'] || state.keys['a'] || state.keys['A'];
      
      if (rightPressed && !leftPressed) {
        inputAxis = 1;
      } else if (leftPressed && !rightPressed) {
        inputAxis = -1;
      }
      

      if (inputAxis !== 0) {
        const targetVelocity = inputAxis * PLAYER_SPEED;
        const accelAmount = (player.onGround ? PLAYER_ACCEL : PLAYER_ACCEL * 0.65) * dt;
        const velocityChange = Math.sign(targetVelocity - player.velocityX) * Math.min(Math.abs(targetVelocity - player.velocityX), accelAmount);
        player.velocityX += velocityChange;
        player.facingLeft = inputAxis < 0;
        
      } else {
        // Apply friction (stronger on ground, lighter in air)
        const frictionAmount = (player.onGround ? PLAYER_FRICTION : AIR_FRICTION) * dt;
        player.velocityX -= Math.sign(player.velocityX) * Math.min(Math.abs(player.velocityX), frictionAmount);
        // Stop at same threshold as idle animation detection
        if (Math.abs(player.velocityX) < 0.5) player.velocityX = 0;
      }

      // Apply gravity with terminal velocity
      if (!player.onGround) {
        player.velocityY += GRAVITY * dt;
        player.velocityY = Math.min(player.velocityY, MAX_FALL_SPEED);
      }

      // Jump with coyote time and buffer
      if (state.jumpBuffer > 0 && state.coyoteTime > 0) {
        player.velocityY = JUMP_VELOCITY;
        state.jumpBuffer = 0;
        state.coyoteTime = 0;
        player.landingTimer = 0;
        playSound('jump');
        
        // Spawn jump particles - enhanced burst effect
        for (let i = 0; i < 18; i++) {
          const angle = Math.PI * (0.3 + Math.random() * 0.4); // Upward burst
          const speed = 50 + Math.random() * 70;
          state.particles.push({
            x: player.x + 8 + (Math.random() - 0.5) * 10,
            y: player.y + 16,
            vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
            vy: -Math.sin(angle) * speed - 40,
            life: 0.6 + Math.random() * 0.2,
            maxLife: 0.6 + Math.random() * 0.2,
            color: i % 5 === 0 ? '#FFD700' : i % 5 === 1 ? '#FFA500' : i % 5 === 2 ? '#FF6347' : i % 5 === 3 ? '#D2691E' : '#CD853F',
          });
        }
      }

      // Variable jump height - release jump key to stop rising
      const jumpKeyPressed = state.keys['ArrowUp'] || state.keys['w'] || state.keys['W'] || 
                            state.keys[' '] || state.keys['z'] || state.keys['Z'];
      if (!jumpKeyPressed && player.velocityY < 0) {
        player.velocityY *= 0.5;
      }

      // Move player
      const oldX = player.x;
      const oldY = player.y;
      player.x += player.velocityX * dt;
      player.y += player.velocityY * dt;
      

      // Collision detection (skip broken bricks)
      // Check if player is still on ground before resetting
      let stillOnGround = false;
      
      // Quick check if player is still touching the platform they were on
      if (player.onGround && player.velocityY >= 0) {
        for (const platform of state.platforms) {
          if (platform.broken) continue;
          // Strict check - player must be exactly on platform (within 0.5 pixels)
          if (player.x + player.width > platform.x &&
              player.x < platform.x + platform.width &&
              Math.abs(player.y + player.height - platform.y) < 0.5) {
            stillOnGround = true;
            break;
          }
        }
      }
      
      // Reset onGround if not standing on anything
      if (!stillOnGround) {
        player.onGround = false;
      }
      
      for (const platform of state.platforms) {
        if (platform.broken) continue; // Skip broken bricks for collision
        
        // Check if player with helmet can break brick from any angle
        if (player.hasHelmet && platform.type === 'brick' && !platform.broken) {
          if (player.x + player.width > platform.x &&
              player.x < platform.x + platform.width &&
              player.y + player.height > platform.y &&
              player.y < platform.y + platform.height) {
            // Break brick from any angle with helmet!
            platform.broken = true;
            playSound('break');
            
            // Brick break particles
            for (let i = 0; i < 20; i++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = 40 + Math.random() * 60;
              state.particles.push({
                x: platform.x + 8,
                y: platform.y + 8,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 50,
                life: 0.6,
                maxLife: 0.6,
                color: Math.random() > 0.5 ? '#FF6347' : '#FF7F50',
              });
            }
            
            // Screen shake
            state.screenShake = 0.12;
            setScore(s => s + 50);
            continue; // Skip normal collision for this brick
          }
        }
        
        // Question blocks can only be hit from below (no helmet bypass)
        
        if (player.x + player.width > platform.x &&
            player.x < platform.x + platform.width &&
            player.y + player.height > platform.y &&
            player.y < platform.y + platform.height) {
          
          // Vertical collision (landing on top or hitting bottom)
          const wasAbove = oldY + player.height <= platform.y + 1; // Strict tolerance - only 1 pixel
          const wasBelow = oldY >= platform.y + platform.height;
          
          if (player.velocityY >= 0 && wasAbove) {
            // Landing on top or standing on platform
            const landingSpeed = player.velocityY;
            // Always snap to exact position on platform
            player.y = platform.y - player.height;
            player.velocityY = 0;
            player.onGround = true;
            
            // Set landing timer for crouch animation (brief crouch on landing)
            if (landingSpeed > 50) {
              player.landingTimer = 0.15;
            }
            
            // Landing particles if falling fast - enhanced dust cloud effect
            if (landingSpeed > 100) {
              playSound('land');
              const particleCount = Math.min(25, Math.floor(landingSpeed / 12));
              for (let i = 0; i < particleCount; i++) {
                const angle = Math.PI * (0.2 + Math.random() * 0.6); // Spread upward
                const speed = 40 + Math.random() * 60;
                state.particles.push({
                  x: player.x + 8 + (Math.random() - 0.5) * 12,
                  y: player.y + 16,
                  vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
                  vy: -Math.sin(angle) * speed,
                  life: 0.6 + Math.random() * 0.3,
                  maxLife: 0.6 + Math.random() * 0.3,
                  color: i % 4 === 0 ? '#D2691E' : i % 4 === 1 ? '#A0522D' : i % 4 === 2 ? '#8B4513' : '#CD853F',
                });
              }
              // Small screen shake on hard landing
              if (landingSpeed > 250) {
                state.screenShake = 0.12;
              }
            }
          } else if (player.velocityY < 0 && wasBelow) {
            // Hitting bottom
            player.y = platform.y + platform.height;
            player.velocityY = 0;
            
            // Check if hitting brick block from below - break it (works without helmet)
            if (platform.type === 'brick' && !platform.broken) {
              platform.broken = true;
              playSound('break');
              
              // Brick break particles
              for (let i = 0; i < 20; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 40 + Math.random() * 60;
                state.particles.push({
                  x: platform.x + 8,
                  y: platform.y + 8,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed - 50,
                  life: 0.6,
                  maxLife: 0.6,
                  color: Math.random() > 0.5 ? '#FF6347' : '#FF7F50',
                });
              }
              
              // Screen shake
              state.screenShake = 0.12;
              
              // Small score bonus
              setScore(s => s + 50);
            } else {
              // Screen shake for other blocks
              state.screenShake = 0.12;
            }
            
            // Check if hitting question block from below (works without helmet)
            if (platform.type === 'question' && !platform.used) {
              platform.used = true;
              platform.bounceOffset = 8;
              playSound('powerup');
              
              // Random reward
              const reward = Math.random();
              if (reward < 0.4) {
                // Coin
                state.coins.push({
                  x: platform.x + 4,
                  y: platform.y - 16,
                  collected: false,
                  floatOffset: 0
                });
              } else if (reward < 0.7) {
                // Points
                setScore(s => s + 500);
              } else {
                // War Helmet powerup!
                player.hasHelmet = true;
                player.helmetTimer = 10;
                
                // Spawn helmet particles
                for (let j = 0; j < 20; j++) {
                  const angle = (Math.PI * 2 * j) / 20;
                  state.particles.push({
                    x: platform.x + 8,
                    y: platform.y - 8,
                    vx: Math.cos(angle) * 60,
                    vy: Math.sin(angle) * 60,
                    life: 0.8,
                    maxLife: 0.8,
                    color: '#C0C0C0',
                  });
                }
              }
            }
          }
          
          // Check if hitting question block from below
          if (platform.type === 'question' && !platform.used) {
            platform.used = true;
            playSound('powerup');
            const reward = Math.random();
            
            if (reward < 0.4) {
              // Spawn 3 coins
              for (let i = 0; i < 3; i++) {
                state.coins.push({
                  x: platform.x + 4,
                  y: platform.y - 20 - i * 8,
                  collected: false,
                  floatOffset: Math.random() * Math.PI * 2
                });
              }
              // Particle effect
              for (let i = 0; i < 15; i++) {
                const angle = (Math.PI * 2 * i) / 15;
                state.particles.push({
                  x: platform.x + 8,
                  y: platform.y,
                  vx: Math.cos(angle) * 60,
                  vy: Math.sin(angle) * 60 - 40,
                  life: 0.5,
                  maxLife: 0.5,
                  color: '#FFD700',
                });
              }
            } else if (reward < 0.7) {
              // Spawn 1 coin
              state.coins.push({
                x: platform.x + 4,
                y: platform.y - 20,
                collected: false,
                floatOffset: Math.random() * Math.PI * 2
              });
              // Particle effect
              for (let i = 0; i < 8; i++) {
                const angle = (Math.PI * 2 * i) / 8;
                state.particles.push({
                  x: platform.x + 8,
                  y: platform.y,
                  vx: Math.cos(angle) * 50,
                  vy: Math.sin(angle) * 50 - 30,
                  life: 0.4,
                  maxLife: 0.4,
                  color: '#FFA500',
                });
              }
            } else {
              // Spawn enemy (badguy)
              state.enemies.push({
                x: platform.x + 4,
                y: platform.y - 16,
                direction: Math.random() > 0.5 ? 1 : -1,
                alive: true,
                type: 'badguy',
                animFrame: 0
              });
              // Particle effect (red for danger)
              for (let i = 0; i < 12; i++) {
                const angle = (Math.PI * 2 * i) / 12;
                state.particles.push({
                  x: platform.x + 8,
                  y: platform.y,
                  vx: Math.cos(angle) * 70,
                  vy: Math.sin(angle) * 70 - 50,
                  life: 0.6,
                  maxLife: 0.6,
                  color: '#FF0000',
                });
              }
            }
            
            // Screen shake on hit
            state.screenShake = 0.1;
          }
          
          // Horizontal collision (hitting sides) with 1-pixel spacing
          const wasOnLeft = oldX + player.width <= platform.x;
          const wasOnRight = oldX >= platform.x + platform.width;
          
          if (player.velocityX > 0 && wasOnLeft) {
            player.x = platform.x - player.width - 1; // Add 1-pixel gap
            player.velocityX = 0;
          } else if (player.velocityX < 0 && wasOnRight) {
            player.x = platform.x + platform.width + 1; // Add 1-pixel gap
            player.velocityX = 0;
          }
        }
      }

      // ========== SIMPLE ANIMATION SYSTEM - REWRITTEN ==========
      // Update rotation for flip effect during jump
      if (!player.onGround && player.velocityY < 0) {
        // Rotate during jump - direction matches facing direction
        const rotationSpeed = player.facingLeft ? -720 : 720;
        player.rotation += dt * rotationSpeed;
        // Cap rotation at 360 degrees
        if (Math.abs(player.rotation) > 360) {
          player.rotation = player.facingLeft ? -360 : 360;
        }
      } else {
        // Reset rotation when on ground
        player.rotation = 0;
      }
      
      // Update helmet timer
      if (player.hasHelmet) {
        player.helmetTimer -= dt;
        if (player.helmetTimer <= 0) {
          player.hasHelmet = false;
          player.helmetTimer = 0;
        }
      }
      
      // Update water gun timer
      if (player.hasWaterGun) {
        player.waterGunTimer -= dt;
        if (player.waterGunTimer <= 0) {
          player.hasWaterGun = false;
          player.waterGunTimer = 0;
        }
      }
      
      // Update shoot cooldown
      if (player.shootCooldown > 0) {
        player.shootCooldown -= dt;
      }
      
      // Shoot water gun with X key
      if (player.hasWaterGun && player.shootCooldown <= 0) {
        const shootKey = state.keys['x'] || state.keys['X'];
        if (shootKey) {
          player.shootCooldown = 0.3; // 3 shots per second
          const direction = player.facingLeft ? -1 : 1;
          state.waterProjectiles.push({
            x: player.x + (direction > 0 ? 16 : 0),
            y: player.y + 6,
            vx: direction * 250,
            vy: 0,
            life: 1.5
          });
          playSound('jump'); // Water shoot sound
          
          // Spawn water particles
          for (let i = 0; i < 5; i++) {
            state.particles.push({
              x: player.x + (direction > 0 ? 16 : 0),
              y: player.y + 6,
              vx: direction * (200 + Math.random() * 50),
              vy: (Math.random() - 0.5) * 30,
              life: 0.3,
              maxLife: 0.3,
              color: '#00BFFF'
            });
          }
        }
      }
      
      // Update landing timer
      if (player.landingTimer > 0) {
        player.landingTimer -= dt;
      }
      
      // Simple animation logic
      if (!player.onGround) {
        // JUMPING or FALLING
        if (player.velocityY > 100) {
          // Falling fast - show crouch sprite (preparing to land)
          player.currentAnimation = 'crouch';
          player.animationFrame = 0;
          player.animationTimer = 0;
        } else {
          // Rising or slow fall - show jump animation
          player.currentAnimation = 'jump';
          player.animationFrame = 0;
          player.animationTimer = 0;
        }
      } else if (player.landingTimer > 0) {
        // Just landed - show crouch sprite briefly
        player.currentAnimation = 'crouch';
        player.animationFrame = 0;
        player.animationTimer = 0;
      } else if (Math.abs(player.velocityX) < 0.1) {
        // IDLE - standing still
        player.currentAnimation = 'idle';
        player.animationFrame = 0;
        player.animationTimer = 0;
      } else {
        // WALKING
        if (player.currentAnimation !== 'walk') {
          player.currentAnimation = 'walk';
          player.animationFrame = 0;
          player.animationTimer = 0;
        }
        
        player.animationTimer += dt;
        if (player.animationTimer > 0.15) {
          player.animationFrame = (player.animationFrame + 1) % 4;
          player.animationTimer = 0;
        }
      }

      // Update portal animation
      if (state.portal && state.portal.active) {
        state.portal.animationFrame += dt * 8;
        
        // Check collision with player
        if (Math.abs(player.x - state.portal.x) < 16 && Math.abs(player.y - state.portal.y) < 16) {
          // Enter blackhole mini-game
          state.inBlackhole = true;
          state.blackholeTimer = 0;
          state.blackholeFallSpeed = 20;
          state.chartBars = [];
          state.chartComplete = false;
          state.chartResult = '';
          state.portal.active = false;
          playSound('powerup');
        }
      }
      
      // Update blackhole mini-game
      if (state.inBlackhole) {
        state.blackholeTimer += dt;
        state.blackholeFallSpeed += dt * 30; // Accelerate fall
        
        // Build chart bars over time (5 bars total, one every 0.8 seconds)
        const barInterval = 0.8;
        const currentBarCount = Math.floor(state.blackholeTimer / barInterval);
        
        if (currentBarCount > state.chartBars.length && state.chartBars.length < 5) {
          // Add new bar with random height
          const height = 20 + Math.random() * 40; // 20-60 pixels
          const isLastBar = state.chartBars.length === 4;
          
          // Last bar determines outcome
          if (isLastBar) {
            const isGreen = height > 40; // >50% of max height
            state.chartBars.push({ height, color: isGreen ? 'green' : 'red' });
            state.chartResult = isGreen ? 'green' : 'red';
            state.chartComplete = true;
          } else {
            // Random color for non-final bars
            const color = Math.random() > 0.5 ? 'green' : 'red';
            state.chartBars.push({ height, color });
          }
        }
        
        // After chart completes, wait 2 seconds then apply result
        if (state.chartComplete && state.blackholeTimer > 5) {
          if (state.chartResult === 'red') {
            // Restart from stage 1
            setCurrentStage(1);
            loadStage(1);
          } else {
            // Continue current stage
            state.inBlackhole = false;
            state.blackholeTimer = 0;
            state.blackholeFallSpeed = 0;
          }
        }
      }
      
      // Update coins
      state.coins.forEach((coin, i) => {
        if (!coin.collected) {
          coin.floatOffset += dt * 2;
          
          // Check collision with player
          if (Math.abs(player.x - coin.x) < 12 && Math.abs(player.y - coin.y) < 12) {
            coin.collected = true;
            state.coinsCollectedThisStage++;
            playSound('coin');
            state.combo++;
            state.comboTimer = 3.5; // Longer combo window
            const comboBonus = state.combo > 1 ? state.combo * 50 : 0;
            setScore(s => s + 100 + comboBonus);
            
            // Spawn enhanced coin particles with combo effect
            const particleCount = 12 + (state.combo > 1 ? state.combo * 2 : 0);
            for (let j = 0; j < particleCount; j++) {
              const angle = (Math.PI * 2 * j) / particleCount;
              const speed = 80 + (state.combo > 1 ? state.combo * 10 : 0);
              state.particles.push({
                x: coin.x + 4,
                y: coin.y + 4,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 30,
                life: 0.6,
                maxLife: 0.6,
                color: j % 3 === 0 ? '#FFD700' : j % 3 === 1 ? '#FFA500' : '#FFFF00',
              });
            }
          }
        }
      });

      // Check water gun collection
      if (state.waterGun && !state.waterGun.collected) {
        if (Math.abs(player.x - state.waterGun.x) < 12 && Math.abs(player.y - state.waterGun.y) < 12) {
          state.waterGun.collected = true;
          player.hasWaterGun = true;
          player.waterGunTimer = 15; // 15 seconds of water gun
          playSound('coin');
          setScore(s => s + 500);
          
          // Spawn power-up particles
          for (let j = 0; j < 20; j++) {
            const angle = (Math.PI * 2 * j) / 20;
            state.particles.push({
              x: state.waterGun.x + 4,
              y: state.waterGun.y + 6,
              vx: Math.cos(angle) * 100,
              vy: Math.sin(angle) * 100 - 40,
              life: 0.8,
              maxLife: 0.8,
              color: j % 3 === 0 ? '#00BFFF' : j % 3 === 1 ? '#1E90FF' : '#87CEEB',
            });
          }
        }
      }
      
      // Update water projectiles
      state.waterProjectiles = state.waterProjectiles.filter(proj => {
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;
        proj.life -= dt;
        
        // Check collision with enemies
        state.enemies.forEach(enemy => {
          if (enemy.alive && Math.abs(proj.x - enemy.x) < 12 && Math.abs(proj.y - enemy.y) < 12) {
            enemy.alive = false;
            proj.life = 0;
            playSound('stomp');
            state.combo++;
            state.comboTimer = 3.5;
            const comboBonus = state.combo > 1 ? state.combo * 100 : 0;
            setScore(s => s + 200 + comboBonus);
            
            // Spawn water splash particles
            for (let j = 0; j < 15; j++) {
              const angle = (Math.PI * 2 * j) / 15;
              state.particles.push({
                x: enemy.x + 6,
                y: enemy.y + 6,
                vx: Math.cos(angle) * 90,
                vy: Math.sin(angle) * 90 - 40,
                life: 0.7,
                maxLife: 0.7,
                color: j % 2 === 0 ? '#00BFFF' : '#1E90FF',
              });
            }
          }
        });
        
        return proj.life > 0;
      });
      
      // Update enemies
      state.enemies.forEach(enemy => {
        if (!enemy.alive) return;
        
        const oldEnemyX = enemy.x;
        const oldEnemyY = enemy.y;
        
        // Apply gravity to all enemies including snakes
        if (!('velocityY' in enemy)) {
          (enemy as any).velocityY = 0;
        }
        // Apply gravity
        (enemy as any).velocityY += GRAVITY * dt;
        (enemy as any).velocityY = Math.min((enemy as any).velocityY, MAX_FALL_SPEED);
        enemy.y += (enemy as any).velocityY * dt;
        
        // Different movement for snake vs others
        if (enemy.type === 'snake') {
          // Enhanced snake slithering on ground with occasional hops
          enemy.waveOffset = (enemy.waveOffset || 0) + dt * 6;
          
          // Variable speed based on wave motion (faster at wave peaks)
          const waveMotion = Math.sin(enemy.waveOffset);
          const speedMultiplier = 1 + Math.abs(waveMotion) * 0.3;
          const speed = 45 * speedMultiplier;
          enemy.x += enemy.direction * speed * dt;
          
          // Initialize hop timer if not present
          if (!('hopTimer' in enemy)) {
            (enemy as any).hopTimer = Math.random() * 3;
          }
          
          // Occasional small hops while slithering
          (enemy as any).hopTimer -= dt;
          if ((enemy as any).hopTimer <= 0 && Math.abs((enemy as any).velocityY) < 10) {
            // Small hop
            (enemy as any).velocityY = -120;
            (enemy as any).hopTimer = 2 + Math.random() * 2; // Hop every 2-4 seconds
          }
        } else {
          // Goomba and badguy move normally
          enemy.x += enemy.direction * 30 * dt;
        }
        
        // Check for ground collision (enemies land on platforms)
        let onPlatform = false;
        for (const platform of state.platforms) {
          if (enemy.x + 12 > platform.x && enemy.x < platform.x + platform.width) {
            // Check if enemy is falling onto platform from above
            if ((enemy as any).velocityY >= 0 && oldEnemyY + 12 <= platform.y + 1 && enemy.y + 12 >= platform.y) {
              enemy.y = platform.y - 12;
              (enemy as any).velocityY = 0;
              onPlatform = true;
              
              // Add slight horizontal wave motion for snakes on ground
              if (enemy.type === 'snake' && enemy.waveOffset !== undefined) {
                const groundWave = Math.sin(enemy.waveOffset) * 0.5;
                enemy.x += groundWave;
              }
              break;
            }
            // Check if already on platform (strict tolerance)
            if (Math.abs(enemy.y + 12 - platform.y) < 0.5) {
              onPlatform = true;
              enemy.y = platform.y - 12; // Snap to exact position
              
              // Add slight horizontal wave motion for snakes on ground
              if (enemy.type === 'snake' && enemy.waveOffset !== undefined) {
                const groundWave = Math.sin(enemy.waveOffset) * 0.5;
                enemy.x += groundWave;
              }
              break;
            }
          }
        }
        
        // Check for walls/obstacles ahead
        const hitWall = state.platforms.some(p => {
          if (p.type === 'ground') return false; // Don't check ground
          const enemyRight = enemy.x + 12;
          const enemyLeft = enemy.x;
          const enemyTop = enemy.y;
          const enemyBottom = enemy.y + 12;
          
          // Check if enemy is colliding with a vertical obstacle
          return enemyBottom > p.y && enemyTop < p.y + p.height &&
                 ((enemy.direction > 0 && enemyRight > p.x && oldEnemyX + 12 <= p.x) ||
                  (enemy.direction < 0 && enemyLeft < p.x + p.width && oldEnemyX >= p.x + p.width));
        });
        
        // Turn around at edges or walls
        if (hitWall) {
          enemy.direction *= -1;
          // Push enemy away from wall slightly to prevent getting stuck
          if (enemy.direction > 0) {
            enemy.x = oldEnemyX - 2;
          } else {
            enemy.x = oldEnemyX + 2;
          }
          if (enemy.type === 'snake') enemy.y = oldEnemyY;
        }
        
        // Turn around at stage boundaries
        if (enemy.x < 0) {
          enemy.x = 0;
          enemy.direction = 1;
        } else if (enemy.x > state.stageWidth - 12) {
          enemy.x = state.stageWidth - 12;
          enemy.direction = -1;
        }
        
        // Turn around at platform edges (only if on ground and not a snake)
        if (onPlatform && !hitWall && enemy.type !== 'snake') {
          const platformAhead = state.platforms.some(p => {
            const checkX = enemy.x + (enemy.direction > 0 ? 14 : -2);
            return checkX > p.x && checkX < p.x + p.width && 
                   Math.abs(enemy.y + 12 - p.y) < 0.5;
          });
          if (!platformAhead) {
            enemy.direction *= -1;
            // Move enemy back slightly to prevent edge hanging
            enemy.x += enemy.direction * 2;
          }
        }
        
        // Check collision with player
        if (Math.abs(player.x - enemy.x) < 14 && Math.abs(player.y - enemy.y) < 14) {
          // If player has helmet, kill enemy from any angle
          if (player.hasHelmet) {
            enemy.alive = false;
            playSound('stomp');
            state.combo++;
            state.comboTimer = 3.5;
            state.screenShake = 0.18;
            const comboBonus = state.combo > 1 ? state.combo * 100 : 0;
            setScore(s => s + 200 + comboBonus);
            
            // Spawn defeat particles
            for (let j = 0; j < 12; j++) {
              const angle = (Math.PI * 2 * j) / 12;
              state.particles.push({
                x: enemy.x + 6,
                y: enemy.y + 6,
                vx: Math.cos(angle) * 90,
                vy: Math.sin(angle) * 90 - 40,
                life: 0.7,
                maxLife: 0.7,
                color: enemy.type === 'snake' ? '#00FF00' : '#8B4513',
              });
            }
            return;
          }
          
          if (player.velocityY > 0 && player.y < enemy.y - 4) {
            // Stomp enemy
            enemy.alive = false;
            playSound('stomp');
            player.velocityY = -220;
            state.combo++;
            state.comboTimer = 3.5; // Longer combo window
            state.screenShake = 0.18; // Stronger shake
            const comboBonus = state.combo > 1 ? state.combo * 100 : 0;
            setScore(s => s + 200 + comboBonus);
            
            // Spawn stomp particles
            for (let i = 0; i < 10; i++) {
              const angle = (Math.PI * 2 * i) / 10;
              state.particles.push({
                x: enemy.x + 6,
                y: enemy.y + 6,
                vx: Math.cos(angle) * 70,
                vy: Math.sin(angle) * 70 - 30,
                life: 0.4,
                maxLife: 0.4,
                color: '#FF4500',
              });
            }
          } else {
            // Player dies - respawn at starting position
            playSound('death');
            player.x = 80;
            player.y = 112;
            player.velocityX = 0;
            player.velocityY = 0;
            player.onGround = true;
            state.combo = 0;
            state.comboTimer = 0;
            setScore(0);
          }
        }
      });

      // Update combo timer
      if (state.comboTimer > 0) {
        state.comboTimer -= dt;
        if (state.comboTimer <= 0) {
          state.combo = 0;
        }
      }
      
      // Update boss (Stage 10 only)
      if (state.boss && state.boss.health > 0) {
        const boss = state.boss;
        
        // Initialize velocityY if not present
        if (!('velocityY' in boss)) {
          (boss as any).velocityY = 0;
        }
        
        // Apply gravity to boss
        (boss as any).velocityY += GRAVITY * dt;
        (boss as any).velocityY = Math.min((boss as any).velocityY, MAX_FALL_SPEED);
        boss.y += (boss as any).velocityY * dt;
        
        // Keep boss on ground with proper collision
        let bossOnGround = false;
        for (const platform of state.platforms) {
          if (boss.x + 48 > platform.x && boss.x < platform.x + platform.width) {
            if ((boss as any).velocityY >= 0 && boss.y + 48 >= platform.y && boss.y + 48 <= platform.y + 8) {
              boss.y = platform.y - 48;
              (boss as any).velocityY = 0;
              bossOnGround = true;
              break;
            }
          }
        }
        
        // Update invulnerability timer
        if (boss.invulnerable) {
          boss.invulnerableTimer -= dt;
          if (boss.invulnerableTimer <= 0) {
            boss.invulnerable = false;
          }
        }
        
        // Boss AI state machine
        if (boss.state === 'defeated') {
          // Boss is defeated, do nothing
        } else if (boss.state === 'hurt') {
          // Hurt state - brief pause with knockback
          boss.moveTimer -= dt;
          boss.x += -boss.direction * 15 * dt; // Knockback
          if (boss.moveTimer <= 0) {
            boss.state = 'walking';
            boss.moveTimer = 2 + Math.random() * 2;
          }
        } else if (boss.state === 'attacking') {
          // Attack animation
          boss.attackTimer -= dt;
          if (boss.attackTimer <= 0) {
            boss.state = 'walking';
            boss.moveTimer = 1.5 + Math.random() * 1.5;
          }
        } else {
          // Walking/Idle state
          boss.moveTimer -= dt;
          
          // Move towards player with acceleration
          const distToPlayer = player.x - boss.x;
          if (Math.abs(distToPlayer) > 100) {
            boss.direction = distToPlayer > 0 ? 1 : -1;
            // Variable speed based on distance
            const speed = Math.min(35, 20 + Math.abs(distToPlayer) * 0.05);
            boss.x += boss.direction * speed * dt;
            boss.state = 'walking';
            
            // Boss can jump over obstacles
            if (bossOnGround && Math.random() < 0.02) {
              (boss as any).velocityY = -200;
            }
          } else {
            boss.state = 'idle';
          }
          
          // Attack if close to player
          if (Math.abs(distToPlayer) < 100 && boss.moveTimer <= 0) {
            boss.state = 'attacking';
            boss.attackTimer = 0.8;
            boss.moveTimer = 2;
            
            // Create rock projectile attack with spread
            const rockSpeed = 180;
            const rockDir = boss.direction;
            for (let i = 0; i < 5; i++) {
              const spreadAngle = (i - 2) * 0.15;
              const vx = Math.cos(spreadAngle) * rockSpeed * rockDir;
              const vy = Math.sin(spreadAngle) * rockSpeed - 80;
              state.particles.push({
                x: boss.x + 24,
                y: boss.y + 20,
                vx: vx,
                vy: vy,
                life: 2.5,
                maxLife: 2.5,
                color: '#8B7355',
              });
            }
            playSound('break');
          }
        }
        
        // Boss collision with player - STRICT HEAD HITBOX
        const bossHeadX = boss.x + 16; // Center of head
        const bossHeadY = boss.y;
        const bossHeadWidth = 16; // Small precise hitbox
        const bossHeadHeight = 12;
        
        // Check if player is in boss area
        if (Math.abs(player.x - boss.x) < 48 && Math.abs(player.y - boss.y) < 52) {
          // STRICT head hit detection - must hit center of head
          if (player.velocityY > 50 && 
              player.y + player.height >= bossHeadY && 
              player.y + player.height <= bossHeadY + bossHeadHeight &&
              player.x + player.width > bossHeadX && 
              player.x < bossHeadX + bossHeadWidth &&
              !boss.invulnerable) {
            // Perfect head hit!
            boss.health -= 1;
            boss.invulnerable = true;
            boss.invulnerableTimer = 1.5;
            boss.state = 'hurt';
            boss.moveTimer = 0.6;
            
            player.velocityY = -280; // Strong bounce
            playSound('stomp');
            state.screenShake = 0.3;
            setScore(s => s + 500);
            
            // Hit particles
            for (let i = 0; i < 25; i++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = 70 + Math.random() * 90;
              state.particles.push({
                x: boss.x + 24,
                y: boss.y + 8,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 100,
                life: 1.0,
                maxLife: 1.0,
                color: ['#8B7355', '#A0826D', '#654321', '#FFD700'][i % 4],
              });
            }
            
            // Check if boss defeated
            if (boss.health <= 0) {
              boss.state = 'defeated';
              playSound('celebration');
              state.screenShake = 0.6;
              setScore(s => s + 5000);
              
              // Massive explosion particles
              for (let i = 0; i < 150; i++) {
                const angle = (Math.PI * 2 * i) / 150;
                const speed = 120 + Math.random() * 180;
                state.particles.push({
                  x: boss.x + 24,
                  y: boss.y + 24,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed - 120,
                  life: 2.0,
                  maxLife: 2.0,
                  color: ['#8B7355', '#654321', '#A0826D', '#FFD700', '#FF4500'][i % 5],
                });
              }
            }
          } else if (player.y + player.height > boss.y + 12 && player.velocityY >= 0) {
            // Missed the head - hit body instead - RESET PLAYER
            if (!player.hasHelmet) {
              player.x = 80;
              player.y = 112;
              player.velocityX = 0;
              player.velocityY = 0;
              player.onGround = true;
              playSound('death');
              state.screenShake = 0.4;
              
              // Show miss particles
              for (let i = 0; i < 10; i++) {
                state.particles.push({
                  x: player.x + 8,
                  y: player.y + 8,
                  vx: (Math.random() - 0.5) * 100,
                  vy: -50 - Math.random() * 50,
                  life: 0.5,
                  maxLife: 0.5,
                  color: '#FF0000',
                });
              }
            }
          } else if (boss.state === 'attacking' && !player.hasHelmet) {
            // Boss attack hits player
            player.x = 80;
            player.y = 112;
            player.velocityX = 0;
            player.velocityY = 0;
            player.onGround = true;
            playSound('death');
            state.screenShake = 0.4;
          }
        }
        
        // Rock projectile collision with player
        state.particles.forEach(p => {
          if (p.color === '#8B7355' && p.life > 0) {
            if (Math.abs(player.x - p.x) < 12 && Math.abs(player.y - p.y) < 12) {
              if (!player.hasHelmet) {
                player.x = 80;
                player.y = 112;
                player.velocityX = 0;
                player.velocityY = 0;
                player.onGround = true;
                playSound('death');
                state.screenShake = 0.3;
                p.life = 0; // Remove projectile
              }
            }
          }
        });
      }
      
      // Update screen shake
      if (state.screenShake > 0) {
        state.screenShake = Math.max(0, state.screenShake - dt);
      }

      // Update particles
      state.particles = state.particles.filter(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 200 * dt; // Gravity
        p.life -= dt;
        return p.life > 0;
      });

      // Check if player reached goal
      if (player.x >= state.goalX - 20 && player.onGround && !state.celebrating) {
        // Stage complete!
        state.celebrating = true;
        state.celebrationTimer = 2.5; // 2.5 seconds celebration
        playSound('celebration');
        
        // Spawn celebration particles
        for (let i = 0; i < 50; i++) {
          const angle = (Math.PI * 2 * i) / 50;
          const speed = 80 + Math.random() * 100;
          state.particles.push({
            x: state.goalX,
            y: 100,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 100,
            life: 1.5,
            maxLife: 1.5,
            color: ['#FFD700', '#FF69B4', '#00FF00', '#00FFFF', '#FF1493', '#FFA500'][i % 6],
          });
        }
      }
      
      // Handle celebration timer
      if (state.celebrating) {
        state.celebrationTimer -= dt;
        if (state.celebrationTimer <= 0) {
          state.celebrating = false;
          if (state.currentStage < 10) {
            const nextStage = state.currentStage + 1;
            setCurrentStage(nextStage);
            loadStage(nextStage);
          }
        }
      }

      // Smooth camera follow with lookahead and screen shake - optimized and pixel perfect
      const lookahead = player.velocityX * 0.15; // Camera looks ahead in movement direction
      state.camera.targetX = Math.max(0, Math.min(player.x + lookahead - GAME_WIDTH / 2, state.stageWidth - GAME_WIDTH));
      // Adaptive camera speed based on distance and player state
      const distance = Math.abs(state.camera.targetX - state.camera.x);
      const baseSpeed = player.onGround ? 12 : 9; // Faster camera when on ground
      const cameraSpeed = baseSpeed + Math.min(distance * 0.02, 5); // Speed up when far from target
      state.camera.x += (state.camera.targetX - state.camera.x) * cameraSpeed * dt;
      // Floor camera position for pixel-perfect rendering
      state.camera.x = Math.floor(state.camera.x);
      
      // Apply screen shake
      if (state.screenShake > 0) {
        const shakeAmount = state.screenShake * 4;
        state.camera.y = (Math.random() - 0.5) * shakeAmount;
      } else {
        state.camera.y = 0;
      }

      // Death check (fell off stage into pit/gap)
      if (player.y > 200) {
        // Play death sound
        playSound('death');
        
        // Create death particles
        for (let i = 0; i < 30; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 40 + Math.random() * 80;
          state.particles.push({
            x: player.x + 8,
            y: 200,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 100,
            life: 1.0,
            maxLife: 1.0,
            color: ['#FF0000', '#FF4500', '#FF6347', '#8B0000'][i % 4],
          });
        }
        
        // Reset player position
        player.x = 80;
        player.y = 112;
        player.velocityX = 0;
        player.velocityY = 0;
        player.onGround = true;
        player.rotation = 0;
        player.hasHelmet = false;
        player.helmetTimer = 0;
        state.combo = 0;
        state.comboTimer = 0;
        
        // Reset score on death
        setScore(0);
      }
    };

    const render = (ctx: CanvasRenderingContext2D) => {
      const state = gameStateRef.current;
      
      // Clear canvas with beautiful gradient sky
      const skyGradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
      skyGradient.addColorStop(0, '#5DADE2');
      skyGradient.addColorStop(0.4, '#85C1E9');
      skyGradient.addColorStop(0.7, '#AED6F1');
      skyGradient.addColorStop(1, '#D6EAF8');
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      ctx.save();
      // Apply camera transform with shake - pixel perfect
      const shakeX = state.screenShake > 0 ? Math.floor((Math.random() - 0.5) * state.screenShake * 3) : 0;
      ctx.translate(Math.floor(-state.camera.x + shakeX), Math.floor(-state.camera.y));

      // Draw clouds (far background) - enhanced with more detail
      for (let i = 0; i < 18; i++) {
        const x = Math.floor(i * 85 + 15 - state.camera.x * 0.12);
        const y = Math.floor(12 + (i % 4) * 10);
        
        // Cloud base shape
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x, y + 4, 16, 8);
        ctx.fillRect(x + 4, y, 8, 4);
        ctx.fillRect(x + 12, y + 2, 8, 6);
        ctx.fillRect(x - 4, y + 6, 4, 4);
        
        // Cloud highlights for depth
        ctx.fillStyle = '#F0F8FF';
        ctx.fillRect(x + 1, y + 5, 6, 3);
        ctx.fillRect(x + 5, y + 1, 4, 2);
        
        // Soft shadows
        ctx.fillStyle = '#E6F2FF';
        ctx.fillRect(x + 10, y + 8, 4, 2);
        ctx.fillRect(x + 2, y + 10, 8, 1);
        
        // Black outline
        ctx.fillStyle = '#000000';
        ctx.fillRect(x - 5, y + 6, 1, 4);
        ctx.fillRect(x - 1, y + 4, 1, 8);
        ctx.fillRect(x + 16, y + 4, 1, 8);
        ctx.fillRect(x + 20, y + 2, 1, 6);
        ctx.fillRect(x - 4, y + 5, 4, 1);
        ctx.fillRect(x - 4, y + 10, 4, 1);
        ctx.fillRect(x, y + 3, 16, 1);
        ctx.fillRect(x, y + 12, 16, 1);
        ctx.fillRect(x + 4, y - 1, 8, 1);
        ctx.fillRect(x + 4, y + 4, 8, 1);
        ctx.fillRect(x + 12, y + 1, 8, 1);
        ctx.fillRect(x + 12, y + 8, 8, 1);
      }

      // Draw parallax mountains (background) - extend to bottom of screen
      for (let i = 0; i < 14; i++) {
        const x = Math.floor(i * 105 + 45 - state.camera.x * 0.22);
        const mountainHeight = 160 - 74; // From peak to bottom of canvas
        
        // Mountain body - extends to bottom
        ctx.fillStyle = '#6B7280';
        ctx.fillRect(x - 16, 90, 32, 70); // Extended to bottom (160)
        ctx.fillRect(x - 12, 82, 24, 8);
        ctx.fillRect(x - 8, 74, 16, 8);
        
        // Snow cap
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x - 6, 74, 12, 4);
        
        // Black outline (no bottom outline since it extends off screen)
        ctx.fillStyle = '#000000';
        ctx.fillRect(x - 17, 90, 1, 70);
        ctx.fillRect(x + 16, 90, 1, 70);
        ctx.fillRect(x - 13, 82, 1, 8);
        ctx.fillRect(x + 12, 82, 1, 8);
        ctx.fillRect(x - 9, 74, 1, 8);
        ctx.fillRect(x + 8, 74, 1, 8);
      }

      // Draw parallax hills - extend to bottom of screen
      for (let i = 0; i < 24; i++) {
        const x = Math.floor(i * 65 + 30 - state.camera.x * 0.4);
        
        // Hill body - extends to bottom
        ctx.fillStyle = '#22C55E';
        ctx.fillRect(x - 16, 110, 32, 50); // Extended to bottom (160)
        ctx.fillRect(x - 12, 106, 24, 4);
        
        // Black outline (no bottom outline since it extends off screen)
        ctx.fillStyle = '#000000';
        ctx.fillRect(x - 17, 110, 1, 50);
        ctx.fillRect(x + 16, 110, 1, 50);
        ctx.fillRect(x - 13, 106, 1, 4);
        ctx.fillRect(x + 12, 106, 1, 4);
      }

      // Draw bushes (foreground decoration) - extend to bottom like mountains
      for (let i = 0; i < 28; i++) {
        const x = Math.floor(i * 52 + 8 - state.camera.x * 0.75);
        const y = 120;
        const bushType = i % 3;
        
        // Bush base - extends to bottom of screen (y=160)
        ctx.fillStyle = '#10B981';
        ctx.fillRect(x, y, 12, 40); // Extended to bottom (160)
        ctx.fillRect(x + 2, y - 2, 8, 2); // Top rounded part
        
        // Add variety to bushes
        if (bushType === 0) {
          ctx.fillRect(x - 2, y + 2, 2, 38); // Extended side bulges to bottom
          ctx.fillRect(x + 12, y + 2, 2, 38);
        } else if (bushType === 1) {
          ctx.fillRect(x + 4, y - 4, 4, 2);
        }
        
        // Highlights for depth
        ctx.fillStyle = '#34D399';
        ctx.fillRect(x + 1, y + 1, 4, 2);
        ctx.fillRect(x + 3, y - 1, 3, 1);
        
        // Dark spots for texture
        ctx.fillStyle = '#059669';
        ctx.fillRect(x + 7, y + 4, 2, 2);
        ctx.fillRect(x + 3, y + 5, 1, 1);
        
        // Black outline (no bottom outline - extends off screen)
        ctx.fillStyle = '#000000';
        ctx.fillRect(x - 1, y, 1, 40);
        ctx.fillRect(x + 12, y, 1, 40);
        ctx.fillRect(x, y - 1, 12, 1);
        ctx.fillRect(x + 1, y - 2, 1, 2);
        ctx.fillRect(x + 10, y - 2, 1, 2);
        ctx.fillRect(x + 2, y - 3, 8, 1);
        
        if (bushType === 0) {
          ctx.fillRect(x - 3, y + 2, 1, 4);
          ctx.fillRect(x + 14, y + 2, 1, 4);
          ctx.fillRect(x - 2, y + 1, 2, 1);
          ctx.fillRect(x - 2, y + 6, 2, 1);
          ctx.fillRect(x + 12, y + 1, 2, 1);
          ctx.fillRect(x + 12, y + 6, 2, 1);
        } else if (bushType === 1) {
          ctx.fillRect(x + 3, y - 4, 1, 2);
          ctx.fillRect(x + 8, y - 4, 1, 2);
          ctx.fillRect(x + 4, y - 5, 4, 1);
        }
      }

      // Draw platforms (skip broken bricks)
      state.platforms.forEach(platform => {
        if (platform.broken) return; // Don't draw broken bricks
        
        if (platform.type === 'ground') {
          // Enhanced ground tile with rich texture and depth
          // Black outline
          ctx.fillStyle = '#000000';
          ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
          
          // Base brown layer
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(platform.x + 1, platform.y + 1, platform.width - 2, platform.height - 2);
          
          // Top soil layer with gradient effect
          ctx.fillStyle = '#D2691E';
          ctx.fillRect(platform.x + 1, platform.y + 1, platform.width - 2, 4);
          
          // Middle dirt layer
          ctx.fillStyle = '#A0522D';
          ctx.fillRect(platform.x + 1, platform.y + 5, platform.width - 2, platform.height - 6);
          
          // Texture details - dirt spots
          ctx.fillStyle = '#8B4513';
          for (let i = 0; i < Math.floor(platform.width / 5); i++) {
            ctx.fillRect(platform.x + 2 + i * 5, platform.y + 3, 2, 2);
            ctx.fillRect(platform.x + 3 + i * 5, platform.y + 7, 1, 1);
          }
          
          // Highlight on top edge
          ctx.fillStyle = '#CD853F';
          ctx.fillRect(platform.x + 1, platform.y + 1, platform.width - 2, 1);
          
          // Dark spots for depth
          ctx.fillStyle = '#654321';
          for (let i = 0; i < Math.floor(platform.width / 6); i++) {
            ctx.fillRect(platform.x + 4 + i * 6, platform.y + 9, 1, 1);
          }
        } else if (platform.type === 'brick') {
          // Enhanced brick with detailed texture and 3D depth
          // Black outline
          ctx.fillStyle = '#000000';
          ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
          
          // Base brick color
          ctx.fillStyle = '#C0504D';
          ctx.fillRect(platform.x + 1, platform.y + 1, platform.width - 2, platform.height - 2);
          
          // Lighter brick face
          ctx.fillStyle = '#E26B6B';
          ctx.fillRect(platform.x + 2, platform.y + 2, platform.width - 4, platform.height - 4);
          
          // Top highlight for 3D effect
          ctx.fillStyle = '#F08080';
          ctx.fillRect(platform.x + 2, platform.y + 2, platform.width - 4, 2);
          
          // Left highlight
          ctx.fillStyle = '#F08080';
          ctx.fillRect(platform.x + 2, platform.y + 2, 2, platform.height - 4);
          
          // Brick mortar lines (horizontal)
          ctx.fillStyle = '#8B3A3A';
          ctx.fillRect(platform.x + 1, platform.y + 8, platform.width - 2, 1);
          
          // Brick mortar lines (vertical) - offset pattern
          ctx.fillRect(platform.x + 8, platform.y + 1, 1, 7);
          ctx.fillRect(platform.x + 4, platform.y + 8, 1, 6);
          ctx.fillRect(platform.x + 12, platform.y + 8, 1, 6);
          
          // Bottom shadow for depth
          ctx.fillStyle = '#5C1A1A';
          ctx.fillRect(platform.x + 2, platform.y + platform.height - 3, platform.width - 4, 1);
          
          // Right shadow
          ctx.fillRect(platform.x + platform.width - 3, platform.y + 2, 1, platform.height - 4);
          
          // Texture spots
          ctx.fillStyle = '#D05050';
          ctx.fillRect(platform.x + 4, platform.y + 4, 1, 1);
          ctx.fillRect(platform.x + 10, platform.y + 5, 1, 1);
          ctx.fillRect(platform.x + 6, platform.y + 10, 1, 1);
        } else if (platform.type === 'question') {
          // Question block with animated shimmer
          ctx.fillStyle = '#000000';
          ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
          
          if (platform.used) {
            // Used block - gray/brown with enhanced depth
            ctx.fillStyle = '#6B5D4F';
            ctx.fillRect(platform.x + 1, platform.y + 1, platform.width - 2, platform.height - 2);
            ctx.fillStyle = '#8B7355';
            ctx.fillRect(platform.x + 2, platform.y + 2, platform.width - 4, platform.height - 4);
            ctx.fillStyle = '#A0826D';
            ctx.fillRect(platform.x + 3, platform.y + 3, platform.width - 6, platform.height - 6);
            
            // Add texture to used block
            ctx.fillStyle = '#6B5D4F';
            ctx.fillRect(platform.x + 5, platform.y + 5, 2, 2);
            ctx.fillRect(platform.x + 9, platform.y + 7, 2, 2);
            
            // Bottom shadow
            ctx.fillStyle = '#5A4D3F';
            ctx.fillRect(platform.x + 3, platform.y + platform.height - 4, platform.width - 6, 1);
          } else {
            // Active question block - gold with enhanced shimmer animation
            const shimmer = Math.floor(performance.now() / 150) % 3;
            const baseColor = shimmer === 0 ? '#FFD700' : shimmer === 1 ? '#FFDF00' : '#FFC700';
            ctx.fillStyle = baseColor;
            ctx.fillRect(platform.x + 1, platform.y + 1, platform.width - 2, platform.height - 2);
            
            // Mid-tone layer
            ctx.fillStyle = '#FFB700';
            ctx.fillRect(platform.x + 2, platform.y + 2, platform.width - 4, platform.height - 4);
            
            // Top and left highlights for 3D effect
            ctx.fillStyle = '#FFFF99';
            ctx.fillRect(platform.x + 2, platform.y + 2, platform.width - 4, 2);
            ctx.fillRect(platform.x + 2, platform.y + 2, 2, platform.height - 4);
            
            // Inner glow
            ctx.fillStyle = '#FFA500';
            ctx.fillRect(platform.x + 4, platform.y + 4, platform.width - 8, platform.height - 8);
            
            // Bottom and right shadows
            ctx.fillStyle = '#CC8800';
            ctx.fillRect(platform.x + 2, platform.y + platform.height - 4, platform.width - 4, 2);
            ctx.fillRect(platform.x + platform.width - 4, platform.y + 2, 2, platform.height - 4);
            
            // Draw enhanced "?" symbol
            ctx.fillStyle = '#000000';
            // Top curve
            ctx.fillRect(platform.x + 6, platform.y + 5, 4, 2);
            ctx.fillRect(platform.x + 8, platform.y + 7, 2, 2);
            // Middle
            ctx.fillRect(platform.x + 7, platform.y + 9, 2, 2);
            // Dot
            ctx.fillRect(platform.x + 7, platform.y + 12, 2, 2);
            
            // Add white highlight to "?"
            ctx.fillStyle = shimmer === 1 ? '#FFFFFF' : baseColor;
            ctx.fillRect(platform.x + 6, platform.y + 5, 1, 1);
          }
        } else if (platform.type === 'pipe') {
          // Enhanced pipe with better 3D depth and texture
          // Black outline
          ctx.fillStyle = '#000000';
          ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
          
          // Dark green base
          ctx.fillStyle = '#1B5E20';
          ctx.fillRect(platform.x + 1, platform.y + 1, platform.width - 2, platform.height - 2);
          
          // Mid-tone green
          ctx.fillStyle = '#2E7D32';
          ctx.fillRect(platform.x + 2, platform.y + 2, platform.width - 4, platform.height - 4);
          
          // Top and left highlights
          ctx.fillStyle = '#66BB6A';
          ctx.fillRect(platform.x + 2, platform.y + 2, platform.width - 4, 2);
          ctx.fillRect(platform.x + 2, platform.y + 2, 2, platform.height - 4);
          
          // Inner pipe opening (darker)
          ctx.fillStyle = '#0D3818';
          ctx.fillRect(platform.x + 5, platform.y + 5, platform.width - 10, platform.height - 10);
          
          // Inner pipe rim
          ctx.fillStyle = '#1B5E20';
          ctx.fillRect(platform.x + 6, platform.y + 6, platform.width - 12, platform.height - 12);
          
          // Bottom and right shadows
          ctx.fillStyle = '#0D3818';
          ctx.fillRect(platform.x + 2, platform.y + platform.height - 4, platform.width - 4, 2);
          ctx.fillRect(platform.x + platform.width - 4, platform.y + 2, 2, platform.height - 4);
          
          // Texture details
          ctx.fillStyle = '#4CAF50';
          ctx.fillRect(platform.x + 3, platform.y + 3, 1, 1);
          ctx.fillRect(platform.x + platform.width - 4, platform.y + 4, 1, 1);
        }
      });

      // Coins will be drawn later (after blackhole scene) so they appear on top
      
      // Draw portal with clean pixel art animation
      if (state.portal && state.portal.active) {
        const px = Math.floor(state.portal.x);
        const py = Math.floor(state.portal.y);
        const time = state.portal.animationFrame;
        
        // Outer ring layers (no alpha fading)
        const ringColors = ['#1a0033', '#2d0052', '#4B0082', '#6A0DAD'];
        for (let ring = 3; ring >= 0; ring--) {
          const ringSize = 20 - ring * 3;
          ctx.fillStyle = ringColors[ring];
          ctx.fillRect(px + 8 - ringSize / 2, py + 8 - ringSize / 2, ringSize, ringSize);
        }
        
        // Portal base - dark center
        ctx.fillStyle = '#000000';
        ctx.fillRect(px + 4, py + 4, 8, 8);
        
        // Rotating energy particles (crisp pixels)
        for (let ring = 0; ring < 3; ring++) {
          const ringAngle = time * 2 + ring * 120;
          const ringRadius = 6 + ring * 2;
          
          for (let i = 0; i < 6; i++) {
            const angle = (ringAngle + i * 60) * (Math.PI / 180);
            const x = Math.floor(px + 8 + Math.cos(angle) * ringRadius);
            const y = Math.floor(py + 8 + Math.sin(angle) * ringRadius);
            
            const colors = ['#9400D3', '#BA55D3', '#DDA0DD'];
            ctx.fillStyle = colors[ring];
            ctx.fillRect(x, y, 2, 2);
          }
        }
        
        // Inner swirl particles
        for (let i = 0; i < 8; i++) {
          const spiralAngle = time * 4 + i * 45;
          const spiralRadius = 3 + (i % 3);
          const angle = spiralAngle * (Math.PI / 180);
          const x = Math.floor(px + 8 + Math.cos(angle) * spiralRadius);
          const y = Math.floor(py + 8 + Math.sin(angle) * spiralRadius);
          
          ctx.fillStyle = i % 2 === 0 ? '#FF00FF' : '#00FFFF';
          ctx.fillRect(x, y, 1, 1);
        }
        
        // Bright center (alternating colors instead of alpha pulse)
        const centerFrame = Math.floor(time / 10) % 2;
        ctx.fillStyle = centerFrame === 0 ? '#FFFFFF' : '#FFFF00';
        ctx.fillRect(px + 7, py + 7, 2, 2);
        
        // Energy sparks shooting out (clean pixels)
        for (let spark = 0; spark < 4; spark++) {
          const sparkAngle = (time * 6 + spark * 90) * (Math.PI / 180);
          const sparkDist = 12 + Math.floor((time + spark * 5) % 6);
          const sparkX = Math.floor(px + 8 + Math.cos(sparkAngle) * sparkDist);
          const sparkY = Math.floor(py + 8 + Math.sin(sparkAngle) * sparkDist);
          
          ctx.fillStyle = spark % 2 === 0 ? '#FFFF00' : '#00FFFF';
          ctx.fillRect(sparkX, sparkY, 2, 2);
        }
      }

      // Draw enemies with enhanced visuals - pixel perfect
      state.enemies.forEach(enemy => {
        if (enemy.alive) {
          const ex = Math.floor(enemy.x);
          const ey = Math.floor(enemy.y);
          
          if (enemy.type === 'goomba') {
            // Optimized and enhanced goomba with smooth walking animation
            const walkCycle = Math.floor((performance.now() / 150) % 2);
            const bounce = Math.abs(Math.sin(performance.now() / 150)) * 0.5; // Subtle bounce
            const eyOffset = Math.floor(ey - bounce);
            
            // Main body outline (mushroom shape with rounded top)
            ctx.fillStyle = '#000000';
            // Top edge (rounded, no corners)
            ctx.fillRect(ex + 1, eyOffset - 1, 10, 1);
            // Left edge (starts below top corner)
            ctx.fillRect(ex - 1, eyOffset, 1, 12);
            // Right edge (starts below top corner)
            ctx.fillRect(ex + 12, eyOffset, 1, 12);
            // Bottom edge
            ctx.fillRect(ex, eyOffset + 12, 12, 1);
            // Bottom corners only
            ctx.fillRect(ex - 1, eyOffset + 12, 1, 1); // Bottom-left corner
            ctx.fillRect(ex + 12, eyOffset + 12, 1, 1); // Bottom-right corner
            
            // Mushroom cap - rich brown gradient
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(ex, eyOffset, 12, 6);
            
            // Cap top highlight
            ctx.fillStyle = '#A0522D';
            ctx.fillRect(ex + 1, eyOffset, 10, 1);
            ctx.fillRect(ex + 2, eyOffset + 1, 8, 1);
            
            // Cap shadow/depth
            ctx.fillStyle = '#654321';
            ctx.fillRect(ex + 1, eyOffset + 4, 10, 2);
            
            // Body/stem - lighter tan color
            ctx.fillStyle = '#D2B48C';
            ctx.fillRect(ex + 2, eyOffset + 6, 8, 5);
            
            // Body shading
            ctx.fillStyle = '#C19A6B';
            ctx.fillRect(ex + 7, eyOffset + 7, 3, 4);
            
            // Angry eyebrows - thicker and more defined
            ctx.fillStyle = '#000000';
            ctx.fillRect(ex + 2, eyOffset + 6, 3, 1);
            ctx.fillRect(ex + 7, eyOffset + 6, 3, 1);
            ctx.fillRect(ex + 3, eyOffset + 5, 1, 1); // Eyebrow angle
            ctx.fillRect(ex + 8, eyOffset + 5, 1, 1);
            
            // Eyes - larger and more expressive
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(ex + 2, eyOffset + 7, 3, 2);
            ctx.fillRect(ex + 7, eyOffset + 7, 3, 2);
            
            // Pupils - look in movement direction
            ctx.fillStyle = '#000000';
            const pupilX = enemy.direction > 0 ? 1 : 0;
            ctx.fillRect(ex + 3 + pupilX, eyOffset + 8, 1, 1);
            ctx.fillRect(ex + 8 + pupilX, eyOffset + 8, 1, 1);
            
            // Frown/mouth
            ctx.fillStyle = '#000000';
            ctx.fillRect(ex + 4, eyOffset + 9, 4, 1);
            
            // Fangs
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(ex + 4, eyOffset + 10, 1, 1);
            ctx.fillRect(ex + 7, eyOffset + 10, 1, 1);
            
            // Feet - smooth walking animation
            ctx.fillStyle = '#654321';
            if (walkCycle === 0) {
              ctx.fillRect(ex + 1, eyOffset + 11, 2, 1);
              ctx.fillRect(ex + 9, eyOffset + 11, 2, 1);
            } else {
              ctx.fillRect(ex + 2, eyOffset + 11, 2, 1);
              ctx.fillRect(ex + 8, eyOffset + 11, 2, 1);
            }
            
            // Texture spots for depth
            ctx.fillStyle = '#A0826D';
            ctx.fillRect(ex + 3, eyOffset + 2, 1, 1);
            ctx.fillRect(ex + 8, eyOffset + 3, 1, 1);
            
          } else if (enemy.type === 'snake') {
            // Enhanced snake with segmented body and slithering animation
            const wavePhase = (enemy.waveOffset || 0);
            const bodySegments = 5;
            
            // Draw snake body segments from tail to head
            for (let seg = bodySegments - 1; seg >= 0; seg--) {
              const segmentX = ex - seg * 2.5;
              const segmentWave = Math.sin(wavePhase + seg * 0.5) * 2;
              const segmentY = ey + 5 + segmentWave;
              
              // Segment size decreases towards tail
              const segWidth = seg === 0 ? 4 : 3; // Head is wider
              const segHeight = seg === 0 ? 5 : 4;
              
              // Black outline
              ctx.fillStyle = '#000000';
              ctx.fillRect(Math.floor(segmentX - 1), Math.floor(segmentY - 1), segWidth + 2, segHeight + 2);
              
              // Segment color - darker towards tail
              const greenShade = seg === 0 ? '#00CC00' : seg < 2 ? '#00AA00' : '#008800';
              ctx.fillStyle = greenShade;
              ctx.fillRect(Math.floor(segmentX), Math.floor(segmentY), segWidth, segHeight);
              
              // Highlight on top
              ctx.fillStyle = '#00FF00';
              ctx.fillRect(Math.floor(segmentX) + 1, Math.floor(segmentY), segWidth - 2, 1);
              
              // Scale pattern (every other segment)
              if (seg % 2 === 0 && seg > 0) {
                ctx.fillStyle = '#006600';
                ctx.fillRect(Math.floor(segmentX) + 1, Math.floor(segmentY) + 2, 1, 1);
              }
            }
            
            // Draw head details
            const headX = ex;
            const headY = ey + 5 + Math.sin(wavePhase) * 2;
            
            // Eyes with yellow pupils
            ctx.fillStyle = '#FFFF00';
            ctx.fillRect(Math.floor(headX) + 1, Math.floor(headY) + 1, 1, 1);
            
            // Red eye highlight
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(Math.floor(headX) + 1, Math.floor(headY) + 1, 1, 1);
            
            // Animated forked tongue (flicks in and out)
            const tongueFlick = Math.sin(wavePhase * 3) > 0.5;
            if (tongueFlick) {
              ctx.fillStyle = '#FF1493';
              const tongueDir = enemy.direction > 0 ? 1 : -1;
              ctx.fillRect(Math.floor(headX) + (tongueDir > 0 ? 4 : -2), Math.floor(headY) + 3, 2, 1);
              ctx.fillRect(Math.floor(headX) + (tongueDir > 0 ? 5 : -2), Math.floor(headY) + 2, 1, 1);
              ctx.fillRect(Math.floor(headX) + (tongueDir > 0 ? 5 : -2), Math.floor(headY) + 4, 1, 1);
            }
          } else {
            // Badguy enemy - animated walking sprite
            // Use enemy's own animation frame counter for smooth animation
            if (!enemy.animFrame) enemy.animFrame = 0;
            
            // Calculate animation frame (8 frames, much slower speed to prevent flickering)
            const animSpeed = 4; // frames per second
            const frameIndex = Math.floor((Date.now() / 1000) * animSpeed) % 8;
            const frameName = `${frameIndex + 1}.png`;
            const badguySprite = spritesRef.current[frameName];
            
            if (badguySprite && badguySprite.complete && badguySprite.naturalWidth > 0) {
              ctx.save();
              ctx.imageSmoothingEnabled = false;
              
              // Flip sprite based on enemy direction
              if (enemy.direction === -1) {
                // Moving left - flip horizontally
                ctx.translate(ex + 16, ey);
                ctx.scale(-1, 1);
                ctx.drawImage(badguySprite, 0, 0, 16, 16);
              } else {
                // Moving right - normal
                ctx.drawImage(badguySprite, ex, ey, 16, 16);
              }
              
              ctx.restore();
            }
          }
        }
      });

      // Draw boss (Stage 10 rock monster)
      if (state.boss && state.boss.health > 0) {
        const boss = state.boss;
        const bx = Math.floor(boss.x);
        const by = Math.floor(boss.y);
        const isHurt = boss.invulnerable;
        const flash = isHurt && Math.floor(performance.now() / 100) % 2 === 0;
        
        // Walking animation bobbing
        const walkBob = boss.state === 'walking' ? Math.sin(performance.now() / 150) * 2 : 0;
        const byAnimated = by + walkBob;
        
        if (!flash) {
          // Rock monster - large imposing boss (48x48 pixels)
          
          // Base body - dark gray rock with animation
          ctx.fillStyle = '#4A4A4A';
          ctx.fillRect(bx + 8, byAnimated + 12, 32, 36); // Main body
          ctx.fillRect(bx + 4, byAnimated + 16, 40, 28); // Wider middle
          
          // Rock texture - lighter gray patches with more detail
          ctx.fillStyle = '#6B6B6B';
          ctx.fillRect(bx + 10, byAnimated + 14, 8, 8);
          ctx.fillRect(bx + 28, byAnimated + 18, 10, 10);
          ctx.fillRect(bx + 12, byAnimated + 32, 12, 8);
          ctx.fillRect(bx + 32, byAnimated + 36, 8, 6);
          ctx.fillRect(bx + 6, byAnimated + 22, 6, 6);
          
          // Additional rock highlights
          ctx.fillStyle = '#8B8B8B';
          ctx.fillRect(bx + 11, byAnimated + 15, 3, 3);
          ctx.fillRect(bx + 29, byAnimated + 19, 4, 4);
          
          // Dark cracks and shadows - more pronounced
          ctx.fillStyle = '#2A2A2A';
          ctx.fillRect(bx + 16, byAnimated + 20, 2, 12);
          ctx.fillRect(bx + 28, byAnimated + 24, 2, 10);
          ctx.fillRect(bx + 20, byAnimated + 28, 8, 2);
          ctx.fillRect(bx + 10, byAnimated + 40, 28, 4);
          ctx.fillRect(bx + 24, byAnimated + 18, 1, 8);
          
          // Head - rounded top with better shaping
          ctx.fillStyle = '#5A5A5A';
          ctx.fillRect(bx + 12, byAnimated + 4, 24, 12);
          ctx.fillRect(bx + 16, byAnimated, 16, 4);
          ctx.fillRect(bx + 14, byAnimated + 2, 20, 2);
          
          // Head highlights - more prominent
          ctx.fillStyle = '#7A7A7A';
          ctx.fillRect(bx + 14, byAnimated + 6, 8, 4);
          ctx.fillRect(bx + 18, byAnimated + 2, 6, 2);
          ctx.fillRect(bx + 26, byAnimated + 8, 4, 3);
          
          // Glowing red eyes with intensity based on state
          const eyeGlow = Math.sin(performance.now() / 200) * 0.3 + 0.7;
          const eyeIntensity = boss.state === 'attacking' ? 1.0 : boss.state === 'hurt' ? 0.5 : 0.8;
          ctx.fillStyle = boss.state === 'attacking' ? '#FF0000' : boss.state === 'hurt' ? '#FF8800' : '#FF4500';
          ctx.globalAlpha = eyeGlow * eyeIntensity;
          ctx.fillRect(bx + 16, byAnimated + 8, 4, 4);
          ctx.fillRect(bx + 28, byAnimated + 8, 4, 4);
          ctx.globalAlpha = 1.0;
          
          // Eye pupils - look at player
          const lookDir = boss.direction > 0 ? 1 : 0;
          ctx.fillStyle = '#FFFF00';
          ctx.fillRect(bx + 17 + lookDir, byAnimated + 9, 2, 2);
          ctx.fillRect(bx + 29 + lookDir, byAnimated + 9, 2, 2);
          
          // Angry mouth/crack - changes with state
          ctx.fillStyle = '#000000';
          if (boss.state === 'attacking') {
            // Open mouth when attacking
            ctx.fillRect(bx + 20, byAnimated + 14, 8, 3);
            ctx.fillRect(bx + 18, byAnimated + 14, 2, 2);
            ctx.fillRect(bx + 28, byAnimated + 14, 2, 2);
            ctx.fillStyle = '#8B0000';
            ctx.fillRect(bx + 21, byAnimated + 15, 6, 1);
          } else {
            ctx.fillRect(bx + 20, byAnimated + 14, 8, 2);
            ctx.fillRect(bx + 18, byAnimated + 14, 2, 1);
            ctx.fillRect(bx + 28, byAnimated + 14, 2, 1);
          }
          
          // Arms - massive rocky limbs with animation
          const armSwing = boss.state === 'walking' ? Math.sin(performance.now() / 150) * 2 : 0;
          if (boss.state === 'attacking') {
            // Arms raised for attack
            ctx.fillStyle = '#4A4A4A';
            // Left arm
            ctx.fillRect(bx, byAnimated + 20, 8, 16);
            ctx.fillRect(bx - 4, byAnimated + 16, 4, 8);
            // Right arm
            ctx.fillRect(bx + 40, byAnimated + 20, 8, 16);
            ctx.fillRect(bx + 48, byAnimated + 16, 4, 8);
            
            // Arm highlights when attacking
            ctx.fillStyle = '#6B6B6B';
            ctx.fillRect(bx + 2, byAnimated + 22, 3, 4);
            ctx.fillRect(bx + 42, byAnimated + 22, 3, 4);
          } else {
            // Arms down with swing animation
            ctx.fillStyle = '#4A4A4A';
            // Left arm
            ctx.fillRect(bx, byAnimated + 24 + armSwing, 8, 20);
            ctx.fillRect(bx - 2, byAnimated + 40 + armSwing, 4, 4);
            // Right arm
            ctx.fillRect(bx + 40, byAnimated + 24 - armSwing, 8, 20);
            ctx.fillRect(bx + 46, byAnimated + 40 - armSwing, 4, 4);
            
            // Arm highlights
            ctx.fillStyle = '#6B6B6B';
            ctx.fillRect(bx + 2, byAnimated + 26 + armSwing, 3, 6);
            ctx.fillRect(bx + 42, byAnimated + 26 - armSwing, 3, 6);
          }
          
          // Legs - sturdy base
          ctx.fillStyle = '#3A3A3A';
          ctx.fillRect(bx + 8, byAnimated + 44, 12, 4);
          ctx.fillRect(bx + 28, byAnimated + 44, 12, 4);
          
          // Leg highlights
          ctx.fillStyle = '#4A4A4A';
          ctx.fillRect(bx + 9, byAnimated + 44, 4, 2);
          ctx.fillRect(bx + 29, byAnimated + 44, 4, 2);
          
          // Black outline for definition
          ctx.fillStyle = '#000000';
          // Head outline
          ctx.fillRect(bx + 16, byAnimated - 1, 16, 1);
          ctx.fillRect(bx + 11, byAnimated + 4, 1, 12);
          ctx.fillRect(bx + 36, byAnimated + 4, 1, 12);
          // Body outline
          ctx.fillRect(bx + 3, byAnimated + 16, 1, 28);
          ctx.fillRect(bx + 44, byAnimated + 16, 1, 28);
          
          // Visual indicator for head hitbox (subtle yellow outline)
          if (!boss.invulnerable) {
            ctx.strokeStyle = '#FFFF00';
            ctx.globalAlpha = 0.3 + Math.sin(performance.now() / 300) * 0.2;
            ctx.lineWidth = 1;
            ctx.strokeRect(bx + 16, byAnimated, 16, 12);
            ctx.globalAlpha = 1.0;
          }
          
          // Boss health bar above head
          const healthBarWidth = 48;
          const healthBarHeight = 5;
          const healthPercent = boss.health / boss.maxHealth;
          
          // Background
          ctx.fillStyle = '#000000';
          ctx.fillRect(bx, byAnimated - 12, healthBarWidth, healthBarHeight);
          
          // Health (color gradient based on health)
          const healthColor = healthPercent > 0.5 ? '#00FF00' : healthPercent > 0.25 ? '#FFFF00' : '#FF0000';
          ctx.fillStyle = healthColor;
          ctx.fillRect(bx + 1, byAnimated - 11, (healthBarWidth - 2) * healthPercent, healthBarHeight - 2);
          
          // Health bar segments
          ctx.fillStyle = '#000000';
          for (let i = 1; i < 10; i++) {
            ctx.fillRect(bx + (i * 4.8), byAnimated - 11, 1, healthBarHeight - 2);
          }
          
          // Health numbers
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 8px monospace';
          ctx.fillText(`${boss.health}/${boss.maxHealth}`, bx + 14, byAnimated - 14);
        }
      }

      // Draw finish line flag at goal - enhanced
      const flagX = Math.floor(state.goalX);
      const flagY = 96;
      const flagWave = Math.sin(performance.now() / 200) * 2;
      
      // Pole wood texture (no outline)
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(flagX, flagY, 2, 32);
      
      // Pole highlight
      ctx.fillStyle = '#A0522D';
      ctx.fillRect(flagX, flagY, 1, 2);
      ctx.fillRect(flagX, flagY + 8, 1, 2);
      ctx.fillRect(flagX, flagY + 16, 1, 2);
      ctx.fillRect(flagX, flagY + 24, 1, 2);
      
      // Pole top ornament (golden ball - no outline)
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(flagX, flagY - 3, 2, 3);
      ctx.fillStyle = '#FFFF99';
      ctx.fillRect(flagX, flagY - 3, 1, 1);
      
      // Flag - enhanced checkered pattern with wave
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
          const isBlack = (row + col) % 2 === 0;
          const waveOffset = Math.floor(flagWave * (row / 3));
          
          // Main square color
          ctx.fillStyle = isBlack ? '#000000' : '#FFFFFF';
          ctx.fillRect(flagX + 1 + col * 3 + waveOffset, flagY + row * 3, 3, 3);
          
          // Add slight shading to white squares for depth
          if (!isBlack) {
            ctx.fillStyle = '#F0F0F0';
            ctx.fillRect(flagX + 1 + col * 3 + waveOffset + 2, flagY + row * 3 + 2, 1, 1);
          }
        }
      }
      
      // Flag outline (follows wave)
      ctx.fillStyle = '#000000';
      for (let row = 0; row < 3; row++) {
        const waveOffset = Math.floor(flagWave * (row / 3));
        if (row === 0) {
          ctx.fillRect(flagX + 1 + waveOffset, flagY - 1, 12, 1);
        }
        if (row === 2) {
          ctx.fillRect(flagX + 1 + waveOffset, flagY + 9, 12, 1);
        }
      }
      ctx.fillRect(flagX, flagY, 1, 9);
      
      // Right edge of flag (wavy)
      for (let row = 0; row < 3; row++) {
        const waveOffset = Math.floor(flagWave * (row / 3));
        ctx.fillRect(flagX + 13 + waveOffset, flagY + row * 3, 1, 3);
      }

      // Draw particles with enhanced effects
      state.particles.forEach(p => {
        const lifePercent = p.life / p.maxLife;
        const px = Math.floor(p.x);
        const py = Math.floor(p.y);
        
        // Different rendering based on particle type (color)
        if (p.color === '#FFD700' || p.color === '#FFFF00') {
          // Gold/yellow particles (coins, boss defeat) - with glow
          if (lifePercent > 0.5) {
            ctx.fillStyle = '#FFFF99';
            ctx.fillRect(px - 1, py - 1, 4, 4);
            ctx.fillStyle = p.color;
            ctx.fillRect(px, py, 2, 2);
          } else if (lifePercent > 0.25) {
            ctx.fillStyle = p.color;
            ctx.fillRect(px, py, 2, 2);
          } else {
            ctx.fillStyle = p.color;
            ctx.fillRect(px, py, 1, 1);
          }
        } else if (p.color === '#8B7355') {
          // Rock projectiles - larger and more visible
          if (lifePercent > 0.7) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(px - 1, py - 1, 5, 5);
            ctx.fillStyle = p.color;
            ctx.fillRect(px, py, 3, 3);
            ctx.fillStyle = '#A0826D';
            ctx.fillRect(px + 1, py + 1, 1, 1);
          } else if (lifePercent > 0.4) {
            ctx.fillStyle = p.color;
            ctx.fillRect(px, py, 3, 3);
          } else {
            ctx.fillStyle = p.color;
            ctx.fillRect(px, py, 2, 2);
          }
        } else if (p.color === '#FF0000') {
          // Red particles (miss indicator) - bright and noticeable
          if (lifePercent > 0.6) {
            ctx.fillStyle = '#FF6666';
            ctx.fillRect(px - 1, py - 1, 4, 4);
            ctx.fillStyle = p.color;
            ctx.fillRect(px, py, 2, 2);
          } else if (lifePercent > 0.3) {
            ctx.fillStyle = p.color;
            ctx.fillRect(px, py, 2, 2);
          }
        } else {
          // Regular particles - standard fade
          if (lifePercent > 0.66) {
            ctx.fillStyle = p.color;
            ctx.fillRect(px, py, 2, 2);
          } else if (lifePercent > 0.33) {
            ctx.fillStyle = p.color;
            ctx.fillRect(px, py, 1, 1);
          }
        }
      });

      // ========== SIMPLE RENDERING - SINGLE DRAW CALL ==========
      let frameName: string;
      
      if (state.player.currentAnimation === 'idle') {
        frameName = 'idle';
      } else if (state.player.currentAnimation === 'walk') {
        const walkFrames = ['walk1', 'walk2', 'walk3', 'walk4'];
        frameName = walkFrames[state.player.animationFrame];
      } else {
        frameName = 'jump1';
      }
      
      // Draw player (with helmet rainbow effect if active)
      if (state.player.hasHelmet) {
        // Draw rainbow overlay on character when helmet is active (Mario star effect)
        const px = Math.floor(state.player.x);
        const py = Math.floor(state.player.y);
        
        // Rainbow color cycling animation
        const time = performance.now() / 80;
        const hue = Math.floor(time % 360);
        
        // Create an offscreen canvas to apply rainbow effect to character only
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 16;
        tempCanvas.height = 16;
        const tempCtx = tempCanvas.getContext('2d');
        
        if (tempCtx) {
          // Draw character sprite to temp canvas
          if (state.player.rotation !== 0) {
            tempCtx.save();
            tempCtx.translate(8, 8);
            tempCtx.rotate((state.player.rotation * Math.PI) / 180);
            drawPlayerSprite(tempCtx, -8, -8, frameName, state.player.facingLeft);
            tempCtx.restore();
          } else {
            drawPlayerSprite(tempCtx, 0, 0, frameName, state.player.facingLeft);
          }
          
          // Apply rainbow color overlay using source-atop (only affects existing pixels)
          // Faded rainbow effect with reduced saturation and lightness
          tempCtx.globalCompositeOperation = 'source-atop';
          tempCtx.fillStyle = `hsl(${hue}, 50%, 50%)`;
          tempCtx.fillRect(0, 0, 16, 16);
          
          // Draw the rainbow-tinted character back to main canvas
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(tempCanvas, px, py);
          ctx.restore();
        }
        
        // Draw helmet sprite with same flipping as character
        const helmetSprite = spritesRef.current['helmet.png'];
        
        if (helmetSprite && helmetSprite.complete && helmetSprite.naturalWidth > 0) {
          // Draw helmet.png sprite overlapping player (both 16x16)
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          
          // Apply same rotation as character if jumping
          if (state.player.rotation !== 0) {
            ctx.translate(px + 8, py + 8);
            ctx.rotate((state.player.rotation * Math.PI) / 180);
            
            // Flip helmet horizontally if character is facing left
            if (state.player.facingLeft) {
              ctx.scale(-1, 1);
            }
            
            ctx.drawImage(helmetSprite, -8, -8, 16, 16);
          } else {
            // No rotation - just flip if facing left
            if (state.player.facingLeft) {
              ctx.translate(px + 16, py);
              ctx.scale(-1, 1);
              ctx.drawImage(helmetSprite, 0, 0, 16, 16);
            } else {
              ctx.drawImage(helmetSprite, px, py, 16, 16);
            }
          }
          
          ctx.restore();
        }
      } else {
        // No helmet - draw player normally (with rotation if jumping)
        if (state.player.rotation !== 0) {
          ctx.save();
          ctx.translate(Math.floor(state.player.x + 8), Math.floor(state.player.y + 8));
          ctx.rotate((state.player.rotation * Math.PI) / 180);
          drawPlayerSprite(ctx, -8, -8, frameName, state.player.facingLeft);
          ctx.restore();
        } else {
          drawPlayerSprite(ctx, Math.floor(state.player.x), Math.floor(state.player.y), frameName, state.player.facingLeft);
        }
      }

      // Draw celebration screen with coin count
      if (state.celebrating) {
        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        // Celebration text
        const centerX = GAME_WIDTH / 2;
        const centerY = GAME_HEIGHT / 2;
        
        // "STAGE CLEAR!" text
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(centerX - 40, centerY - 30, 80, 12);
        ctx.fillStyle = '#000000';
        ctx.fillRect(centerX - 39, centerY - 29, 78, 10);
        ctx.fillStyle = '#FFFFFF';
        // Simple pixel text for "STAGE CLEAR"
        for (let i = 0; i < 10; i++) {
          ctx.fillRect(centerX - 35 + i * 7, centerY - 26, 5, 6);
        }
        
        // Coin icon and count
        const coinY = centerY - 5;
        // Draw coin
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(centerX - 20, coinY, 8, 8);
        ctx.fillRect(centerX - 22, coinY + 2, 12, 4);
        ctx.fillStyle = '#FFA500';
        ctx.fillRect(centerX - 19, coinY + 2, 2, 4);
        // Black outline
        ctx.fillStyle = '#000000';
        ctx.fillRect(centerX - 21, coinY - 1, 10, 1);
        ctx.fillRect(centerX - 21, coinY + 8, 10, 1);
        ctx.fillRect(centerX - 23, coinY + 2, 1, 4);
        ctx.fillRect(centerX - 10, coinY + 2, 1, 4);
        
        // Coin count text
        const coinText = `${state.coinsCollectedThisStage}/${state.totalCoinsThisStage}`;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(centerX - 5, coinY, 40, 8);
        ctx.fillStyle = '#000000';
        ctx.fillRect(centerX - 4, coinY + 1, 38, 6);
        ctx.fillStyle = '#FFD700';
        // Draw numbers
        for (let i = 0; i < coinText.length; i++) {
          ctx.fillRect(centerX - 2 + i * 5, coinY + 2, 3, 4);
        }
        
        // Bonus text if all coins collected
        if (state.coinsCollectedThisStage === state.totalCoinsThisStage) {
          ctx.fillStyle = '#00FF00';
          ctx.fillRect(centerX - 30, coinY + 15, 60, 8);
          ctx.fillStyle = '#000000';
          ctx.fillRect(centerX - 29, coinY + 16, 58, 6);
          ctx.fillStyle = '#FFFF00';
          // "PERFECT!" text
          for (let i = 0; i < 7; i++) {
            ctx.fillRect(centerX - 25 + i * 7, coinY + 18, 5, 2);
          }
        }
      }
      
      // Draw helmet timer indicator
      if (state.player.hasHelmet && state.player.helmetTimer > 0 && !state.inBlackhole) {
        const timerX = Math.floor(state.player.x);
        const timerY = Math.floor(state.player.y - 20);
        const timerWidth = Math.floor((state.player.helmetTimer / 10) * 16);
        
        // Timer bar background
        ctx.fillStyle = '#000000';
        ctx.fillRect(timerX, timerY, 16, 3);
        // Timer bar fill
        const timerColor = state.player.helmetTimer > 3 ? '#00FF00' : '#FF0000';
        ctx.fillStyle = timerColor;
        ctx.fillRect(timerX, timerY, timerWidth, 3);
        
        // Helmet icon above timer
        ctx.fillStyle = '#C0C0C0';
        ctx.fillRect(timerX + 6, timerY - 5, 4, 3);
        ctx.fillStyle = '#000000';
        ctx.fillRect(timerX + 6, timerY - 6, 4, 1);
      }

      // Draw combo indicator with bounce effect - pixel perfect
      if (state.combo > 1 && !state.celebrating && !state.inBlackhole) {
        const comboX = Math.floor(state.player.x);
        const bounceOffset = Math.floor(Math.sin(state.comboTimer * 10) * 2);
        const comboY = Math.floor(state.player.y - 12 + bounceOffset);
        const comboAlpha = Math.min(1, state.comboTimer / 1.5);
        const scale = 1 + (1 - state.comboTimer / 3) * 0.3;
        
        // Only show combo if timer is active (no alpha fade)
        if (comboAlpha > 0.3) {
          // Combo text background with glow
          ctx.fillStyle = '#FFD700';
          ctx.fillRect(comboX - 9, comboY - 7, 26, 10);
          ctx.fillStyle = '#000000';
          ctx.fillRect(comboX - 8, comboY - 6, 24, 8);
          ctx.fillStyle = state.combo > 5 ? '#FF00FF' : state.combo > 3 ? '#FF4500' : '#FFD700';
          ctx.fillRect(comboX - 7, comboY - 5, 22, 6);
          
          // Combo number (simple pixel text)
          ctx.fillStyle = '#FFFFFF';
          const comboStr = `x${state.combo}`;
          for (let i = 0; i < comboStr.length; i++) {
            ctx.fillRect(comboX - 5 + i * 4, comboY - 3, 2, 4);
          }
        }
      }

      // Draw coins in world space (before ctx.restore) so they stay in place
      if (!state.inBlackhole) {
        state.coins.forEach(coin => {
          if (!coin.collected) {
            const y = Math.floor(coin.y + Math.sin(coin.floatOffset) * 4);
            const x = Math.floor(coin.x);
            const spinFrame = Math.floor((performance.now() / 100) % 8);
            
            // Optimized coin with pixel-perfect 3D spinning effect
            // Black outline - cleaner and more precise
            ctx.fillStyle = '#000000';
            if (spinFrame < 2 || spinFrame > 5) {
              // Full width - front/back view
              ctx.fillRect(x + 2, y, 4, 1);
              ctx.fillRect(x + 2, y + 7, 4, 1);
              ctx.fillRect(x + 1, y + 1, 1, 5);
              ctx.fillRect(x + 6, y + 1, 1, 5);
              ctx.fillRect(x, y + 2, 1, 3);
              ctx.fillRect(x + 7, y + 2, 1, 3);
              ctx.fillRect(x + 1, y + 6, 1, 1);
              ctx.fillRect(x + 6, y + 6, 1, 1);
            } else if (spinFrame === 2 || spinFrame === 5) {
              // Medium width - 3/4 view
              ctx.fillRect(x + 2, y, 3, 1);
              ctx.fillRect(x + 2, y + 7, 3, 1);
              ctx.fillRect(x + 1, y + 1, 1, 5);
              ctx.fillRect(x + 5, y + 1, 1, 5);
              ctx.fillRect(x + 1, y + 6, 1, 1);
              ctx.fillRect(x + 5, y + 6, 1, 1);
            } else {
              // Thin - side view
              ctx.fillRect(x + 3, y, 1, 1);
              ctx.fillRect(x + 3, y + 7, 1, 1);
              ctx.fillRect(x + 2, y + 1, 1, 5);
              ctx.fillRect(x + 4, y + 1, 1, 5);
              ctx.fillRect(x + 2, y + 6, 1, 1);
              ctx.fillRect(x + 4, y + 6, 1, 1);
            }
            
            // Coin body with enhanced gradient and shading
            if (spinFrame < 2 || spinFrame > 5) {
              // Full coin - front/back view
              // Base gold
              ctx.fillStyle = '#FFD700';
              ctx.fillRect(x + 2, y + 1, 4, 5);
              ctx.fillRect(x + 1, y + 2, 6, 3);
              
              // Bright highlight (top-left)
              ctx.fillStyle = '#FFFF00';
              ctx.fillRect(x + 2, y + 1, 2, 1);
              ctx.fillRect(x + 1, y + 2, 2, 1);
              
              // Light highlight
              ctx.fillStyle = '#FFED4E';
              ctx.fillRect(x + 2, y + 2, 2, 2);
              ctx.fillRect(x + 4, y + 1, 1, 1);
              
              // Mid tone
              ctx.fillStyle = '#FFC700';
              ctx.fillRect(x + 4, y + 3, 2, 2);
              ctx.fillRect(x + 3, y + 4, 1, 1);
              
              // Shadow (bottom-right)
              ctx.fillStyle = '#CC9900';
              ctx.fillRect(x + 5, y + 4, 1, 1);
              ctx.fillRect(x + 4, y + 5, 2, 1);
              
              // Dark shadow
              ctx.fillStyle = '#996600';
              ctx.fillRect(x + 5, y + 5, 1, 1);
            } else if (spinFrame === 2 || spinFrame === 5) {
              // Medium coin - 3/4 view
              ctx.fillStyle = '#FFD700';
              ctx.fillRect(x + 2, y + 1, 3, 5);
              ctx.fillRect(x + 1, y + 2, 4, 3);
              
              // Highlight
              ctx.fillStyle = '#FFFF00';
              ctx.fillRect(x + 2, y + 1, 1, 1);
              ctx.fillRect(x + 1, y + 2, 1, 1);
              
              ctx.fillStyle = '#FFED4E';
              ctx.fillRect(x + 2, y + 2, 2, 2);
              
              // Shadow
              ctx.fillStyle = '#FFC700';
              ctx.fillRect(x + 3, y + 4, 1, 1);
              ctx.fillRect(x + 4, y + 3, 1, 2);
              
              ctx.fillStyle = '#CC9900';
              ctx.fillRect(x + 4, y + 5, 1, 1);
            } else {
              // Thin coin - side view
              ctx.fillStyle = '#FFD700';
              ctx.fillRect(x + 3, y + 1, 1, 5);
              ctx.fillRect(x + 2, y + 2, 2, 3);
              
              // Highlight
              ctx.fillStyle = '#FFED4E';
              ctx.fillRect(x + 2, y + 2, 1, 2);
              
              // Shadow
              ctx.fillStyle = '#CC9900';
              ctx.fillRect(x + 3, y + 4, 1, 2);
            }
          }
        });
      }
      
      // Draw water gun power-up
      if (state.waterGun && !state.waterGun.collected) {
        const wgx = Math.floor(state.waterGun.x);
        const wgy = Math.floor(state.waterGun.y + Math.sin(performance.now() / 200) * 2);
        
        // Water gun pixel art (8x12)
        // Black outline
        ctx.fillStyle = '#000000';
        ctx.fillRect(wgx, wgy, 8, 12);
        
        // Gun body - blue
        ctx.fillStyle = '#1E90FF';
        ctx.fillRect(wgx + 1, wgy + 1, 6, 10);
        
        // Barrel
        ctx.fillStyle = '#4169E1';
        ctx.fillRect(wgx + 2, wgy + 1, 4, 4);
        
        // Handle
        ctx.fillStyle = '#00BFFF';
        ctx.fillRect(wgx + 2, wgy + 6, 4, 4);
        
        // Highlight
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(wgx + 2, wgy + 2, 2, 2);
        ctx.fillRect(wgx + 3, wgy + 7, 2, 2);
        
        // Water droplet effect
        const droplet = Math.floor(performance.now() / 300) % 3;
        if (droplet === 0) {
          ctx.fillStyle = '#00BFFF';
          ctx.fillRect(wgx + 4, wgy - 2, 1, 1);
        }
      }
      
      // Draw water projectiles
      state.waterProjectiles.forEach(proj => {
        const px = Math.floor(proj.x);
        const py = Math.floor(proj.y);
        
        // Water droplet with trail
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(px - 2, py, 4, 2);
        ctx.fillStyle = '#00BFFF';
        ctx.fillRect(px - 1, py, 3, 2);
        ctx.fillStyle = '#1E90FF';
        ctx.fillRect(px, py, 2, 2);
      });

      ctx.restore();
      
      // Draw blackhole mini-game overlay (MUST BE LAST - draws on top of everything)
      if (state.inBlackhole) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        
        // Dark space background with gradient
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        
        // Add space nebula clouds (solid colors, no alpha)
        for (let nebula = 0; nebula < 5; nebula++) {
          const nebulaX = Math.floor((nebula * 40 + state.blackholeTimer * 2) % GAME_WIDTH);
          const nebulaY = Math.floor((nebula * 30) % GAME_HEIGHT);
          const nebulaColor = nebula % 2 === 0 ? '#1a0033' : '#2d0052';
          ctx.fillStyle = nebulaColor;
          ctx.fillRect(nebulaX, nebulaY, 16, 16);
          // Add brighter center
          ctx.fillStyle = nebula % 2 === 0 ? '#2d0052' : '#4B0082';
          ctx.fillRect(nebulaX + 4, nebulaY + 4, 8, 8);
        }
        
        // Draw stars with clean pixel art (no twinkling alpha)
        for (let i = 0; i < 50; i++) {
          const starX = Math.floor((i * 37 + state.blackholeTimer * 10) % GAME_WIDTH);
          const starY = Math.floor((i * 23) % GAME_HEIGHT);
          const twinkleFrame = Math.floor(state.blackholeTimer + i) % 3;
          const starVisible = twinkleFrame < 2;
          if (starVisible) {
            ctx.fillStyle = i % 3 === 0 ? '#FFFFFF' : i % 3 === 1 ? '#FFFF00' : '#00FFFF';
            const starSize = i % 5 === 0 ? 2 : 1;
            ctx.fillRect(starX, starY, starSize, starSize);
          }
        }
        
        // Draw blackhole with spiral effect
        const centerX = GAME_WIDTH / 2;
        const centerY = 40;
        const time = state.blackholeTimer;
        
        // Outer gravitational rings (solid colors by layer)
        const ringLayers = [
          { radius: 35, color: '#1a0033' },
          { radius: 31, color: '#2d0052' },
          { radius: 27, color: '#4B0082' },
          { radius: 23, color: '#6A0DAD' },
          { radius: 19, color: '#8B00FF' },
          { radius: 15, color: '#9400D3' }
        ];
        
        ringLayers.forEach((layer, distort) => {
          for (let angle = 0; angle < 360; angle += 20) {
            const spiralOffset = time * 3 + distort * 20;
            const rad = ((angle + spiralOffset) % 360) * (Math.PI / 180);
            const x = Math.floor(centerX + Math.cos(rad) * layer.radius);
            const y = Math.floor(centerY + Math.sin(rad) * layer.radius);
            
            ctx.fillStyle = layer.color;
            ctx.fillRect(x, y, 2, 2);
          }
        });
        
        // Spiral arms (use different colors instead of alpha)
        const armColors = [
          ['#8B00FF', '#9400D3', '#BA55D3'],
          ['#9400D3', '#BA55D3', '#DDA0DD'],
          ['#BA55D3', '#DDA0DD', '#E0B0FF']
        ];
        
        for (let arm = 0; arm < 3; arm++) {
          const armOffset = arm * 120;
          
          for (let i = 0; i < 15; i++) {
            const spiralAngle = time * 4 + armOffset + i * 24;
            const spiralRadius = 28 - i * 1.8;
            const rad = spiralAngle * (Math.PI / 180);
            const x = Math.floor(centerX + Math.cos(rad) * spiralRadius);
            const y = Math.floor(centerY + Math.sin(rad) * spiralRadius);
            
            const colorIndex = Math.floor(i / 5);
            ctx.fillStyle = armColors[arm][colorIndex];
            ctx.fillRect(x, y, 2, 2);
          }
        }
        
        // Accretion disk particles
        for (let particle = 0; particle < 30; particle++) {
          const particleAngle = time * 5 + particle * 12;
          const particleRadius = 15 + (particle % 10);
          const rad = particleAngle * (Math.PI / 180);
          const x = centerX + Math.cos(rad) * particleRadius;
          const y = centerY + Math.sin(rad) * particleRadius;
          
          ctx.fillStyle = particle % 3 === 0 ? '#FF00FF' : particle % 3 === 1 ? '#00FFFF' : '#FFFF00';
          ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
        }
        
        // Event horizon with layered rings (no alpha glow)
        const horizonSize = Math.floor(10 + Math.sin(time * 2) * 2);
        
        // Layered rings around event horizon (solid colors)
        const horizonRings = [
          { size: horizonSize + 10, color: '#1a0033' },
          { size: horizonSize + 8, color: '#2d0052' },
          { size: horizonSize + 6, color: '#4B0082' },
          { size: horizonSize + 4, color: '#6A0DAD' },
          { size: horizonSize + 2, color: '#8B00FF' }
        ];
        
        horizonRings.forEach(ring => {
          ctx.fillStyle = ring.color;
          ctx.fillRect(
            Math.floor(centerX - ring.size / 2),
            Math.floor(centerY - ring.size / 2),
            ring.size,
            ring.size
          );
        });
        
        // Event horizon itself
        ctx.fillStyle = '#000000';
        ctx.fillRect(
          Math.floor(centerX - horizonSize / 2),
          Math.floor(centerY - horizonSize / 2),
          horizonSize,
          horizonSize
        );
        
        // Draw falling player with actual sprite and rotation
        const playerFallY = 60 + Math.min(state.blackholeFallSpeed, 50);
        const playerRotation = time * 10;
        
        // Player trail effect with actual sprite (fading copies)
        const trailSprites = [
          { offset: 3, sprite: 'idle' },
          { offset: 2, sprite: 'walk1' },
          { offset: 1, sprite: 'walk2' }
        ];
        
        trailSprites.forEach((trail, index) => {
          const trailY = playerFallY - (trail.offset + 1) * 8;
          const trailX = Math.floor(centerX - 8);
          const trailRotation = playerRotation - trail.offset * 30;
          
          // Draw darker version of sprite for trail
          if (spritesRef.current[trail.sprite]) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = 16;
            tempCanvas.height = 16;
            const tempCtx = tempCanvas.getContext('2d')!;
            tempCtx.imageSmoothingEnabled = false;
            
            // Draw sprite
            tempCtx.drawImage(spritesRef.current[trail.sprite], 0, 0);
            
            // Darken it
            tempCtx.globalCompositeOperation = 'source-atop';
            tempCtx.fillStyle = `rgba(0, 100, 0, ${0.3 + index * 0.2})`;
            tempCtx.fillRect(0, 0, 16, 16);
            
            ctx.save();
            ctx.translate(trailX + 8, Math.floor(trailY) + 8);
            ctx.rotate((trailRotation * Math.PI) / 180);
            ctx.drawImage(tempCanvas, -8, -8);
            ctx.restore();
          }
        });
        
        // Draw main falling player with actual sprite and rotation
        const rotFrame = Math.floor(playerRotation / 45) % 8;
        const frameNames = ['idle', 'walk1', 'walk2', 'walk3', 'walk4', 'walk3', 'walk2', 'walk1'];
        const currentFrame = frameNames[rotFrame];
        
        if (spritesRef.current[currentFrame]) {
          ctx.save();
          ctx.translate(Math.floor(centerX), Math.floor(playerFallY) + 8);
          ctx.rotate((playerRotation * Math.PI) / 180);
          ctx.drawImage(spritesRef.current[currentFrame], -8, -8);
          ctx.restore();
        }
        
        // Draw chart at bottom with enhanced layout
        const chartStartX = 35;
        const chartY = GAME_HEIGHT - 65;
        
        // Chart background panel
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(20, chartY - 25, GAME_WIDTH - 40, 80);
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(22, chartY - 23, GAME_WIDTH - 44, 76);
        
        // Chart title with better styling
        ctx.fillStyle = '#00FF00';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('MARKET CHART', chartStartX + 10, chartY - 15);
        
        // Grid lines
        ctx.fillStyle = '#333333';
        for (let i = 0; i < 3; i++) {
          const gridY = chartY - i * 15;
          ctx.fillRect(chartStartX - 5, gridY, 200, 1);
        }
        
        // Draw pixel art chart bars with crisp quality
        state.chartBars.forEach((bar, index) => {
          const barX = chartStartX + index * 16;
          const barWidth = 12;
          const barHeight = Math.floor(bar.height);
          const isGreen = bar.color === 'green';
          
          // Animated appearance (bars grow in)
          const barAge = state.blackholeTimer - index * 0.8;
          const growProgress = Math.min(Math.max(barAge / 0.3, 0), 1);
          const animatedHeight = Math.floor(barHeight * growProgress);
          
          if (animatedHeight < 2) return;
          
          // Define pixel-perfect colors
          const brightColor = isGreen ? '#00FF00' : '#FF0000';
          const midColor = isGreen ? '#00CC00' : '#CC0000';
          const darkColor = isGreen ? '#008800' : '#880000';
          const shadowColor = isGreen ? '#004400' : '#440000';
          
          // Upper wick (thin line above candle) - pixel perfect
          const wickTopHeight = 10;
          const wickX = Math.floor(barX + barWidth / 2);
          ctx.fillStyle = midColor;
          ctx.fillRect(wickX, chartY - animatedHeight - wickTopHeight, 2, wickTopHeight);
          
          // Main candle body - pixel art style with clean edges
          // Base fill
          ctx.fillStyle = midColor;
          ctx.fillRect(barX, chartY - animatedHeight, barWidth, animatedHeight);
          
          // Left highlight (2px bright edge)
          ctx.fillStyle = brightColor;
          ctx.fillRect(barX + 1, chartY - animatedHeight + 1, 2, Math.max(1, animatedHeight - 2));
          
          // Right shadow (2px dark edge)
          ctx.fillStyle = darkColor;
          ctx.fillRect(barX + barWidth - 3, chartY - animatedHeight + 1, 2, Math.max(1, animatedHeight - 2));
          
          // Bottom shadow line
          ctx.fillStyle = shadowColor;
          ctx.fillRect(barX + 2, chartY - 2, barWidth - 4, 1);
          
          // Black outline for crisp edges
          ctx.fillStyle = '#000000';
          // Top edge
          ctx.fillRect(barX, chartY - animatedHeight, barWidth, 1);
          // Bottom edge
          ctx.fillRect(barX, chartY - 1, barWidth, 1);
          // Left edge
          ctx.fillRect(barX, chartY - animatedHeight, 1, animatedHeight);
          // Right edge
          ctx.fillRect(barX + barWidth - 1, chartY - animatedHeight, 1, animatedHeight);
          
          // Lower wick (thin line below candle)
          const wickBottomHeight = 8;
          ctx.fillStyle = midColor;
          ctx.fillRect(wickX, chartY, 2, wickBottomHeight);
          
          // Pulsing glow for last bar when complete (alternating frames instead of alpha)
          if (index === state.chartBars.length - 1 && state.chartComplete) {
            const glowFrame = Math.floor(state.blackholeTimer * 5) % 2;
            if (glowFrame === 0) {
              ctx.fillStyle = brightColor;
              // Glow around bar
              ctx.fillRect(barX - 1, chartY - animatedHeight - 1, barWidth + 2, 1);
              ctx.fillRect(barX - 1, chartY, barWidth + 2, 1);
              ctx.fillRect(barX - 1, chartY - animatedHeight, 1, animatedHeight);
              ctx.fillRect(barX + barWidth, chartY - animatedHeight, 1, animatedHeight);
            }
          }
          
          // Pixel art arrow indicator above bar
          if (growProgress > 0.8) {
            const arrowX = barX + Math.floor(barWidth / 2) - 2;
            const arrowY = chartY - animatedHeight - wickTopHeight - 6;
            
            ctx.fillStyle = '#FFFF00';
            if (isGreen) {
              // Up arrow
              ctx.fillRect(arrowX + 2, arrowY, 1, 1);
              ctx.fillRect(arrowX + 1, arrowY + 1, 3, 1);
              ctx.fillRect(arrowX, arrowY + 2, 5, 1);
              ctx.fillRect(arrowX + 2, arrowY + 3, 1, 2);
            } else {
              // Down arrow
              ctx.fillRect(arrowX + 2, arrowY, 1, 2);
              ctx.fillRect(arrowX, arrowY + 2, 5, 1);
              ctx.fillRect(arrowX + 1, arrowY + 3, 3, 1);
              ctx.fillRect(arrowX + 2, arrowY + 4, 1, 1);
            }
            
            // Black outline for arrow
            ctx.fillStyle = '#000000';
            if (isGreen) {
              ctx.fillRect(arrowX + 1, arrowY, 3, 1);
              ctx.fillRect(arrowX, arrowY + 1, 1, 1);
              ctx.fillRect(arrowX + 4, arrowY + 1, 1, 1);
            } else {
              ctx.fillRect(arrowX + 1, arrowY + 4, 3, 1);
              ctx.fillRect(arrowX, arrowY + 3, 1, 1);
              ctx.fillRect(arrowX + 4, arrowY + 3, 1, 1);
            }
          }
        });
        
        // Chart baseline
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(chartStartX - 5, chartY, 90, 1);
        
        // Result message
        if (state.chartComplete) {
          const resultY = GAME_HEIGHT - 20;
          if (state.chartResult === 'green') {
            ctx.fillStyle = '#00FF00';
            ctx.font = 'bold 10px monospace';
            ctx.fillText('GREEN CANDLE!', centerX - 40, resultY);
            ctx.fillText('CONTINUE!', centerX - 30, resultY + 12);
          } else {
            ctx.fillStyle = '#FF0000';
            ctx.font = 'bold 10px monospace';
            ctx.fillText('RED CANDLE!', centerX - 35, resultY);
            ctx.fillText('RESTART!', centerX - 25, resultY + 12);
          }
        } else {
          // Show bar count with better styling
          ctx.fillStyle = '#000000';
          ctx.fillRect(centerX - 32, GAME_HEIGHT - 28, 64, 12);
          ctx.fillStyle = '#00FF00';
          ctx.fillRect(centerX - 30, GAME_HEIGHT - 26, 60, 8);
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 6px monospace';
          ctx.fillText(`BAR ${state.chartBars.length}/5`, centerX - 18, GAME_HEIGHT - 20);
        }
        ctx.restore();
      }
    };

    // Keyboard input
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      // Store both original and lowercase
      gameStateRef.current.keys[e.key] = true;
      gameStateRef.current.keys[key] = true;
      
      
      if (e.key === 'ArrowUp' || key === 'w' || e.key === ' ' || key === 'z') {
        gameStateRef.current.jumpBuffer = JUMP_BUFFER;
        e.preventDefault();
      }
      
      // Prevent arrow key scrolling
      if (e.key.startsWith('Arrow')) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      gameStateRef.current.keys[e.key] = false;
      gameStateRef.current.keys[key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    animationId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [spritesLoaded, currentStage]);

  if (!spritesLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black">
        <style>{`
          @keyframes pixelRotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .pixel-rotate {
            animation: pixelRotate 2s linear infinite;
            image-rendering: pixelated;
          }
        `}</style>
        <img 
          src="/croak.png" 
          alt="Loading..." 
          className="pixel-rotate mb-8" 
          style={{ 
            width: '120px', 
            height: '120px',
            imageRendering: 'pixelated'
          }} 
        />
        <div className="text-green-400 text-2xl mb-4 font-mono font-bold">Loading sprites...</div>
        <div className="w-64 h-4 bg-gray-700 rounded-full overflow-hidden border-2 border-green-600">
          <div className="h-full bg-gradient-to-r from-green-500 to-green-400 animate-pulse" style={{ width: '50%' }}></div>
        </div>
      </div>
    );
  }

  // Mobile button handlers
  const handleMobileButton = (action: string, pressed: boolean) => {
    const state = gameStateRef.current;
    
    // Auto-start music on first mobile button press
    if (pressed && !musicStartedRef.current && bgMusicRef.current && audioEnabled) {
      bgMusicRef.current.play().catch(() => {});
      musicStartedRef.current = true;
    }
    
    if (action === 'left') {
      state.keys['ArrowLeft'] = pressed;
    } else if (action === 'right') {
      state.keys['ArrowRight'] = pressed;
    } else if (action === 'jump') {
      state.keys['ArrowUp'] = pressed;
      if (pressed) state.jumpBuffer = JUMP_BUFFER;
    } else if (action === 'shoot') {
      state.keys['x'] = pressed;
      state.keys['X'] = pressed;
    }
  };

  if (isMobile) {
    // Gameboy-style mobile UI
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-green-100 to-green-200 p-2 overflow-hidden">
        <div className="relative rounded-3xl shadow-2xl w-full max-w-md mx-auto" style={{ background: 'linear-gradient(135deg, rgba(55, 65, 81, 0.95) 0%, rgba(75, 85, 99, 0.9) 50%, rgba(55, 65, 81, 0.95) 100%)', padding: 'clamp(1rem, 4vw, 1.5rem)' }}>
          {/* Logo Only */}
          <div className="flex flex-col items-center mb-3">
            <img src="/flip.png" alt="Flip Game" className="pixelated drop-shadow-2xl" style={{ imageRendering: 'pixelated', height: 'clamp(60px, 15vw, 96px)' }} />
          </div>
          
          {/* Screen */}
          <div className="bg-gray-900 rounded-xl shadow-inner" style={{ boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.5)', padding: 'clamp(0.75rem, 3vw, 1rem)', marginBottom: 'clamp(1rem, 4vw, 1.25rem)' }}>
            <div className="bg-gradient-to-b from-green-800 to-green-900 rounded-lg p-2 mb-2 border-2 border-green-700">
              <div className="flex justify-between font-mono font-bold" style={{ fontSize: 'clamp(0.625rem, 2.5vw, 0.75rem)' }}>
                <span className="text-yellow-200">SCORE: {score}</span>
                <span className="text-cyan-200">STAGE: {currentStage}/10</span>
              </div>
            </div>
            <div className="border-4 border-gray-800 rounded-lg overflow-hidden" style={{ imageRendering: 'pixelated', boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)' }}>
              <canvas
                ref={canvasRef}
                width={GAME_WIDTH}
                height={GAME_HEIGHT}
                style={{
                  width: '100%',
                  height: 'auto',
                  imageRendering: 'pixelated',
                }}
                className="bg-black"
              />
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex justify-between items-end">
            {/* D-Pad */}
            <div className="relative" style={{ width: 'clamp(140px, 35vw, 180px)', height: 'clamp(140px, 35vw, 180px)' }}>
              <div className="absolute inset-0 flex items-center justify-center">
                {/* D-pad cross shape */}
                <div className="relative" style={{ width: '100%', height: '100%' }}>
                  {/* Horizontal bar */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full flex" style={{ height: 'clamp(48px, 12vw, 60px)' }}>
                    {/* Left button */}
                    <button
                      onTouchStart={() => handleMobileButton('left', true)}
                      onTouchEnd={() => handleMobileButton('left', false)}
                      onMouseDown={() => handleMobileButton('left', true)}
                      onMouseUp={() => handleMobileButton('left', false)}
                      onMouseLeave={() => handleMobileButton('left', false)}
                      className="bg-green-900 rounded-l-lg shadow-xl active:bg-green-800 flex items-center justify-center text-white font-bold border-2 border-green-700"
                      style={{ width: '40%', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                    >
                      <svg width="28" height="28" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
                      </svg>
                    </button>
                    {/* Center spacer */}
                    <div style={{ width: '20%' }} />
                    {/* Right button */}
                    <button
                      onTouchStart={() => handleMobileButton('right', true)}
                      onTouchEnd={() => handleMobileButton('right', false)}
                      onMouseDown={() => handleMobileButton('right', true)}
                      onMouseUp={() => handleMobileButton('right', false)}
                      onMouseLeave={() => handleMobileButton('right', false)}
                      className="bg-green-900 rounded-r-lg shadow-xl active:bg-green-800 flex items-center justify-center text-white font-bold border-2 border-green-700"
                      style={{ width: '40%', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                    >
                      <svg width="28" height="28" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 items-center">
                <button
                  onTouchStart={() => handleMobileButton('shoot', true)}
                  onTouchEnd={() => handleMobileButton('shoot', false)}
                  onMouseDown={() => handleMobileButton('shoot', true)}
                  onMouseUp={() => handleMobileButton('shoot', false)}
                  onMouseLeave={() => handleMobileButton('shoot', false)}
                  className="bg-gradient-to-b from-red-600 to-red-800 rounded-full shadow-xl active:from-red-700 active:to-red-900 flex items-center justify-center text-white font-black border-4 border-red-900"
                  style={{ width: 'clamp(64px, 16vw, 80px)', height: 'clamp(64px, 16vw, 80px)', fontSize: 'clamp(1.5rem, 6vw, 2rem)', textShadow: '2px 2px 4px rgba(0,0,0,0.5)', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                >
                  B
                </button>
                <button
                  onTouchStart={() => handleMobileButton('jump', true)}
                  onTouchEnd={() => handleMobileButton('jump', false)}
                  onMouseDown={() => handleMobileButton('jump', true)}
                  onMouseUp={() => handleMobileButton('jump', false)}
                  onMouseLeave={() => handleMobileButton('jump', false)}
                  className="bg-gradient-to-b from-green-600 to-green-800 rounded-full shadow-xl active:from-green-700 active:to-green-900 flex items-center justify-center text-white font-black border-4 border-green-900"
                  style={{ width: 'clamp(96px, 24vw, 112px)', height: 'clamp(96px, 24vw, 112px)', fontSize: 'clamp(2rem, 8vw, 2.5rem)', textShadow: '2px 2px 4px rgba(0,0,0,0.5)', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                >
                  A
                </button>
                <button
                  onClick={() => {
                    if (!audioEnabled && bgMusicRef.current && bgMusicRef.current.paused) {
                      bgMusicRef.current.play().catch(() => {});
                    }
                    setAudioEnabled(!audioEnabled);
                  }}
                  className="bg-gradient-to-b from-green-600 to-green-800 rounded-full shadow-xl active:from-green-700 active:to-green-900 flex items-center justify-center text-white border-4 border-green-900"
                  style={{ width: 'clamp(56px, 14vw, 64px)', height: 'clamp(56px, 14vw, 64px)', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                >
                  {audioEnabled ? (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                  ) : (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
          
          {/* Speaker Holes */}
          <div className="flex justify-center gap-1" style={{ marginTop: 'clamp(1rem, 4vw, 1.25rem)' }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-900 rounded-full opacity-50" style={{ width: 'clamp(4px, 1.5vw, 6px)', height: 'clamp(32px, 8vw, 40px)' }} />
            ))}
          </div>
        </div>

        {/* Wallet Upgrade Modal - Gameboy Style */}
        {showWalletModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}>
            <div className="relative rounded-3xl shadow-2xl w-full max-w-sm" style={{ background: 'linear-gradient(135deg, rgba(55, 65, 81, 0.98) 0%, rgba(75, 85, 99, 0.95) 50%, rgba(55, 65, 81, 0.98) 100%)', padding: '1.5rem', border: '4px solid #374151' }}>
              {/* Screen-like container */}
              <div className="bg-gray-900 rounded-xl shadow-inner p-4" style={{ boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.5)' }}>
                <div className="bg-gradient-to-b from-green-800 to-green-900 rounded-lg p-4 border-4 border-green-700">
                  <div className="text-center mb-4">
                    <div className="inline-block bg-yellow-400 text-black font-bold px-4 py-2 rounded border-2 border-yellow-600 mb-3" style={{ fontFamily: 'monospace', fontSize: '1.2rem', letterSpacing: '2px', imageRendering: 'pixelated' }}>
                      <span className="inline-flex items-center gap-2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
                        </svg>
                        UPGRADE!
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
                        </svg>
                      </span>
                    </div>
                  </div>

                  <div className="bg-black bg-opacity-60 rounded p-3 mb-4 border-2 border-green-600">
                    <p className="text-green-300 font-mono text-center text-sm leading-relaxed mb-3">
                      <span className="inline-flex items-center justify-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6 9h4v6H6zm8 0h4v6h-4zM4 2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/>
                        </svg>
                        <span className="text-yellow-300 font-bold">FLIPPRX</span> has evolved!
                      </span>
                    </p>
                    <p className="text-white font-mono text-center text-xs leading-relaxed mb-3">
                      We&apos;ve upgraded to <span className="text-cyan-400 font-bold">FLIPPRX ONE</span> wallet - 
                      <span className="text-green-400 font-bold"> cheaper</span> and 
                      <span className="text-blue-400 font-bold"> faster</span>!
                    </p>
                    <div className="text-center mb-3">
                      <a 
                        href="https://FLIPPRX.ONE" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-block bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold px-4 py-2 rounded border-2 border-cyan-700 shadow-lg active:from-cyan-600 active:to-blue-700"
                        style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                      >
                        <span className="inline-flex items-center gap-2">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
                          </svg>
                          VISIT FLIPPRX.ONE
                        </span>
                      </a>
                    </div>
                    <p className="text-gray-400 font-mono text-center text-xs">
                      Enjoy playing <span className="text-green-400">FLIPPRX</span>!
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      localStorage.setItem('flipprx_wallet_modal_seen', 'true');
                      setShowWalletModal(false);
                    }}
                    className="w-full bg-gradient-to-b from-green-500 to-green-700 text-white font-bold py-3 px-4 rounded border-4 border-green-800 shadow-xl active:from-green-600 active:to-green-800"
                    style={{ fontFamily: 'monospace', fontSize: '1rem', letterSpacing: '1px' }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                      START PLAYING!
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop - Show mobile-only message
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black p-4">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-8">
          <img src="/flip.png" alt="FLIPPRX Logo" className="pixelated mx-auto drop-shadow-2xl" style={{ imageRendering: 'pixelated', height: '120px' }} />
        </div>
        
        <div className="bg-gradient-to-b from-green-900 to-green-950 border-8 border-green-600 rounded-3xl shadow-2xl p-8 md:p-12">
          <div className="mb-6">
            <div className="inline-block bg-yellow-400 text-black font-bold px-8 py-3 rounded-lg border-4 border-yellow-600 shadow-lg mb-6" style={{ fontFamily: 'monospace', fontSize: '2rem', letterSpacing: '3px' }}>
              <span className="inline-flex items-center gap-3">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 2H7c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H7V4h10v16z"/>
                </svg>
                MOBILE ONLY
              </span>
            </div>
          </div>

          <div className="bg-black bg-opacity-50 rounded-xl p-6 mb-6 border-4 border-green-700">
            <p className="text-white font-mono text-xl leading-relaxed mb-4">
              <span className="inline-flex items-center justify-center gap-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 9h4v6H6zm8 0h4v6h-4zM4 2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/>
                </svg>
                <span className="text-green-400 font-bold">FLIPPRX Pixel Game</span> is designed for mobile devices only!
              </span>
            </p>
            <p className="text-gray-300 font-mono text-lg leading-relaxed mb-6">
              Please open this page on your <span className="text-cyan-400 font-bold">phone</span> or <span className="text-cyan-400 font-bold">tablet</span> to play.
            </p>
            
            <div className="border-t-2 border-green-700 pt-6 mt-6">
              <p className="text-green-300 font-mono text-base mb-4">
                <span className="inline-flex items-center justify-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  Experience the full gameboy-style interface with touch controls!
                </span>
              </p>
            </div>
          </div>

          <div className="text-center">
            <a 
              href="https://FLIPPRX.ONE" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold px-8 py-4 rounded-lg border-4 border-cyan-700 shadow-lg hover:from-cyan-400 hover:to-blue-500 transition-all transform hover:scale-105"
              style={{ fontFamily: 'monospace', fontSize: '1.2rem' }}
            >
              <span className="inline-flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
                </svg>
                VISIT FLIPPRX.ONE
              </span>
            </a>
          </div>
        </div>

        <p className="text-gray-500 font-mono text-sm mt-8">
          Scan QR code or share this link to play on mobile
        </p>
      </div>
    </div>
  );
}
