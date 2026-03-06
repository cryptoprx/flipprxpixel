# Privacy Policy

**FLIPPRX Pixel Game**
**Last Updated: March 5, 2026**

---

## Overview

FLIPPRX Pixel Game ("the Game") is a browser-based pixel platformer available at [flipprx.app](https://www.flipprx.app) and as an Android application. This Privacy Policy explains what data the Game collects, how it is used, and your rights regarding that data.

**In short: We collect almost nothing. The Game runs entirely in your browser with no accounts, no tracking, and no personal data collection.**

---

## Data We Collect

### Data We Do NOT Collect

- No personal information (name, email, phone, address)
- No account or login credentials
- No payment or financial information
- No location data
- No contacts or phone data
- No camera or microphone access
- No cookies
- No analytics or usage tracking
- No advertising identifiers
- No data shared with third parties

### Data Stored Locally on Your Device

The Game stores the following data **locally on your device only** using your browser's `localStorage`:

| Data | Purpose | Storage |
|------|---------|---------|
| High score | Remember your best score between sessions | Browser localStorage |

This data:
- **Never leaves your device**
- Is not transmitted to any server
- Is not accessible by FLIPPRX or any third party
- Can be cleared at any time by clearing your browser data
- Is stored as a single numeric value (`flipprx_highscore`)

### Service Worker Cache

The Game uses a Service Worker to cache game assets (images, audio, code) on your device for offline play. This cached data:
- Contains only the Game's own static files
- Is used solely to enable offline functionality
- Can be cleared through your browser settings
- Does not contain any personal information

---

## Third-Party Services

### Hosting

The Game is hosted on web infrastructure that may collect standard server logs (IP address, browser type, access time). These logs are managed by the hosting provider and are not accessed or used by FLIPPRX for any purpose. Refer to your hosting provider's privacy policy for details.

### Google Fonts

The Game loads the "Press Start 2P" font from Google Fonts. This may result in your browser making a request to Google's servers. See [Google's Privacy Policy](https://policies.google.com/privacy) for details.

### Android Application

The Android version of the Game is a Trusted Web Activity (TWA) wrapper that loads the same web content. It does not request or use any Android permissions beyond basic internet access. No additional data is collected by the Android app.

---

## Children's Privacy

The Game does not knowingly collect any personal information from anyone, including children under the age of 13. Since no personal data is collected, the Game complies with the Children's Online Privacy Protection Act (COPPA) and similar regulations.

---

## Your Rights

Since the Game does not collect personal data, there is no personal data to access, modify, or delete. However, you can:

- **Clear your high score** — Delete `flipprx_highscore` from your browser's localStorage, or clear all site data for flipprx.app
- **Clear cached files** — Unregister the Service Worker or clear browser cache
- **Uninstall the Android app** — This removes all locally stored data

---

## Data Security

The Game is served over HTTPS with the following security measures:
- Content Security Policy (CSP) headers
- X-Frame-Options: DENY (prevents clickjacking)
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera, microphone, and geolocation disabled

---

## Changes to This Policy

If this Privacy Policy is updated, the changes will be reflected on this page with an updated "Last Updated" date. Since the Game collects no personal data, changes are expected to be minimal.

---

## Contact

For privacy-related questions or concerns:

- **Email** — flipprx@flipprx.app
- **Website** — [flipprx.app](https://www.flipprx.app)
- **GitHub** — [github.com/cryptoprx/flipprxpixel](https://github.com/cryptoprx/flipprxpixel)
