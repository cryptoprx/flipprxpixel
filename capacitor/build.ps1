# FLIPPRX Capacitor Build Script
# Builds a self-contained Android APK with game assets bundled inside

$ErrorActionPreference = "Stop"

Write-Host "=== FLIPPRX Capacitor Build ===" -ForegroundColor Cyan

# Step 1: Build Next.js static export
Write-Host "`n[1/4] Building static export..." -ForegroundColor Yellow
Push-Location ..
$env:STATIC_EXPORT = "true"
npx next build
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Next.js build failed" }
Pop-Location

# Step 2: Copy static output to www/
Write-Host "`n[2/4] Copying static files to www/..." -ForegroundColor Yellow
if (Test-Path "www") { Remove-Item -Recurse -Force "www" }
Copy-Item -Recurse "..\out" "www"

# Step 3: Sync Capacitor
Write-Host "`n[3/4] Syncing Capacitor..." -ForegroundColor Yellow
npx cap sync
if ($LASTEXITCODE -ne 0) { throw "Capacitor sync failed" }

# Step 4: Build APK
Write-Host "`n[4/4] Building APK..." -ForegroundColor Yellow
Push-Location android
.\gradlew.bat assembleRelease
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "Gradle build failed" }
Pop-Location

$apkPath = "android\app\build\outputs\apk\release\app-release-unsigned.apk"
if (Test-Path $apkPath) {
    Write-Host "`n=== BUILD SUCCESS ===" -ForegroundColor Green
    Write-Host "APK: $apkPath"
} else {
    Write-Host "`n=== APK not found at expected path, check android/app/build/outputs/ ===" -ForegroundColor Red
}
