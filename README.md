# Posture Check PWA

A no-nonsense posture and stretch reminder that runs on Android and desktop Chrome. Install to your home screen. No app store. No backend. No build step.

**49 tips** across 5 categories: seated posture, stretches, movement breaks, eye relief, and mindful check-ins.

## Features

- Configurable interval (5–60 min, snaps to 5-min increments)
- Ring countdown with visual progress
- Background notifications via Service Worker (works when app is backgrounded)
- Three-tone chime on reminder (toggleable)
- Tip rotation with Fisher-Yates shuffle — no repeats until full deck cycles
- Acknowledge button resets the timer
- Auto-reset after 2 minutes if ignored
- Interval preference saved across sessions

## Run locally (dev)

```
python -m http.server 8080
```

Open `http://localhost:8080` in Chrome on your computer, or from your phone on the same WiFi: `http://YOUR_IP:8080` (run `ipconfig` on Windows to find your IPv4).

## Deploy to GitHub Pages (production — recommended)

1. Create a new repo on GitHub (name it `posture-app` or whatever you like)
2. Open PowerShell in this folder and run:
   ```
   git init
   git branch -M main
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```
3. On GitHub: Settings → Pages → Source: Deploy from branch → main → / (root) → Save
4. Your URL: `https://YOUR_USERNAME.github.io/YOUR_REPO/`
5. Open that URL in Chrome on your Android → three-dot menu → "Add to Home Screen"
6. Grant notification permission when prompted

## File structure

```
posture-app/
├── index.html       ← complete app (UI + all logic)
├── sw.js            ← service worker (caching + background notifications)
├── manifest.json    ← PWA install metadata
├── tips.json        ← 49 tips (reference copy — app uses inlined version)
├── README.md
└── icons/
    ├── icon-192.png ← required for PWA install prompt
    └── icon-512.png ← required for PWA install prompt
```

## Notes on background notifications

The service worker holds the notification schedule when the app is backgrounded — this works around Android's JavaScript timer throttling. If Android kills the SW under heavy memory pressure (uncommon for an installed PWA), the notification won't fire until you reopen the app. For a personal daily-driver tool on a phone that stays plugged in at a desk, this is a non-issue in practice.

---

*Built April 2026.*
