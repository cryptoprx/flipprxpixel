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
  
  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const audioContextRef = useRef<AudioContext | null>(null);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const spritesRef = useRef<Record<string, HTMLImageElement>>({});
  const gameStateRef = useRef({
    player: {
      x: 80,
      y: 115,
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
    enemies: [] as Array<{ x: number; y: number; direction: number; alive: boolean; type: 'goomba' | 'snake'; waveOffset?: number }>,
    particles: [] as Particle[],
    platforms: [] as Array<{ x: number; y: number; width: number; height: number; type: string; used?: boolean; broken?: boolean; bounceOffset?: number }>,
  });

  // Game constants
  const GAME_WIDTH = 160;
  const GAME_HEIGHT = 144;
  const SCALE = 4;
  
  // Stage widths (in pixels) - each stage gets progressively longer
  const STAGE_WIDTHS = [
    800,   // Stage 1
    1200,  // Stage 2
    1600,  // Stage 3
    2000,  // Stage 4
    2400,  // Stage 5
    2800,  // Stage 6
    3200,  // Stage 7
    3600,  // Stage 8
    4000,  // Stage 9
    4400,  // Stage 10
  ];
  const GRAVITY = 680;
  const PLAYER_SPEED = 110;
  const PLAYER_ACCEL = 900;
  const PLAYER_FRICTION = 1200;
  const AIR_FRICTION = 150;
  const JUMP_VELOCITY = -280;
  const COYOTE_TIME = 0.13;
  const JUMP_BUFFER = 0.18;
  const MAX_FALL_SPEED = 420;

  // Audio system - procedural sound generation
  const playSound = (type: string) => {
    if (!audioEnabled) return;
    
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
      'helmet.png',
    ];

    let loadedCount = 0;
    const totalSprites = spriteFiles.length;

    spriteFiles.forEach(file => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount === totalSprites) {
          setSpritesLoaded(true);
        }
      };
      img.onerror = () => {
        console.error('Failed to load sprite:', file);
        loadedCount++;
        if (loadedCount === totalSprites) {
          setSpritesLoaded(true);
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
    
    // Reset player position and animation state
    state.player.x = 80;
    state.player.y = 115;
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
        playSound('jump');
        
        // Spawn jump particles - enhanced with more variety
        for (let i = 0; i < 12; i++) {
          state.particles.push({
            x: player.x + 8 + (Math.random() - 0.5) * 12,
            y: player.y + 16,
            vx: (Math.random() - 0.5) * 80,
            vy: -Math.random() * 60 - 20,
            life: 0.6,
            maxLife: 0.6,
            color: i % 4 === 0 ? '#FFD700' : i % 4 === 1 ? '#FFA500' : (Math.random() > 0.5 ? '#D2691E' : '#8B4513'),
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
          if (player.x + player.width > platform.x &&
              player.x < platform.x + platform.width &&
              Math.abs(player.y + player.height - platform.y) < 2) {
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
          const wasAbove = oldY + player.height <= platform.y + 4; // Allow 4 pixel tolerance
          const wasBelow = oldY >= platform.y + platform.height;
          
          if (player.velocityY >= 0 && wasAbove) {
            // Landing on top or standing on platform
            const landingSpeed = player.velocityY;
            // Only snap position if actually falling, not when standing still
            if (player.velocityY > 0.1) {
              player.y = platform.y - player.height;
            }
            player.velocityY = 0;
            player.onGround = true;
            
            // Landing particles if falling fast - enhanced
            if (landingSpeed > 120) {
              playSound('land');
              const particleCount = Math.min(12, Math.floor(landingSpeed / 20));
              for (let i = 0; i < particleCount; i++) {
                state.particles.push({
                  x: player.x + 4 + Math.random() * 8,
                  y: player.y + 16,
                  vx: (Math.random() - 0.5) * 60,
                  vy: -Math.random() * 30,
                  life: 0.4,
                  maxLife: 0.4,
                  color: i % 2 === 0 ? '#D2691E' : '#A0522D',
                });
              }
              // Small screen shake on hard landing
              if (landingSpeed > 250) {
                state.screenShake = 0.08;
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
              // Spawn enemy (snake)
              state.enemies.push({
                x: platform.x,
                y: platform.y - 20,
                direction: Math.random() > 0.5 ? 1 : -1,
                alive: true,
                type: 'snake',
                waveOffset: Math.random() * Math.PI * 2
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
          
          // Horizontal collision (hitting sides)
          const wasOnLeft = oldX + player.width <= platform.x;
          const wasOnRight = oldX >= platform.x + platform.width;
          
          if (player.velocityX > 0 && wasOnLeft) {
            player.x = platform.x - player.width;
            player.velocityX = 0;
          } else if (player.velocityX < 0 && wasOnRight) {
            player.x = platform.x + platform.width;
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
      
      // Simple animation logic
      if (!player.onGround) {
        // JUMPING
        player.currentAnimation = 'jump';
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
            
            // Spawn coin particles
            for (let j = 0; j < 12; j++) {
              const angle = (Math.PI * 2 * j) / 12;
              state.particles.push({
                x: coin.x + 4,
                y: coin.y + 4,
                vx: Math.cos(angle) * 80,
                vy: Math.sin(angle) * 80 - 20,
                life: 0.5,
                maxLife: 0.5,
                color: j % 2 === 0 ? '#FFD700' : '#FFA500',
              });
            }
          }
        }
      });

      // Update enemies
      state.enemies.forEach(enemy => {
        if (!enemy.alive) return;
        
        const oldEnemyX = enemy.x;
        const oldEnemyY = enemy.y;
        
        // Different movement for snake vs goomba
        if (enemy.type === 'snake') {
          // Snake moves with wave pattern
          enemy.waveOffset = (enemy.waveOffset || 0) + dt * 4;
          const speed = 35;
          enemy.x += enemy.direction * speed * dt;
          // Slithering wave motion
          const baseY = oldEnemyY;
          enemy.y = baseY + Math.sin(enemy.waveOffset) * 3;
        } else {
          // Goomba moves normally
          enemy.x += enemy.direction * 30 * dt;
        }
        
        // Check for platform edges and walls
        const onPlatform = state.platforms.some(p => 
          enemy.x + 6 > p.x && enemy.x + 6 < p.x + p.width && 
          Math.abs(enemy.y + 12 - p.y) < 4
        );
        
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
        
        if (!onPlatform || hitWall || enemy.x < 0 || enemy.x > state.stageWidth) {
          enemy.direction *= -1;
          enemy.x = oldEnemyX; // Reset position if hit wall
          if (enemy.type === 'snake') enemy.y = oldEnemyY;
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
            player.x = 80;
            player.y = 115;
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

      // Smooth camera follow with screen shake - optimized and pixel perfect
      state.camera.targetX = Math.max(0, Math.min(player.x - GAME_WIDTH / 2, state.stageWidth - GAME_WIDTH));
      const cameraSpeed = player.onGround ? 10 : 8; // Faster camera when on ground
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

      // Death check (fell off stage)
      if (player.y > 200) {
        player.x = 80;
        player.y = 115;
        player.velocityX = 0;
        player.velocityY = 0;
        player.onGround = true;
        state.combo = 0;
        state.comboTimer = 0;
        setScore(0);
      }
    };

    const render = (ctx: CanvasRenderingContext2D) => {
      const state = gameStateRef.current;
      
      // Clear canvas
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      ctx.save();
      // Apply camera transform with shake - pixel perfect
      const shakeX = state.screenShake > 0 ? Math.floor((Math.random() - 0.5) * state.screenShake * 3) : 0;
      ctx.translate(Math.floor(-state.camera.x + shakeX), Math.floor(-state.camera.y));

      // Draw clouds (far background) - pixel perfect
      for (let i = 0; i < 12; i++) {
        const x = Math.floor(i * 100 + 20 - state.camera.x * 0.2);
        const y = Math.floor(20 + (i % 3) * 15);
        // Cloud shape
        ctx.fillRect(x, y + 4, 16, 8);
        ctx.fillRect(x + 4, y, 8, 4);
        ctx.fillRect(x + 12, y + 2, 8, 6);
        // Black outline
        ctx.fillStyle = '#000000';
        ctx.fillRect(x - 1, y + 4, 1, 8);
        ctx.fillRect(x + 16, y + 4, 1, 8);
        ctx.fillRect(x, y + 3, 16, 1);
        ctx.fillRect(x, y + 12, 16, 1);
        ctx.fillRect(x + 4, y - 1, 8, 1);
        ctx.fillRect(x + 12, y + 1, 8, 1);
        ctx.fillStyle = '#FFFFFF';
      }

      // Draw parallax mountains (background) - pixel perfect
      for (let i = 0; i < 10; i++) {
        const x = Math.floor(i * 120 + 60 - state.camera.x * 0.3);
        // Mountain body
        ctx.fillStyle = '#6B7280';
        ctx.fillRect(x - 16, 90, 32, 42);
        ctx.fillRect(x - 12, 82, 24, 8);
        ctx.fillRect(x - 8, 74, 16, 8);
        // Snow cap
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x - 6, 74, 12, 4);
        // Black outline
        ctx.fillStyle = '#000000';
        ctx.fillRect(x - 17, 90, 1, 42);
        ctx.fillRect(x + 16, 90, 1, 42);
        ctx.fillRect(x - 13, 82, 1, 8);
        ctx.fillRect(x + 12, 82, 1, 8);
        ctx.fillRect(x - 9, 74, 1, 8);
        ctx.fillRect(x + 8, 74, 1, 8);
      }

      // Draw parallax hills - pixel perfect
      for (let i = 0; i < 16; i++) {
        const x = Math.floor(i * 80 + 40 - state.camera.x * 0.5);
        ctx.fillStyle = '#22C55E';
        ctx.fillRect(x - 16, 110, 32, 22);
        ctx.fillRect(x - 12, 106, 24, 4);
        // Black outline
        ctx.fillStyle = '#000000';
        ctx.fillRect(x - 17, 110, 1, 22);
        ctx.fillRect(x + 16, 110, 1, 22);
        ctx.fillRect(x - 13, 106, 1, 4);
        ctx.fillRect(x + 12, 106, 1, 4);
      }

      // Draw bushes (foreground decoration) - pixel perfect
      for (let i = 0; i < 20; i++) {
        const x = Math.floor(i * 60 + 10 - state.camera.x * 0.8);
        const y = 120;
        ctx.fillStyle = '#10B981';
        ctx.fillRect(x, y, 12, 8);
        ctx.fillRect(x + 2, y - 2, 8, 2);
        // Black outline
        ctx.fillStyle = '#000000';
        ctx.fillRect(x - 1, y, 1, 8);
        ctx.fillRect(x + 12, y, 1, 8);
        ctx.fillRect(x, y - 1, 12, 1);
        ctx.fillRect(x, y + 8, 12, 1);
        ctx.fillRect(x + 1, y - 2, 1, 2);
        ctx.fillRect(x + 10, y - 2, 1, 2);
        ctx.fillRect(x + 2, y - 3, 8, 1);
      }

      // Draw platforms (skip broken bricks)
      state.platforms.forEach(platform => {
        if (platform.broken) return; // Don't draw broken bricks
        
        if (platform.type === 'ground') {
          // Ground tile with black outline
          ctx.fillStyle = '#000000';
          ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(platform.x + 1, platform.y + 1, platform.width - 2, platform.height - 2);
          ctx.fillStyle = '#D2691E';
          ctx.fillRect(platform.x + 2, platform.y + 2, platform.width - 4, platform.height - 4);
          ctx.fillStyle = '#A0522D';
          for (let i = 0; i < 3; i++) {
            ctx.fillRect(platform.x + 3 + i * 4, platform.y + 3, 2, 2);
          }
        } else if (platform.type === 'brick') {
          // Brick with black outline
          ctx.fillStyle = '#000000';
          ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
          ctx.fillStyle = '#FF6347';
          ctx.fillRect(platform.x + 1, platform.y + 1, platform.width - 2, platform.height - 2);
          ctx.fillStyle = '#FF7F50';
          ctx.fillRect(platform.x + 2, platform.y + 2, platform.width - 4, platform.height - 4);
          ctx.fillStyle = '#8B0000';
          ctx.fillRect(platform.x + 8, platform.y + 1, 1, 7);
          ctx.fillRect(platform.x + 1, platform.y + 8, 7, 1);
        } else if (platform.type === 'question') {
          // Question block with black outline
          ctx.fillStyle = '#000000';
          ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
          
          if (platform.used) {
            // Used block - gray/brown
            ctx.fillStyle = '#8B7355';
            ctx.fillRect(platform.x + 1, platform.y + 1, platform.width - 2, platform.height - 2);
            ctx.fillStyle = '#A0826D';
            ctx.fillRect(platform.x + 3, platform.y + 3, platform.width - 6, platform.height - 6);
          } else {
            // Active question block - gold
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(platform.x + 1, platform.y + 1, platform.width - 2, platform.height - 2);
            ctx.fillStyle = '#FFA500';
            ctx.fillRect(platform.x + 3, platform.y + 3, platform.width - 6, platform.height - 6);
            ctx.fillStyle = '#000000';
            // Draw "?"
            ctx.fillRect(platform.x + 6, platform.y + 5, 2, 2);
            ctx.fillRect(platform.x + 8, platform.y + 5, 2, 2);
            ctx.fillRect(platform.x + 8, platform.y + 7, 2, 2);
            ctx.fillRect(platform.x + 7, platform.y + 9, 2, 2);
            ctx.fillRect(platform.x + 7, platform.y + 12, 2, 2);
          }
        } else if (platform.type === 'pipe') {
          // Pipe with black outline
          ctx.fillStyle = '#000000';
          ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
          ctx.fillStyle = '#228B22';
          ctx.fillRect(platform.x + 1, platform.y + 1, platform.width - 2, platform.height - 2);
          ctx.fillStyle = '#32CD32';
          ctx.fillRect(platform.x + 5, platform.y + 5, 6, 6);
        }
      });

      // Draw coins with black outline - pixel perfect
      state.coins.forEach(coin => {
        if (!coin.collected) {
          const y = Math.floor(coin.y + Math.sin(coin.floatOffset) * 4);
          const x = Math.floor(coin.x);
          // Black outline
          ctx.fillStyle = '#000000';
          ctx.fillRect(x + 1, y, 6, 1);
          ctx.fillRect(x + 1, y + 8, 6, 1);
          ctx.fillRect(x, y + 2, 1, 4);
          ctx.fillRect(x + 7, y + 2, 1, 4);
          ctx.fillRect(x + 2, y - 1, 4, 1);
          ctx.fillRect(x + 2, y + 9, 4, 1);
          // Coin body
          ctx.fillStyle = '#FFD700';
          ctx.fillRect(x + 2, y, 4, 8);
          ctx.fillRect(x, y + 2, 8, 4);
          ctx.fillStyle = '#FFA500';
          ctx.fillRect(x + 3, y + 2, 2, 4);
        }
      });

      // Draw enemies with enhanced visuals - pixel perfect
      state.enemies.forEach(enemy => {
        if (enemy.alive) {
          const ex = Math.floor(enemy.x);
          const ey = Math.floor(enemy.y);
          
          if (enemy.type === 'snake') {
            // Snake enemy - green with scales
            // Black outline
            ctx.fillStyle = '#000000';
            ctx.fillRect(ex - 1, ey + 2, 14, 1);
            ctx.fillRect(ex - 1, ey + 11, 14, 1);
            ctx.fillRect(ex - 1, ey + 2, 1, 9);
            ctx.fillRect(ex + 12, ey + 2, 1, 9);
            // Snake body - green
            ctx.fillStyle = '#00AA00';
            ctx.fillRect(ex, ey + 2, 12, 9);
            ctx.fillStyle = '#00FF00';
            ctx.fillRect(ex + 1, ey + 3, 10, 7);
            // Scale pattern
            ctx.fillStyle = '#008800';
            for (let i = 0; i < 3; i++) {
              ctx.fillRect(ex + 2 + i * 3, ey + 4, 2, 2);
              ctx.fillRect(ex + 3 + i * 3, ey + 7, 2, 2);
            }
            // Snake eyes - red
            ctx.fillStyle = '#FF0000';
            ctx.fillRect(ex + 2, ey + 4, 2, 2);
            ctx.fillRect(ex + 8, ey + 4, 2, 2);
            // Forked tongue
            ctx.fillStyle = '#FF1493';
            ctx.fillRect(ex + 5, ey + 9, 2, 2);
            ctx.fillRect(ex + 4, ey + 10, 1, 1);
            ctx.fillRect(ex + 7, ey + 10, 1, 1);
          } else {
            // Goomba enemy - brown mushroom
            // Black outline
            ctx.fillStyle = '#000000';
            ctx.fillRect(ex - 1, ey + 4, 14, 1);
            ctx.fillRect(ex - 1, ey + 12, 14, 1);
            ctx.fillRect(ex - 1, ey + 4, 1, 8);
            ctx.fillRect(ex + 12, ey + 4, 1, 8);
            // Mushroom cap
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(ex, ey + 4, 12, 8);
            ctx.fillStyle = '#A0522D';
            ctx.fillRect(ex + 1, ey + 5, 10, 6);
            // Spots on cap
            ctx.fillStyle = '#D2691E';
            ctx.fillRect(ex + 2, ey + 6, 2, 2);
            ctx.fillRect(ex + 8, ey + 6, 2, 2);
            // Eyes - angry
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(ex + 2, ey + 7, 3, 3);
            ctx.fillRect(ex + 7, ey + 7, 3, 3);
            ctx.fillStyle = '#000000';
            ctx.fillRect(ex + 3, ey + 8, 1, 1);
            ctx.fillRect(ex + 8, ey + 8, 1, 1);
            // Eyebrows
            ctx.fillRect(ex + 2, ey + 7, 2, 1);
            ctx.fillRect(ex + 8, ey + 7, 2, 1);
          }
        }
      });

      // Draw finish line flag at goal
      const flagX = Math.floor(state.goalX);
      const flagY = 96;
      const flagWave = Math.sin(performance.now() / 200) * 2;
      
      // Flag pole - black outline
      ctx.fillStyle = '#000000';
      ctx.fillRect(flagX - 1, flagY, 3, 33);
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(flagX, flagY, 1, 32);
      
      // Flag - checkered pattern
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
          const isBlack = (row + col) % 2 === 0;
          ctx.fillStyle = isBlack ? '#000000' : '#FFFFFF';
          ctx.fillRect(flagX + 1 + col * 3 + Math.floor(flagWave * (row / 3)), flagY + row * 3, 3, 3);
        }
      }
      
      // Flag outline
      ctx.fillStyle = '#000000';
      ctx.fillRect(flagX + 1, flagY - 1, 12, 1);
      ctx.fillRect(flagX + 1, flagY + 9, 12, 1);
      ctx.fillRect(flagX, flagY, 1, 9);
      ctx.fillRect(flagX + 13, flagY, 1, 9);

      // Draw particles
      state.particles.forEach(p => {
        const alpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), 2, 2);
      });
      ctx.globalAlpha = 1;

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
      
      // Draw player once (with rotation if jumping)
      if (state.player.rotation !== 0) {
        ctx.save();
        ctx.translate(Math.floor(state.player.x + 8), Math.floor(state.player.y + 8));
        ctx.rotate((state.player.rotation * Math.PI) / 180);
        drawPlayerSprite(ctx, -8, -8, frameName, state.player.facingLeft);
        ctx.restore();
      } else {
        drawPlayerSprite(ctx, Math.floor(state.player.x), Math.floor(state.player.y), frameName, state.player.facingLeft);
      }
      
      // Draw helmet if active
      if (state.player.hasHelmet) {
        const helmetFlash = Math.sin(performance.now() / 100) > 0;
        if (helmetFlash) {
          const px = Math.floor(state.player.x);
          const py = Math.floor(state.player.y);
          const helmetSprite = spritesRef.current['helmet.png'];
          
          if (helmetSprite && helmetSprite.complete && helmetSprite.naturalWidth > 0) {
            // Draw helmet.png sprite on player's head
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(helmetSprite, px, py - 2, 16, 16);
            ctx.restore();
          } else {
            // Fallback to pixel-drawn helmet if image not loaded
            ctx.fillStyle = '#C0C0C0';
            ctx.fillRect(px + 1, py - 3, 14, 8);
            ctx.fillRect(px + 2, py - 4, 12, 1);
            ctx.fillStyle = '#A9A9A9';
            ctx.fillRect(px + 2, py - 2, 12, 6);
            ctx.fillStyle = '#E0E0E0';
            ctx.fillRect(px + 3, py - 3, 2, 6);
            ctx.fillStyle = '#000000';
            ctx.fillRect(px + 1, py - 5, 14, 1);
            ctx.fillRect(px, py - 4, 1, 9);
            ctx.fillRect(px + 15, py - 4, 1, 9);
            ctx.fillRect(px + 1, py + 5, 14, 1);
            ctx.fillRect(px + 4, py, 8, 2);
            ctx.fillStyle = '#A9A9A9';
            ctx.fillRect(px + 7, py + 2, 2, 3);
          }
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
      if (state.player.hasHelmet && state.player.helmetTimer > 0) {
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
      if (state.combo > 1 && !state.celebrating) {
        const comboX = Math.floor(state.player.x);
        const bounceOffset = Math.floor(Math.sin(state.comboTimer * 10) * 2);
        const comboY = Math.floor(state.player.y - 12 + bounceOffset);
        const comboAlpha = Math.min(1, state.comboTimer / 1.5);
        const scale = 1 + (1 - state.comboTimer / 3) * 0.3;
        
        ctx.globalAlpha = comboAlpha;
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
        ctx.globalAlpha = 1;
      }

      ctx.restore();
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white text-2xl mb-4">Loading sprites...</div>
        <div className="w-64 h-4 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 animate-pulse" style={{ width: '50%' }}></div>
        </div>
      </div>
    );
  }

  // Mobile button handlers
  const handleMobileButton = (action: string, pressed: boolean) => {
    const state = gameStateRef.current;
    if (action === 'left') {
      state.keys['ArrowLeft'] = pressed;
    } else if (action === 'right') {
      state.keys['ArrowRight'] = pressed;
    } else if (action === 'jump') {
      state.keys['ArrowUp'] = pressed;
      if (pressed) state.jumpBuffer = JUMP_BUFFER;
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
                <div className="relative" style={{ width: 'clamp(120px, 30vw, 150px)', height: 'clamp(120px, 30vw, 150px)' }}>
                  {/* Up */}
                  <button
                    className="absolute left-1/2 top-0 -translate-x-1/2 w-12 h-14 bg-gray-800 rounded-t-lg shadow-lg active:bg-gray-700"
                    style={{ opacity: 0.3 }}
                  />
                  {/* Down */}
                  <button
                    className="absolute left-1/2 bottom-0 -translate-x-1/2 w-12 h-14 bg-gray-800 rounded-b-lg shadow-lg active:bg-gray-700"
                    style={{ opacity: 0.3 }}
                  />
                  {/* Left */}
                  <button
                    onTouchStart={() => handleMobileButton('left', true)}
                    onTouchEnd={() => handleMobileButton('left', false)}
                    onMouseDown={() => handleMobileButton('left', true)}
                    onMouseUp={() => handleMobileButton('left', false)}
                    onMouseLeave={() => handleMobileButton('left', false)}
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-14 h-12 bg-green-900 rounded-l-lg shadow-xl active:bg-green-800 flex items-center justify-center text-white font-bold border-2 border-green-700"
                    style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                  >
                    <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M11 2L5 8l6 6V2z"/>
                    </svg>
                  </button>
                  {/* Right */}
                  <button
                    onTouchStart={() => handleMobileButton('right', true)}
                    onTouchEnd={() => handleMobileButton('right', false)}
                    onMouseDown={() => handleMobileButton('right', true)}
                    onMouseUp={() => handleMobileButton('right', false)}
                    onMouseLeave={() => handleMobileButton('right', false)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-14 h-12 bg-green-900 rounded-r-lg shadow-xl active:bg-green-800 flex items-center justify-center text-white font-bold border-2 border-green-700"
                    style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
                  >
                    <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M5 2v12l6-6-6-6z"/>
                    </svg>
                  </button>
                  {/* Center */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-gray-900 rounded-full" />
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 items-center">
                <button
                  onTouchStart={() => handleMobileButton('jump', true)}
                  onTouchEnd={() => handleMobileButton('jump', false)}
                  onMouseDown={() => handleMobileButton('jump', true)}
                  onMouseUp={() => handleMobileButton('jump', false)}
                  onMouseLeave={() => handleMobileButton('jump', false)}
                  className="bg-gradient-to-b from-green-600 to-green-800 rounded-full shadow-xl active:from-green-700 active:to-green-900 flex items-center justify-center text-white font-black border-4 border-green-900"
                  style={{ width: 'clamp(72px, 18vw, 88px)', height: 'clamp(72px, 18vw, 88px)', fontSize: 'clamp(1.5rem, 6vw, 2rem)', textShadow: '2px 2px 4px rgba(0,0,0,0.5)', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
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
      </div>
    );
  }

  // Desktop UI
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-green-100 via-green-200 to-green-300 overflow-hidden py-2">
      <div className="mb-1 flex items-center justify-center">
        <img src="/flip.png" alt="Flip Game Logo" className="pixelated drop-shadow-2xl" style={{ imageRendering: 'pixelated', height: 'clamp(40px, 5vh, 60px)' }} />
      </div>
      
      <div className="bg-white rounded-2xl shadow-2xl border-4 border-green-800 w-full max-w-4xl mx-auto px-3 py-2">
        <div className="flex flex-wrap gap-2 items-center justify-center mb-2">
          <div className="font-mono text-yellow-600 bg-green-900 px-2 py-1 rounded-lg font-bold" style={{ fontSize: 'clamp(0.75rem, 1.25vw, 0.875rem)' }}>SCORE: {score}</div>
          <div className="font-mono text-cyan-400 bg-green-900 px-2 py-1 rounded-lg font-bold" style={{ fontSize: 'clamp(0.75rem, 1.25vw, 0.875rem)' }}>STAGE: {currentStage}/10</div>
          <button
            onClick={() => {
              if (!audioEnabled && bgMusicRef.current && bgMusicRef.current.paused) {
                bgMusicRef.current.play().catch(() => {});
              }
              setAudioEnabled(!audioEnabled);
            }}
            className={`px-3 py-1 ${audioEnabled ? 'bg-green-700 hover:bg-green-800' : 'bg-red-600 hover:bg-red-700'} text-white rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg`}
            style={{ fontSize: 'clamp(0.625rem, 1vw, 0.75rem)' }}
          >
            {audioEnabled ? '🔊 SOUND ON' : '🔇 SOUND OFF'}
          </button>
        </div>
        
        <div className="border-8 border-green-800 rounded-xl shadow-2xl mx-auto" style={{ imageRendering: 'pixelated', maxWidth: 'min(100%, 960px)' }}>
          <canvas
            ref={canvasRef}
            width={GAME_WIDTH}
            height={GAME_HEIGHT}
            style={{
              width: '100%',
              height: 'auto',
              maxWidth: `${GAME_WIDTH * SCALE}px`,
              imageRendering: 'pixelated',
            }}
            className="bg-black"
          />
        </div>
      </div>
      
      <div className="text-center mt-1">
        <div className="bg-white rounded-lg px-3 py-1.5 inline-block shadow-lg border-2 border-green-800">
          <p className="text-gray-800 font-mono font-semibold" style={{ fontSize: 'clamp(0.5rem, 1vw, 0.75rem)' }}>⬅️ ➡️ Arrow Keys / WASD to move • ⬆️ Space/W/Up to jump</p>
          <p className="text-gray-600" style={{ fontSize: 'clamp(0.4rem, 0.875vw, 0.625rem)' }}>Hold jump longer for higher jumps!</p>
        </div>
      </div>
    </div>
  );
}
