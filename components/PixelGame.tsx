'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { SoundManager } from '../game/audio';
import {
  CHARACTERS,
  FIXED_DT,
  GAME_HEIGHT,
  GAME_WIDTH_BASE,
  JUMP_BUFFER,
} from '../game/constants';
import {
  createInitialGameState,
  loadStageIntoState,
  resetPlayerAbilities,
  updateGameEngine,
} from '../game/engine';
import { renderGame } from '../game/renderer';
import { SpatialGrid } from '../game/spatialGrid';
import { CharacterId, GameScreen, GameState } from '../game/types';

const GUY1_AND_SHARED_SPRITES = [
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

const CHAR_VARIANT_SPRITES = [
  'standing.png',
  'step1.png',
  'step2.png',
  'step3.png',
  'step4.png',
  'jump1.png',
  'jump2.png',
  'jump3.png',
  'jumpfall.png',
];

const BOSS_SPRITES = [
  'mini_idle1.png',
  'mini_idle2.png',
  'mini_charge.png',
  'mini_attack.png',
  'mini_hurt.png',
  'boss_idle1.png',
  'boss_idle2.png',
  'boss_walk1.png',
  'boss_walk2.png',
  'boss_roar.png',
  'boss_attack.png',
  'boss_slam.png',
  'boss_hurt.png',
  'boss_p2_idle1.png',
  'boss_p2_idle2.png',
  'boss_p2_walk1.png',
  'boss_p2_walk2.png',
  'boss_p2_roar.png',
  'boss_p2_attack.png',
  'boss_p2_slam.png',
  'boss_p2_hurt.png',
];

const pxNoSelect = {
  userSelect: 'none' as const,
  WebkitUserSelect: 'none' as const,
  WebkitTouchCallout: 'none' as const,
  touchAction: 'none' as const,
  imageRendering: 'pixelated' as const,
};

export default function PixelGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dpadRef = useRef<HTMLDivElement>(null);

  const [spritesLoaded, setSpritesLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isTouchMode, setIsTouchMode] = useState(true);
  const [gameScreen, setGameScreen] = useState<GameScreen>('title');
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterId>('guy1');
  const [isPaused, setIsPaused] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [scanlinesEnabled, setScanlinesEnabled] = useState(true);

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [bestStage, setBestStage] = useState(1);
  const [currentStage, setCurrentStage] = useState(1);
  const [lives, setLives] = useState(3);
  const [deathCount, setDeathCount] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [activeDpadDir, setActiveDpadDir] = useState<'left' | 'right' | null>(null);
  const [activeBtnA, setActiveBtnA] = useState(false);
  const [activeBtnB, setActiveBtnB] = useState(false);
  const [activeBtnFire, setActiveBtnFire] = useState(false);
  const [waterGunSecs, setWaterGunSecs] = useState(0);

  // Mutable engine refs (persistent across renders without restarting RAF)
  const gameStateRef = useRef<GameState>(createInitialGameState());
  const spatialGridRef = useRef<SpatialGrid>(new SpatialGrid());
  const soundRef = useRef<SoundManager | null>(null);
  const spritesRef = useRef<Record<string, HTMLImageElement>>({});
  const gameWidthRef = useRef<number>(256);
  const waterGunSecsRef = useRef<number>(0);
  const dpadDirRef = useRef<'left' | 'right' | null>(null);

  const screenRef = useRef<GameScreen>('title');
  const pausedRef = useRef(false);
  const charRef = useRef<CharacterId>('guy1');
  const livesRef = useRef(3);
  const highScoreRef = useRef(0);
  const bestStageRef = useRef(1);
  const scanlinesRef = useRef(true);
  const touchModeRef = useRef(true);

  useEffect(() => {
    screenRef.current = gameScreen;
  }, [gameScreen]);
  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);
  useEffect(() => {
    charRef.current = selectedCharacter;
  }, [selectedCharacter]);
  useEffect(() => {
    livesRef.current = lives;
  }, [lives]);
  useEffect(() => {
    highScoreRef.current = highScore;
  }, [highScore]);
  useEffect(() => {
    bestStageRef.current = bestStage;
  }, [bestStage]);
  useEffect(() => {
    scanlinesRef.current = scanlinesEnabled;
  }, [scanlinesEnabled]);
  useEffect(() => {
    touchModeRef.current = isTouchMode;
  }, [isTouchMode]);

  // Persist records helper
  const persistProgress = useCallback((runScore: number, stageReached: number) => {
    if (runScore > highScoreRef.current) {
      highScoreRef.current = runScore;
      setHighScore(runScore);
      setIsNewRecord(true);
      try {
        localStorage.setItem('flipprx_highscore', String(runScore));
      } catch {}
    }
    if (stageReached > bestStageRef.current) {
      bestStageRef.current = stageReached;
      setBestStage(stageReached);
      try {
        localStorage.setItem('flipprx_beststage', String(stageReached));
      } catch {}
    }
  }, []);

  // Load saved records & initialize SoundManager + Stage 1 backdrop
  useEffect(() => {
    try {
      const savedHi = parseInt(localStorage.getItem('flipprx_highscore') || '0', 10);
      const savedStage = parseInt(localStorage.getItem('flipprx_beststage') || '1', 10);
      if (!isNaN(savedHi) && savedHi > 0) {
        setHighScore(savedHi);
        highScoreRef.current = savedHi;
      }
      if (!isNaN(savedStage) && savedStage >= 1) {
        setBestStage(savedStage);
        bestStageRef.current = savedStage;
      }
    } catch {}

    const sm = new SoundManager();
    sm.initMusic();
    soundRef.current = sm;

    loadStageIntoState(gameStateRef.current, spatialGridRef.current, 1);

    return () => {
      sm.destroy();
    };
  }, []);

  // Responsive Device & Aspect-Ratio Canvas Sizing
  useEffect(() => {
    const updateViewport = () => {
      const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
      const smallViewport = window.innerWidth < 860;
      const mobile = uaMobile || coarsePointer || smallViewport;
      setIsTouchMode(mobile);
      touchModeRef.current = mobile;

      let nextW = 256; // Crisp 16:9 widescreen arcade resolution on desktop
      if (mobile) {
        const aspect = window.innerWidth / Math.max(1, window.innerHeight);
        nextW = Math.min(320, Math.max(GAME_WIDTH_BASE, Math.round(GAME_HEIGHT * aspect)));
      }

      gameWidthRef.current = nextW;
      if (canvasRef.current) {
        canvasRef.current.width = nextW;
        canvasRef.current.height = GAME_HEIGHT;
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.imageSmoothingEnabled = false;
      }
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
    };
  }, []);

  // Android / Browser Tab Visibility & Blur Lifecycle
  useEffect(() => {
    const handleVisibility = () => {
      const hidden = document.hidden;
      soundRef.current?.onVisibilityChange(hidden);
      gameStateRef.current.keys = {};
      dpadDirRef.current = null;
      setActiveDpadDir(null);
      setActiveBtnA(false);
      setActiveBtnB(false);
      setActiveBtnFire(false);
      if (hidden && screenRef.current === 'playing') {
        setIsPaused(true);
      }
    };

    const handleBlur = () => {
      gameStateRef.current.keys = {};
      dpadDirRef.current = null;
      setActiveDpadDir(null);
      setActiveBtnA(false);
      setActiveBtnB(false);
      setActiveBtnFire(false);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Preload All Character, Ghost, Helmet & Boss Sprites (Zero cache-busting query strings!)
  useEffect(() => {
    const manifest: Array<{ key: string; src: string }> = [];

    for (const file of GUY1_AND_SHARED_SPRITES) {
      manifest.push({
        key: file,
        src: file === 'helmet.png' ? '/helmet.png' : `/sprites/${file}`,
      });
    }
    for (const file of CHAR_VARIANT_SPRITES) {
      manifest.push({ key: `guy2_${file}`, src: `/sprites/guy2/${file}` });
      manifest.push({ key: `guy3_${file}`, src: `/sprites/guy3/${file}` });
    }
    for (const file of BOSS_SPRITES) {
      manifest.push({ key: file, src: `/sprites/boss/${file}` });
    }

    let count = 0;
    const total = manifest.length;
    const startTime = Date.now();
    const minSplashMs = 650;

    const onSettled = () => {
      count++;
      setLoadProgress(Math.round((count / total) * 100));
      if (count >= total) {
        const wait = Math.max(0, minSplashMs - (Date.now() - startTime));
        setTimeout(() => setSpritesLoaded(true), wait);
      }
    };

    manifest.forEach(({ key, src }) => {
      const img = new Image();
      img.onload = onSettled;
      img.onerror = onSettled;
      img.src = src;
      spritesRef.current[key] = img;
    });
  }, []);

  // Start / Restart Run Action
  const startNewRun = useCallback(() => {
    soundRef.current?.tryStartMusic();
    const state = gameStateRef.current;
    state.score = 0;
    state.keys = {};
    loadStageIntoState(state, spatialGridRef.current, 1);

    setScore(0);
    setCurrentStage(1);
    setLives(3);
    livesRef.current = 3;
    waterGunSecsRef.current = 0;
    setWaterGunSecs(0);
    dpadDirRef.current = null;
    setActiveDpadDir(null);
    setActiveBtnFire(false);
    setDeathCount(0);
    setGameWon(false);
    setIsNewRecord(false);
    setIsPaused(false);
    setGameScreen('playing');
  }, []);

  const restartCurrentStage = useCallback(() => {
    const state = gameStateRef.current;
    state.keys = {};
    loadStageIntoState(state, spatialGridRef.current, state.currentStage);
    waterGunSecsRef.current = 0;
    setWaterGunSecs(0);
    dpadDirRef.current = null;
    setActiveDpadDir(null);
    setActiveBtnFire(false);
    setIsPaused(false);
  }, []);

  // Single Persistent Fixed-Timestep Game Loop + Keyboard + Gamepad Support
  useEffect(() => {
    if (!spritesLoaded) return;

    let rafId = 0;
    let lastTime = performance.now();
    let accumulator = 0;
    let prevPadJump = false;
    let prevPadAction = false;
    let prevPadShoot = false;
    let prevPadStart = false;

    const pollGamepad = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const pad = pads && (pads[0] || pads[1] || pads[2] || pads[3]);
      if (!pad) return;

      const state = gameStateRef.current;
      const axisX = pad.axes[0] || 0;
      const axisY = pad.axes[1] || 0;
      const dLeft = pad.buttons[14]?.pressed || axisX < -0.35;
      const dRight = pad.buttons[15]?.pressed || axisX > 0.35;
      const dDown = pad.buttons[13]?.pressed || axisY > 0.45;
      const jumpBtn = !!(pad.buttons[0]?.pressed || pad.buttons[12]?.pressed);
      const abilityOnlyBtn = !!(pad.buttons[1]?.pressed || pad.buttons[5]?.pressed);
      const fireOrAltBtn = !!(pad.buttons[2]?.pressed || pad.buttons[7]?.pressed);
      const hasGun = state.player.hasWaterGun;
      const actionBtn = hasGun ? abilityOnlyBtn : abilityOnlyBtn || fireOrAltBtn;
      const shootBtn = hasGun && fireOrAltBtn;
      const startBtn = !!pad.buttons[9]?.pressed;

      if (startBtn && !prevPadStart) {
        if (screenRef.current === 'title' || screenRef.current === 'gameover') {
          startNewRun();
        } else if (screenRef.current === 'playing') {
          setIsPaused((p) => !p);
        }
      }
      prevPadStart = startBtn;

      if (screenRef.current !== 'playing' || pausedRef.current) return;

      state.keys['PadLeft'] = dLeft;
      state.keys['PadRight'] = dRight;
      state.keys['ArrowLeft'] = !!(state.keys['KeyLeft'] || state.keys['TouchLeft'] || dLeft);
      state.keys['ArrowRight'] = !!(state.keys['KeyRight'] || state.keys['TouchRight'] || dRight);
      state.keys['ArrowDown'] = !!(state.keys['KeyDown'] || dDown);

      if (jumpBtn && !prevPadJump) {
        state.jumpBuffer = JUMP_BUFFER;
      }
      state.keys[' '] = !!(state.keys['KeyJump'] || state.keys['TouchJump'] || jumpBtn);
      prevPadJump = jumpBtn;

      if (actionBtn && !prevPadAction) {
        state.abilityJustPressed = true;
      }
      state.keys['ActionB'] = !!(state.keys['KeyAction'] || state.keys['TouchAction'] || actionBtn);
      prevPadAction = actionBtn;

      if (shootBtn && !prevPadShoot) {
        state.shootJustPressed = true;
      }
      state.keys['PadShoot'] = shootBtn;
      state.keys['ShootWater'] = !!(state.keys['TouchShoot'] || shootBtn);
      prevPadShoot = shootBtn;
    };

    const tick = (now: number) => {
      let rawDt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;

      // Snap slight VSync timestamp jitter on 60Hz (~16.67ms) & 120Hz (~8.33ms) displays
      // so fixed-timestep physics steps at a rock-steady cadence with zero 0/2 frame beat!
      if (Math.abs(rawDt - FIXED_DT) < 0.0015) {
        rawDt = FIXED_DT;
      } else if (Math.abs(rawDt - FIXED_DT * 0.5) < 0.0008) {
        rawDt = FIXED_DT * 0.5;
      }

      pollGamepad();

      const state = gameStateRef.current;
      const sound = soundRef.current!;

      let renderAlpha = 1;
      if (screenRef.current === 'playing' && !pausedRef.current) {
        accumulator += rawDt;
        let steps = 0;
        while (accumulator >= FIXED_DT && steps < 3) {
          updateGameEngine(
            state,
            spatialGridRef.current,
            FIXED_DT,
            gameWidthRef.current,
            charRef.current,
            sound,
            {
              onScoreChange: (newScore) => setScore(newScore),
              onStageAdvance: (nextStage) => {
                setCurrentStage(nextStage);
                persistProgress(state.score, nextStage);
              },
              onPlayerLoseLife: () => {
                setDeathCount((d) => d + 1);
                if (livesRef.current <= 1) {
                  livesRef.current = 0;
                  setLives(0);
                  setGameWon(false);
                  persistProgress(state.score, state.currentStage);
                  setGameScreen('gameover');
                } else {
                  const nextLives = livesRef.current - 1;
                  livesRef.current = nextLives;
                  setLives(nextLives);
                }
              },
              onGameWin: () => {
                setGameWon(true);
                persistProgress(state.score, 10);
                setGameScreen('gameover');
              },
              vibrate: (ms) => {
                if (touchModeRef.current && typeof navigator !== 'undefined' && navigator.vibrate) {
                  try {
                    navigator.vibrate(ms);
                  } catch {}
                }
              },
            }
          );
          accumulator -= FIXED_DT;
          steps++;
          if (screenRef.current !== 'playing') {
            accumulator = 0;
            break;
          }
        }
        if (steps >= 3 && accumulator >= FIXED_DT) {
          accumulator = 0;
        }
        renderAlpha =
          screenRef.current === 'playing'
            ? Math.min(1, Math.max(0, accumulator / FIXED_DT))
            : 1;
      } else if (screenRef.current === 'title') {
        // Gentle idle camera drift on Title Screen backdrop
        state.camera.x = (now * 0.018) % Math.max(1, state.stageWidth - gameWidthRef.current);
        state.camera.prevX = state.camera.x;
        state.gameStarted = true;
      }

      const nextGunSecs =
        state.player.hasWaterGun && !state.celebrating
          ? Math.max(1, Math.ceil(state.player.waterGunTimer))
          : 0;
      if (nextGunSecs !== waterGunSecsRef.current) {
        waterGunSecsRef.current = nextGunSecs;
        setWaterGunSecs(nextGunSecs);
        if (nextGunSecs === 0) setActiveBtnFire(false);
      }

      const canvas = canvasRef.current;
      if (canvas) {
        if (canvas.width !== gameWidthRef.current) {
          canvas.width = gameWidthRef.current;
        }
        if (canvas.height !== GAME_HEIGHT) {
          canvas.height = GAME_HEIGHT;
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderGame(
            ctx,
            state,
            gameWidthRef.current,
            charRef.current,
            livesRef.current,
            spritesRef.current,
            scanlinesRef.current,
            now,
            renderAlpha
          );
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key;
      const low = k.toLowerCase();

      soundRef.current?.tryStartMusic();

      if (k === 'Escape' || low === 'p') {
        if (screenRef.current === 'playing') {
          setIsPaused((p) => !p);
          e.preventDefault();
        }
        return;
      }

      if (screenRef.current === 'title') {
        if (k === 'Enter' || k === ' ') {
          startNewRun();
          e.preventDefault();
        } else if (k === 'ArrowLeft' || low === 'a') {
          setSelectedCharacter((prev) =>
            prev === 'guy1' ? 'guy3' : prev === 'guy2' ? 'guy1' : 'guy2'
          );
        } else if (k === 'ArrowRight' || low === 'd') {
          setSelectedCharacter((prev) =>
            prev === 'guy1' ? 'guy2' : prev === 'guy2' ? 'guy3' : 'guy1'
          );
        }
        return;
      }

      if (screenRef.current === 'gameover') {
        if (k === 'Enter' || k === ' ') {
          startNewRun();
          e.preventDefault();
        }
        return;
      }

      const state = gameStateRef.current;
      if (e.repeat) {
        if (k.startsWith('Arrow') || k === ' ') e.preventDefault();
        return;
      }

      state.keys[k] = true;
      state.keys[low] = true;

      if (k === 'ArrowLeft') state.keys['RawArrowLeft'] = true;
      if (k === 'ArrowRight') state.keys['RawArrowRight'] = true;
      if (k === 'ArrowDown') state.keys['RawArrowDown'] = true;

      if (k === 'ArrowLeft' || low === 'a') {
        state.keys['KeyLeft'] = true;
        state.keys['ArrowLeft'] = true;
      }
      if (k === 'ArrowRight' || low === 'd') {
        state.keys['KeyRight'] = true;
        state.keys['ArrowRight'] = true;
      }
      if (k === 'ArrowDown' || low === 's') {
        state.keys['KeyDown'] = true;
        state.keys['ArrowDown'] = true;
      }

      if (k === 'ArrowUp' || low === 'w' || k === ' ' || low === 'z') {
        state.keys['KeyJump'] = true;
        state.jumpBuffer = JUMP_BUFFER;
        e.preventDefault();
      }

      if (k === 'Shift') {
        state.keys['KeyAction'] = true;
        state.keys['ActionB'] = true;
        state.abilityJustPressed = true;
        e.preventDefault();
      } else if (low === 'f') {
        state.keys['KeyShoot'] = true;
        state.shootJustPressed = true;
        e.preventDefault();
      } else if (low === 'x') {
        if (state.player.hasWaterGun) {
          state.keys['KeyShoot'] = true;
          state.shootJustPressed = true;
        } else {
          state.keys['KeyAction'] = true;
          state.keys['ActionB'] = true;
          state.abilityJustPressed = true;
        }
        e.preventDefault();
      }

      if (low === 'c' && state.player.x < 200) {
        resetPlayerAbilities(state.player);
        setSelectedCharacter((prev) =>
          prev === 'guy1' ? 'guy2' : prev === 'guy2' ? 'guy3' : 'guy1'
        );
      }

      if (k.startsWith('Arrow')) e.preventDefault();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key;
      const low = k.toLowerCase();
      const state = gameStateRef.current;
      state.keys[k] = false;
      state.keys[low] = false;

      if (k === 'ArrowLeft') state.keys['RawArrowLeft'] = false;
      if (k === 'ArrowRight') state.keys['RawArrowRight'] = false;
      if (k === 'ArrowDown') state.keys['RawArrowDown'] = false;

      if (k === 'ArrowLeft' || low === 'a') {
        state.keys['KeyLeft'] = !!(state.keys['RawArrowLeft'] || state.keys['a']);
        state.keys['ArrowLeft'] = !!(
          state.keys['KeyLeft'] ||
          state.keys['TouchLeft'] ||
          state.keys['PadLeft']
        );
      }
      if (k === 'ArrowRight' || low === 'd') {
        state.keys['KeyRight'] = !!(state.keys['RawArrowRight'] || state.keys['d']);
        state.keys['ArrowRight'] = !!(
          state.keys['KeyRight'] ||
          state.keys['TouchRight'] ||
          state.keys['PadRight']
        );
      }
      if (k === 'ArrowDown' || low === 's') {
        state.keys['KeyDown'] = !!(state.keys['RawArrowDown'] || state.keys['s']);
        state.keys['ArrowDown'] = !!state.keys['KeyDown'];
      }
      if (k === 'ArrowUp' || low === 'w' || k === ' ' || low === 'z') state.keys['KeyJump'] = false;
      if (k === 'Shift' || low === 'x') {
        state.keys['KeyAction'] = false;
        state.keys['ActionB'] = !!state.keys['TouchAction'];
      }
      if (low === 'f' || low === 'x') {
        state.keys['KeyShoot'] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [spritesLoaded, startNewRun, persistProgress]);

  // Unified Slideable Multi-Touch D-Pad Handler (Zero center deadzone + zero redundant React renders!)
  const updateDpadFromClientX = (clientX: number | null) => {
    const state = gameStateRef.current;

    if (clientX === null || !dpadRef.current) {
      state.keys['TouchLeft'] = false;
      state.keys['TouchRight'] = false;
      state.keys['ArrowLeft'] = !!(state.keys['KeyLeft'] || state.keys['PadLeft']);
      state.keys['ArrowRight'] = !!(state.keys['KeyRight'] || state.keys['PadRight']);
      if (dpadDirRef.current !== null) {
        dpadDirRef.current = null;
        setActiveDpadDir(null);
      }
      return;
    }

    const rect = dpadRef.current.getBoundingClientRect();
    const relX = clientX - (rect.left + rect.width / 2);
    const prevDir = dpadDirRef.current;
    const nextDir: 'left' | 'right' =
      prevDir === 'left'
        ? relX > 3
          ? 'right'
          : 'left'
        : prevDir === 'right'
          ? relX < -3
            ? 'left'
            : 'right'
          : relX < 0
            ? 'left'
            : 'right';

    state.keys['TouchLeft'] = nextDir === 'left';
    state.keys['TouchRight'] = nextDir === 'right';
    state.keys['ArrowLeft'] = nextDir === 'left' || !!(state.keys['KeyLeft'] || state.keys['PadLeft']);
    state.keys['ArrowRight'] =
      nextDir === 'right' || !!(state.keys['KeyRight'] || state.keys['PadRight']);

    if (prevDir !== nextDir) {
      soundRef.current?.tryStartMusic();
      dpadDirRef.current = nextDir;
      setActiveDpadDir(nextDir);
    }
  };

  const handleDpadTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!dpadRef.current) return;
    const rect = dpadRef.current.getBoundingClientRect();
    let matchedTouch: React.Touch | null = null;
    for (let i = 0; i < e.touches.length; i++) {
      const t = e.touches[i];
      if (
        t.clientX >= rect.left - 36 &&
        t.clientX <= rect.right + 36 &&
        t.clientY >= rect.top - 48 &&
        t.clientY <= rect.bottom + 48
      ) {
        matchedTouch = t;
        break;
      }
    }
    updateDpadFromClientX(matchedTouch ? matchedTouch.clientX : null);
  };

  const handleJumpBtn = (pressed: boolean, e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    soundRef.current?.tryStartMusic();
    const state = gameStateRef.current;
    state.keys['TouchJump'] = pressed;
    state.keys['ArrowUp'] = pressed || !!state.keys['KeyJump'];
    if (pressed) {
      state.jumpBuffer = JUMP_BUFFER;
    }
    setActiveBtnA(pressed);
  };

  const handleActionBtn = (pressed: boolean, e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    soundRef.current?.tryStartMusic();
    const state = gameStateRef.current;
    state.keys['TouchAction'] = pressed;
    state.keys['ActionB'] = pressed || !!state.keys['KeyAction'];
    if (pressed) {
      state.abilityJustPressed = true;
    }
    setActiveBtnB(pressed);
  };

  const handleFireBtn = (pressed: boolean, e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    soundRef.current?.tryStartMusic();
    const state = gameStateRef.current;
    state.keys['TouchShoot'] = pressed;
    state.keys['ShootWater'] = pressed || !!state.keys['PadShoot'];
    if (pressed) {
      state.shootJustPressed = true;
    }
    setActiveBtnFire(pressed);
  };

  const toggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    soundRef.current?.setEnabled(next);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  // Loading Splash Screen
  if (!spritesLoaded) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen"
        style={{ background: '#070912' }}
      >
        <style>{`
          @keyframes pixelBounce {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
          }
        `}</style>
        <img
          src="/croak.png"
          alt="Loading FLIPPRX..."
          style={{
            width: '64px',
            height: '64px',
            imageRendering: 'pixelated',
            animation: 'pixelBounce 0.9s ease-in-out infinite',
            marginBottom: '20px',
          }}
        />
        <div
          style={{
            color: '#4ADE80',
            fontSize: '10px',
            marginBottom: '14px',
            letterSpacing: '2px',
          }}
        >
          LOADING... {loadProgress}%
        </div>
        <div
          style={{
            width: '176px',
            height: '10px',
            background: '#0F172A',
            border: '2px solid #4ADE80',
            padding: '1px',
          }}
        >
          <div
            style={{
              width: `${loadProgress}%`,
              height: '100%',
              background: '#4ADE80',
              transition: 'width 120ms linear',
            }}
          />
        </div>
      </div>
    );
  }

  const charMeta = CHARACTERS[selectedCharacter];
  const bButtonLabel =
    selectedCharacter === 'guy1' ? 'DASH' : selectedCharacter === 'guy2' ? 'BOOST' : 'SLAM';

  // Shared Overlays (Title, Pause, Game Over / Victory) rendered inside the game viewport
  const renderOverlays = () => (
    <>
      {/* === TITLE SCREEN OVERLAY === */}
      {gameScreen === 'title' && (
        <div
          className="absolute inset-0 z-30 flex flex-col items-center justify-center px-3 py-2 overflow-y-auto"
          style={{ background: 'rgba(6, 9, 18, 0.84)', backdropFilter: 'blur(2px)' }}
        >
          <style>{`
            @keyframes titlePulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
            @keyframes startPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(74,222,128,0.45); } 50% { box-shadow: 0 0 18px 2px rgba(74,222,128,0.45); } }
          `}</style>

          {/* Single Centered Pixel-Art FLIPPRX Logo + Edition Subtitle */}
          <div className="flex flex-col items-center mb-2">
            <img
              src="/flip-pixel.png"
              alt="FLIPPRX"
              style={{
                width: 'clamp(104px, 21vw, 152px)',
                height: 'auto',
                imageRendering: 'pixelated',
                animation: 'titlePulse 2.2s ease-in-out infinite',
              }}
            />
            <div
              style={{
                color: '#4ADE80',
                fontSize: 'clamp(6.5px, 1.3vw, 8.5px)',
                letterSpacing: '2px',
                marginTop: '3px',
                textShadow: '1px 1px 0 #000',
              }}
            >
              PIXEL OVERLORD EDITION
            </div>
          </div>

          {/* High Score & Best Stage Ribbon */}
          <div
            className="flex items-center gap-4 mb-3 px-3 py-1"
            style={{
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid #334155',
              fontSize: '7px',
              letterSpacing: '1px',
            }}
          >
            <span style={{ color: '#FDE047' }}>HI-SCORE: {highScore}</span>
            <span style={{ color: '#38BDF8' }}>BEST STAGE: {bestStage}/10</span>
          </div>

          {/* Interactive Character Cards */}
          <div
            style={{
              color: '#94A3B8',
              fontSize: '6px',
              letterSpacing: '1.5px',
              marginBottom: '6px',
            }}
          >
            CHOOSE YOUR HERO
          </div>

          <div className="grid grid-cols-3 gap-2 w-full max-w-md mb-3">
            {(['guy1', 'guy2', 'guy3'] as const).map((cid) => {
              const c = CHARACTERS[cid];
              const selected = selectedCharacter === cid;
              const spriteSrc =
                cid === 'guy1' ? '/sprites/standing.png' : `/sprites/${cid}/standing.png`;

              return (
                <button
                  key={cid}
                  type="button"
                  onClick={() => setSelectedCharacter(cid)}
                  className="flex flex-col items-center p-2 transition-transform active:scale-95"
                  style={{
                    ...pxNoSelect,
                    touchAction: 'manipulation',
                    background: selected ? 'rgba(15, 23, 42, 0.96)' : 'rgba(15, 23, 42, 0.68)',
                    border: `2px solid ${selected ? c.color : '#334155'}`,
                    boxShadow: selected ? `0 0 12px ${c.color}44` : 'none',
                  }}
                >
                  <img
                    src={spriteSrc}
                    alt={c.name}
                    style={{
                      width: '32px',
                      height: '32px',
                      imageRendering: 'pixelated',
                      marginBottom: '4px',
                    }}
                  />
                  <div
                    style={{
                      color: selected ? c.color : '#CBD5E1',
                      fontSize: 'clamp(6px, 1.3vw, 8px)',
                      letterSpacing: '0.5px',
                      marginBottom: '4px',
                    }}
                  >
                    {c.name}
                  </div>
                  {/* Mini Stat Bars */}
                  <div className="w-full space-y-1">
                    {(
                      [
                        ['SPD', c.stats.speed],
                        ['JMP', c.stats.jump],
                        ['PWR', c.stats.power],
                      ] as const
                    ).map(([lbl, val]) => (
                      <div key={lbl} className="flex items-center gap-1">
                        <span style={{ fontSize: '5px', color: '#94A3B8', width: '16px' }}>
                          {lbl}
                        </span>
                        <div className="flex-1 flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <div
                              key={n}
                              style={{
                                height: '3px',
                                flex: 1,
                                background: n <= val ? c.color : '#1E293B',
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Character Ability Readout */}
          <div
            className="w-full max-w-md px-3 py-1.5 mb-3 text-center"
            style={{
              background: 'rgba(15, 23, 42, 0.92)',
              border: `1px solid ${charMeta.color}66`,
            }}
          >
            <div style={{ color: charMeta.color, fontSize: '7px', marginBottom: '2px' }}>
              {charMeta.abilityName}
            </div>
            <div style={{ color: '#E2E8F0', fontSize: '5.5px', lineHeight: '1.5' }}>
              {charMeta.abilityHint}
            </div>
          </div>

          {/* Tactile Start Button */}
          <button
            type="button"
            onClick={startNewRun}
            className="px-6 py-2.5 transition-transform active:scale-95"
            style={{
              ...pxNoSelect,
              touchAction: 'manipulation',
              background: '#22C55E',
              color: '#052E16',
              border: '2px solid #86EFAC',
              fontSize: 'clamp(9px, 1.8vw, 12px)',
              letterSpacing: '2px',
              animation: 'startPulse 1.8s ease-in-out infinite',
            }}
          >
            ▶ PLAY GAME
          </button>
        </div>
      )}

      {/* === PAUSE MENU OVERLAY === */}
      {isPaused && gameScreen === 'playing' && (
        <div
          className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2.5 px-4"
          style={{ background: 'rgba(6, 9, 18, 0.86)' }}
        >
          <div
            style={{
              color: '#FDE047',
              fontSize: '14px',
              letterSpacing: '3px',
              marginBottom: '8px',
            }}
          >
            PAUSED
          </div>

          <button
            type="button"
            onClick={() => setIsPaused(false)}
            style={{
              ...pxNoSelect,
              touchAction: 'manipulation',
              width: '190px',
              padding: '9px 14px',
              color: '#052E16',
              background: '#4ADE80',
              border: '2px solid #86EFAC',
              fontSize: '8px',
              letterSpacing: '1.5px',
            }}
          >
            RESUME
          </button>

          <button
            type="button"
            onClick={restartCurrentStage}
            style={{
              ...pxNoSelect,
              touchAction: 'manipulation',
              width: '190px',
              padding: '8px 14px',
              color: '#38BDF8',
              background: 'rgba(15,23,42,0.9)',
              border: '2px solid #38BDF8',
              fontSize: '7px',
              letterSpacing: '1px',
            }}
          >
            RESTART STAGE {currentStage}
          </button>

          <button
            type="button"
            onClick={() => setScanlinesEnabled((s) => !s)}
            style={{
              ...pxNoSelect,
              touchAction: 'manipulation',
              width: '190px',
              padding: '8px 14px',
              color: '#E2E8F0',
              background: 'rgba(15,23,42,0.9)',
              border: '2px solid #475569',
              fontSize: '7px',
              letterSpacing: '1px',
            }}
          >
            CRT LINES: {scanlinesEnabled ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            onClick={toggleAudio}
            style={{
              ...pxNoSelect,
              touchAction: 'manipulation',
              width: '190px',
              padding: '8px 14px',
              color: audioEnabled ? '#FDE047' : '#94A3B8',
              background: 'rgba(15,23,42,0.9)',
              border: '2px solid #475569',
              fontSize: '7px',
              letterSpacing: '1px',
            }}
          >
            SOUND: {audioEnabled ? 'ON' : 'MUTED'}
          </button>

          <button
            type="button"
            onClick={() => {
              persistProgress(score, currentStage);
              setIsPaused(false);
              setGameScreen('title');
            }}
            style={{
              ...pxNoSelect,
              touchAction: 'manipulation',
              width: '190px',
              padding: '8px 14px',
              color: '#F87171',
              background: 'rgba(15,23,42,0.9)',
              border: '2px solid #EF4444',
              fontSize: '7px',
              letterSpacing: '1px',
            }}
          >
            QUIT TO TITLE
          </button>
        </div>
      )}

      {/* === GAME OVER / FINAL VICTORY OVERLAY === */}
      {gameScreen === 'gameover' && (
        <div
          className="absolute inset-0 z-30 flex flex-col items-center justify-center px-4"
          style={{ background: 'rgba(6, 9, 18, 0.92)' }}
        >
          {gameWon && (
            <img
              src="/sprites/boss/boss_p2_hurt.png"
              alt="Overlord Defeated"
              style={{
                width: '56px',
                height: '53px',
                imageRendering: 'pixelated',
                marginBottom: '6px',
              }}
            />
          )}

          <div
            style={{
              color: gameWon ? '#FDE047' : '#EF4444',
              fontSize: 'clamp(13px, 3vw, 18px)',
              letterSpacing: '3px',
              marginBottom: '4px',
              textShadow: '2px 2px 0 #000',
            }}
          >
            {gameWon ? 'CHAMPION!' : 'GAME OVER'}
          </div>

          <div
            style={{
              color: gameWon ? '#4ADE80' : '#94A3B8',
              fontSize: '7px',
              letterSpacing: '1px',
              marginBottom: '14px',
            }}
          >
            {gameWon ? 'OVERLORD REKTUS DEFEATED!' : `FELL ON STAGE ${currentStage}`}
          </div>

          <div
            className="px-6 py-3 mb-4 text-center space-y-1.5"
            style={{
              background: 'rgba(15, 23, 42, 0.95)',
              border: `2px solid ${gameWon ? '#FACC15' : '#334155'}`,
            }}
          >
            <div style={{ color: '#FDE047', fontSize: '9px' }}>SCORE: {score}</div>
            <div style={{ color: '#38BDF8', fontSize: '7px' }}>HI-SCORE: {highScore}</div>
            <div style={{ color: '#CBD5E1', fontSize: '6.5px' }}>STAGE: {currentStage}/10</div>
            <div style={{ color: '#CBD5E1', fontSize: '6.5px' }}>DEATHS: {deathCount}</div>
            {isNewRecord && (
              <div style={{ color: '#4ADE80', fontSize: '8px', paddingTop: '4px' }}>
                ★ NEW HIGH SCORE! ★
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={startNewRun}
              style={{
                ...pxNoSelect,
                touchAction: 'manipulation',
                padding: '10px 18px',
                background: '#4ADE80',
                color: '#052E16',
                border: '2px solid #86EFAC',
                fontSize: '8px',
                letterSpacing: '1.5px',
              }}
            >
              PLAY AGAIN
            </button>

            <button
              type="button"
              onClick={() => setGameScreen('title')}
              style={{
                ...pxNoSelect,
                touchAction: 'manipulation',
                padding: '10px 14px',
                background: 'rgba(15,23,42,0.9)',
                color: '#E2E8F0',
                border: '2px solid #64748B',
                fontSize: '8px',
                letterSpacing: '1px',
              }}
            >
              HEROES
            </button>
          </div>
        </div>
      )}
    </>
  );

  // ============================================================================
  // 1. MOBILE / FULLSCREEN TOUCH MODE (Android TWA + Capacitor + Mobile Web)
  // ============================================================================
  if (isTouchMode) {
    return (
      <div
        ref={containerRef}
        className="fixed inset-0 overflow-hidden bg-black"
        style={pxNoSelect}
        onContextMenu={(e) => e.preventDefault()}
      >
        <canvas
          ref={canvasRef}
          width={gameWidthRef.current}
          height={GAME_HEIGHT}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            imageRendering: 'pixelated',
          }}
        />

        {renderOverlays()}

        {/* Compact Top Bar */}
        {gameScreen === 'playing' && !isPaused && (
          <div
            className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between"
            style={{
              padding: '4px 10px',
              paddingTop: 'max(4px, env(safe-area-inset-top, 4px))',
              background: 'linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 100%)',
            }}
          >
            <button
              type="button"
              onClick={() => setIsPaused(true)}
              style={{
                ...pxNoSelect,
                touchAction: 'manipulation',
                color: '#FFFFFF',
                fontSize: '7px',
                padding: '4px 8px',
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(255,255,255,0.35)',
              }}
            >
              II
            </button>

            <div
              className="flex items-center gap-3"
              style={{ fontSize: '7px', letterSpacing: '1px', textShadow: '1px 1px 0 #000' }}
            >
              <span style={{ color: '#FFFFFF' }}>{score}</span>
              <span style={{ color: '#FDE047' }}>STG {currentStage}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const player = gameStateRef.current.player;
                  if (player.x < 200) {
                    resetPlayerAbilities(player);
                    setSelectedCharacter((prev) =>
                      prev === 'guy1' ? 'guy2' : prev === 'guy2' ? 'guy3' : 'guy1'
                    );
                  }
                }}
                style={{
                  ...pxNoSelect,
                  touchAction: 'manipulation',
                  color: charMeta.color,
                  fontSize: '5.5px',
                  padding: '3px 6px',
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: `1px solid ${charMeta.color}88`,
                }}
              >
                {charMeta.shortLabel}
              </button>

              <button
                type="button"
                onClick={toggleAudio}
                style={{
                  ...pxNoSelect,
                  touchAction: 'manipulation',
                  color: audioEnabled ? '#4ADE80' : '#64748B',
                  fontSize: '7px',
                  padding: '3px 7px',
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255,255,255,0.25)',
                }}
              >
                {audioEnabled ? '♪' : '×'}
              </button>
            </div>
          </div>
        )}

        {/* Thumb-Slideable Multi-Touch D-Pad (Left Side) */}
        {gameScreen === 'playing' && !isPaused && (
          <div
            ref={dpadRef}
            onTouchStart={handleDpadTouch}
            onTouchMove={handleDpadTouch}
            onTouchEnd={handleDpadTouch}
            onTouchCancel={handleDpadTouch}
            className="absolute z-20 flex items-center"
            style={{
              bottom: 'clamp(14px, 3.8vh, 34px)',
              left: 'clamp(12px, 3vw, 28px)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              gap: '8px',
            }}
          >
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 'clamp(62px, 15vw, 78px)',
                height: 'clamp(62px, 15vw, 78px)',
                background:
                  activeDpadDir === 'left'
                    ? 'rgba(56, 189, 248, 0.36)'
                    : 'rgba(255, 255, 255, 0.13)',
                border: `2px solid ${
                  activeDpadDir === 'left' ? 'rgba(56,189,248,0.8)' : 'rgba(255,255,255,0.25)'
                }`,
                color: '#FFFFFF',
                fontSize: '22px',
                transform: activeDpadDir === 'left' ? 'scale(0.94)' : 'scale(1)',
              }}
            >
              ◀
            </div>
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 'clamp(62px, 15vw, 78px)',
                height: 'clamp(62px, 15vw, 78px)',
                background:
                  activeDpadDir === 'right'
                    ? 'rgba(56, 189, 248, 0.36)'
                    : 'rgba(255, 255, 255, 0.13)',
                border: `2px solid ${
                  activeDpadDir === 'right' ? 'rgba(56,189,248,0.8)' : 'rgba(255,255,255,0.25)'
                }`,
                color: '#FFFFFF',
                fontSize: '22px',
                transform: activeDpadDir === 'right' ? 'scale(0.94)' : 'scale(1)',
              }}
            >
              ▶
            </div>
          </div>
        )}

        {/* Ergonomic Action Buttons: Dedicated Water Blaster FIRE + B (Ability) + A (Jump) */}
        {gameScreen === 'playing' && !isPaused && (
          <div
            className="absolute z-20"
            style={{
              bottom: 'clamp(14px, 3.8vh, 34px)',
              right: 'clamp(12px, 3vw, 28px)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <div
              className="relative"
              style={{
                width: 'clamp(138px, 31vw, 174px)',
                height: 'clamp(128px, 28vw, 160px)',
              }}
            >
              {/* Dedicated Mobile Water Blaster Button (Appears whenever Water Blaster is active!) */}
              {waterGunSecs > 0 && (
                <button
                  type="button"
                  onTouchStart={(e) => handleFireBtn(true, e)}
                  onTouchEnd={(e) => handleFireBtn(false, e)}
                  onTouchCancel={(e) => handleFireBtn(false, e)}
                  onMouseDown={(e) => handleFireBtn(true, e)}
                  onMouseUp={(e) => handleFireBtn(false, e)}
                  onMouseLeave={() => activeBtnFire && handleFireBtn(false)}
                  className="absolute flex flex-col items-center justify-center rounded-full"
                  style={{
                    ...pxNoSelect,
                    top: '0%',
                    left: '6%',
                    width: 'clamp(54px, 13vw, 66px)',
                    height: 'clamp(54px, 13vw, 66px)',
                    background: activeBtnFire
                      ? 'rgba(56, 189, 248, 0.56)'
                      : 'rgba(2, 132, 199, 0.34)',
                    border: `2px solid ${activeBtnFire ? '#FEF08A' : '#38BDF8'}`,
                    boxShadow: activeBtnFire
                      ? '0 0 16px rgba(56, 189, 248, 0.8)'
                      : '0 0 10px rgba(56, 189, 248, 0.45)',
                    color: '#E0F2FE',
                    transform: activeBtnFire ? 'scale(0.92)' : 'scale(1)',
                  }}
                >
                  <span style={{ fontSize: '8px', fontWeight: 'bold', lineHeight: 1, color: '#FFFFFF' }}>
                    FIRE
                  </span>
                  <span style={{ fontSize: '5.5px', marginTop: '3px', color: '#FDE047' }}>
                    {waterGunSecs}S
                  </span>
                </button>
              )}

              {/* B Button: Triggers Character Movement Ability (Dash / Boost / Slam) */}
              <button
                type="button"
                onTouchStart={(e) => handleActionBtn(true, e)}
                onTouchEnd={(e) => handleActionBtn(false, e)}
                onTouchCancel={(e) => handleActionBtn(false, e)}
                onMouseDown={(e) => handleActionBtn(true, e)}
                onMouseUp={(e) => handleActionBtn(false, e)}
                onMouseLeave={() => activeBtnB && handleActionBtn(false)}
                className="absolute flex flex-col items-center justify-center rounded-full"
                style={{
                  ...pxNoSelect,
                  bottom: '2%',
                  left: '0',
                  width: 'clamp(56px, 13.5vw, 70px)',
                  height: 'clamp(56px, 13.5vw, 70px)',
                  background: activeBtnB
                    ? 'rgba(251, 146, 60, 0.48)'
                    : 'rgba(239, 68, 68, 0.24)',
                  border: `2px solid ${activeBtnB ? '#FDE047' : 'rgba(248, 113, 113, 0.6)'}`,
                  color: '#FFE4E6',
                  transform: activeBtnB ? 'scale(0.93)' : 'scale(1)',
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 'bold', lineHeight: 1 }}>B</span>
                <span style={{ fontSize: '5px', marginTop: '3px', color: '#FDE047' }}>
                  {bButtonLabel}
                </span>
              </button>

              {/* A Button: Jump / Double Jump */}
              <button
                type="button"
                onTouchStart={(e) => handleJumpBtn(true, e)}
                onTouchEnd={(e) => handleJumpBtn(false, e)}
                onTouchCancel={(e) => handleJumpBtn(false, e)}
                onMouseDown={(e) => handleJumpBtn(true, e)}
                onMouseUp={(e) => handleJumpBtn(false, e)}
                onMouseLeave={() => activeBtnA && handleJumpBtn(false)}
                className="absolute flex flex-col items-center justify-center rounded-full"
                style={{
                  ...pxNoSelect,
                  top: '20%',
                  right: '0',
                  width: 'clamp(68px, 16.5vw, 86px)',
                  height: 'clamp(68px, 16.5vw, 86px)',
                  background: activeBtnA
                    ? 'rgba(74, 222, 128, 0.48)'
                    : 'rgba(34, 197, 94, 0.25)',
                  border: `2px solid ${activeBtnA ? '#FEF08A' : 'rgba(74, 222, 128, 0.65)'}`,
                  color: '#DCFCE7',
                  transform: activeBtnA ? 'scale(0.93)' : 'scale(1)',
                }}
              >
                <span style={{ fontSize: '18px', fontWeight: 'bold', lineHeight: 1 }}>A</span>
                <span style={{ fontSize: '5px', marginTop: '3px', color: '#86EFAC' }}>JUMP</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // 2. DESKTOP RETRO ARCADE CABINET VIEWPORT (Keyboard + Gamepad)
  // ============================================================================
  return (
    <div
      ref={containerRef}
      className="min-h-screen w-full flex flex-col items-center justify-center p-4"
      style={{
        ...pxNoSelect,
        background: 'radial-gradient(circle at 50% 20%, #111827 0%, #05070E 100%)',
      }}
    >
      {/* Top Arcade Marquee Bar */}
      <div
        className="w-full max-w-5xl flex items-center justify-between px-4 py-2.5 mb-2"
        style={{
          background: '#0F172A',
          border: '2px solid #334155',
          boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
        }}
      >
        <div className="flex items-center gap-3">
          <img
            src="/croak.png"
            alt="FLIPPRX"
            style={{ width: '24px', height: '24px', imageRendering: 'pixelated' }}
          />
          <span style={{ color: '#FDE047', fontSize: '10px', letterSpacing: '1.5px' }}>
            FLIPPRX
          </span>
          <span
            className="px-2 py-0.5"
            style={{
              background: '#1E293B',
              color: charMeta.color,
              fontSize: '7px',
              border: `1px solid ${charMeta.color}55`,
            }}
          >
            {charMeta.name}
          </span>
        </div>

        <div className="flex items-center gap-5" style={{ fontSize: '8px', letterSpacing: '1px' }}>
          <span style={{ color: '#FFFFFF' }}>SCORE: {score}</span>
          <span style={{ color: '#FDE047' }}>STAGE: {currentStage}/10</span>
          <span style={{ color: '#4ADE80' }}>HI: {highScore}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setScanlinesEnabled((s) => !s)}
            style={{
              padding: '4px 8px',
              fontSize: '6.5px',
              color: scanlinesEnabled ? '#38BDF8' : '#64748B',
              background: '#1E293B',
              border: '1px solid #334155',
            }}
          >
            CRT
          </button>

          <button
            type="button"
            onClick={toggleAudio}
            style={{
              padding: '4px 8px',
              fontSize: '6.5px',
              color: audioEnabled ? '#4ADE80' : '#64748B',
              background: '#1E293B',
              border: '1px solid #334155',
            }}
          >
            {audioEnabled ? 'SFX ON' : 'MUTED'}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            style={{
              padding: '4px 8px',
              fontSize: '6.5px',
              color: '#E2E8F0',
              background: '#1E293B',
              border: '1px solid #334155',
            }}
          >
            FULL
          </button>

          {gameScreen === 'playing' && (
            <button
              type="button"
              onClick={() => setIsPaused((p) => !p)}
              style={{
                padding: '4px 8px',
                fontSize: '6.5px',
                color: '#FDE047',
                background: '#1E293B',
                border: '1px solid #475569',
              }}
            >
              {isPaused ? 'RESUME' : 'PAUSE'}
            </button>
          )}
        </div>
      </div>

      {/* Crisp 16:9 Pixel Canvas Frame */}
      <div
        className="relative w-full max-w-5xl aspect-video overflow-hidden bg-black"
        style={{
          border: '3px solid #334155',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.85)',
        }}
      >
        <canvas
          ref={canvasRef}
          width={gameWidthRef.current}
          height={GAME_HEIGHT}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            imageRendering: 'pixelated',
          }}
        />
        {renderOverlays()}
      </div>

      {/* Desktop Controls Legend Footer */}
      <div
        className="w-full max-w-5xl flex flex-wrap items-center justify-between px-4 py-2 mt-2"
        style={{
          background: '#0F172A',
          border: '1px solid #1E293B',
          color: '#94A3B8',
          fontSize: '6.5px',
          letterSpacing: '0.8px',
        }}
      >
        <span>MOVE: WASD / ARROWS</span>
        <span>JUMP / DBL JUMP: SPACE / W / Z</span>
        <span>{bButtonLabel}: SHIFT</span>
        <span>WATER BLASTER: F / X</span>
        <span>SWITCH HERO (START): C</span>
        <span>PAUSE: P / ESC / GAMEPAD</span>
      </div>
    </div>
  );
}
