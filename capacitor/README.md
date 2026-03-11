# FLIPPRX Capacitor Build

Self-contained Android APK that bundles all game assets locally — no external URL required.

## Prerequisites

- Node.js 18+
- Java JDK 17 (64-bit)
- Android SDK (or Bubblewrap's bundled SDK at `~/.bubblewrap/android_sdk`)

## Build Steps

### Quick Build (PowerShell)

```powershell
cd capacitor
.\build.ps1
```

### Manual Build

```bash
# 1. Install dependencies (first time only)
cd capacitor
npm install

# 2. Build Next.js static export from project root
cd ..
set STATIC_EXPORT=true
npx next build
cd capacitor

# 3. Copy static files
# PowerShell:
Remove-Item -Recurse -Force www -ErrorAction SilentlyContinue
Copy-Item -Recurse ..\out www

# 4. Sync Capacitor
npx cap sync

# 5. Build release APK
cd android
.\gradlew.bat assembleRelease

# 6. Sign APK (use your keystore)
# APK output: android/app/build/outputs/apk/release/app-release-unsigned.apk
```

## Key Differences from TWA (Bubblewrap)

| | TWA (flipgame-android/) | Capacitor (capacitor/) |
|---|---|---|
| How it works | Opens flipprx.app in Chrome | Bundles game files inside APK |
| Needs internet | Yes (loads website) | No (fully offline) |
| App size | ~2 MB | ~6 MB |
| Updates | Instant (update website) | Requires new APK release |
| Distribution | Tied to website URL | Standalone, any store |

## Package Info

- **App ID**: `www.flipprx.app`
- **App Name**: FLIPPRX Pixel Game
- **Developer**: CROAKWORKS (https://croak.work)
