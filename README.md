# FLIPPRX Pixel Game
<img width="1200" height="600" alt="FLIPPRX Pixel Game" src="https://github.com/user-attachments/assets/1f92004a-b724-4975-b097-0b1b6f82cc2c" />

**Retro platformer with 3 unique characters, 10 stages, and a 3-lives system.** Built with custom HTML5 Canvas rendering — no game engine, no dependencies.

**[Play Now at flipprx.app](https://www.flipprx.app)** | Mobile-First | Installable PWA | Android APK Available

---

## Features

### Three Playable Characters
- **Classic** — Double jump ability. Balanced stats, great for learning.
- **Speed** — 35% faster movement, air dash, and fart-powered air slide.
- **Slam** — Chargeable ground slam that breaks bricks and defeats enemies on impact.

### Gameplay
- **10 Stages** with progressive difficulty and procedural elements
- **3-Lives System** — Lose all lives and it's game over. Beat all 10 stages to win.
- **Dynamic Enemy AI** — Goombas, snakes, and ghosts with unique behaviors (patrol, lunge, disappear)
- **Combo System** — Chain enemy defeats for score multipliers
- **Power-Ups** — Invincibility helmet, water gun, speed boost, portals
- **Boss Encounters** — End-stage challenges
- **Death Flash + Haptic Feedback** — Screen flash on death, vibration on jump/death (mobile)

### Visuals
- **Pixel art rendered entirely on Canvas** — no sprite sheets for characters, all drawn with `fillRect`
- **60 FPS** with viewport-culled backgrounds and optimized particle system
- **Parallax scrolling** — Clouds, mountains, hills, bushes at different depths
- **Dynamic widescreen** — Wider field of view on landscape/tablet screens
- **Screen shake, particles, celebration fireworks**

### Mobile & PWA
- **Touch controls** — D-pad + A/B buttons with `onTouchCancel` for reliability
- **Installable PWA** — Service worker with cache-first strategy for offline play
- **Android APK** — TWA (Trusted Web Activity) wrapper via Bubblewrap
- **No text selection interference** — `user-select: none` on all interactive elements
- **Fullscreen standalone mode** — No browser chrome

### Security
- **CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy** headers
- **Versioned service worker cache** for clean deploys
- **Validated localStorage** — High score input sanitized

---

## Play

### Online
Visit **[flipprx.app](https://www.flipprx.app)** — works on any modern browser.

### Android
Install the APK from the `flipgame-android/` folder, or sideload via ADB.

### Development

```bash
git clone https://github.com/cryptoprx/flipprxpixel.git
cd flipprxpixel
npm install
npm run dev
# Open http://localhost:3000
```

---

## Controls

### Keyboard
- **Arrow Keys / WASD** — Move left/right
- **Space / Z / W / Up** — Jump
- **X / Shift** — Shoot (water gun) / Dash (Speed character)

### Mobile
- **D-Pad (left side)** — Move
- **A button (right side)** — Jump
- **B button (right side)** — Shoot / Ability
- **Tap character label (top)** — Switch character mid-game (early in stage only)

---

## Characters

| Character | Speed | Ability | Best For |
|-----------|-------|---------|----------|
| **Classic** | Normal | Double jump | Learning, precision |
| **Speed** | +35% | Air slide + dash | Speedrunning |
| **Slam** | Normal | Chargeable ground pound | Aggressive play, brick breaking |

---

## Tech Stack

- **Framework** — Next.js 16 (React 19)
- **Language** — TypeScript
- **Styling** — Tailwind CSS
- **Font** — Press Start 2P (Google Fonts)
- **Rendering** — Custom HTML5 Canvas (no game engine)
- **Audio** — Pooled HTML5 Audio + procedural Web Audio API
- **PWA** — Service worker + Web App Manifest
- **Android** — Bubblewrap TWA
- **Hosting** — flipprx.app

---

## Project Structure

```
flipgame/
  components/
    PixelGame.tsx        # Core game (rendering, physics, AI, input)
    ServiceWorkerRegistration.tsx
  utils/
    stageGenerator.ts    # Procedural stage layout generation
  app/
    page.tsx             # Home page
    layout.tsx           # Root layout, metadata, fonts
  public/
    manifest.json        # PWA manifest
    sw.js                # Service worker
    .well-known/
      assetlinks.json    # Android TWA verification
    sprites/             # Character sprite sheets
  middleware.ts          # Route protection
  next.config.ts         # Security headers
  LICENSE                # Proprietary — All Rights Reserved

flipgame-android/        # Bubblewrap TWA project (separate folder)
  twa-manifest.json
  app-release-signed.apk
  app-release-bundle.aab
```

---

## Links

- **Play** — [flipprx.app](https://www.flipprx.app)
- **Developer** — [CROAKWORKS](https://croak.work)
- **GitHub** — [github.com/cryptoprx/flipprxpixel](https://github.com/cryptoprx/flipprxpixel)
- **Contact** — flipgame@croak.work

---

## License

**Copyright (c) 2025-2026 CROAKWORKS. All Rights Reserved.**
See [LICENSE](./LICENSE) for full terms, [COPYRIGHT](./COPYRIGHT.md) for ownership and legal compliance, and [PRIVACY](./PRIVACY.md) for our privacy policy. Unauthorized copying, distribution, or modification is prohibited.
