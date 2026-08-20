# KJVenture

**Play Together. Journey Through the Word.**

KJVenture is a local-first, installable Bible game-night platform for fellowships, Sunday schools, classrooms, and families. It runs as a static React application with no account, backend, or gameplay network dependency after installation.

## Included release

- KJV Bible Quiz with the original 100-question library.
- 4 Pics 1 Word with the original 30 puzzles, stable hints and letter tiles, references, and available explanations.
- Quick play plus a routed Library, Explore Games, Session Studio, hosted play, and restoration journey.
- Mixed playlists, source/random order, 5–300 second or untimed rounds, reveal/skip expiry policies, reference preferences, and five built-in presets.
- Fellowship, Team, and Study modes. Team mode supports 2–6 teams, manual +1/−1 scoring, and score undo.
- Guarded answer flow: unresolved, incorrect, and unrevealed expired rounds cannot advance under the default policy.
- Versioned local session and preset storage. Restored timers always remain paused and do not deduct closed time.
- Installable PWA with an offline precache, deep-route fallback, offline-ready notice, and prompt-based updates that never reload active play automatically.
- Responsive host controls, fullscreen and sound controls, keyboard input, reduced-motion support, 44×44 minimum gameplay targets, and focus restoration for dialogs and hosted round changes.

The current content registry marks migrated records as `legacy-imported`. KJVenture does not invent references, excerpts, difficulty, themes, or Bible explanations; those fields require human review before they can be marked reviewed.

## Local development

```bash
npm install
npm run dev
```

Vite prints the local development URL. Production PWA behavior is intentionally disabled in the development server; use the production preview or PWA test command to exercise it.

## Verification

```bash
npm test
npm run typecheck
npm run build
npm run test:e2e
npm run test:a11y
npm run test:pwa
```

Playwright browsers are required for the browser suites:

```bash
npx playwright install chromium firefox webkit
```

- `test:e2e` runs gameplay and viewport coverage in Chromium, Firefox, and WebKit.
- `test:a11y` runs axe WCAG checks in Chromium and Firefox. WebKit remains in the functional suite because the axe Playwright injector is not reliable in that engine on Windows.
- `test:pwa` builds the application, opens a production preview, installs the service worker, then verifies offline gameplay and offline deep routes in Chromium.

Generated production files are written to `dist/`. Browser screenshots and traces are written under `test-results/` and are ignored by Git.

## Product routes

- `/` — Library and conditional Continue Session entry.
- `/games` — quick-play game library.
- `/games/quiz` and `/games/four-pics` — familiar standalone setup flows.
- `/studio` — playlist, preset, mode, team, timing, and presentation setup.
- `/play/:sessionId` — shared hosted session player.
- `/restore` — explicit safe restoration and discard choices.

## Host controls and shortcuts

- Quiz: `A`–`D` chooses an answer.
- Four Pics: letter keys choose available tiles; `Backspace` removes the last selected tile; `Enter` checks the assembled answer.
- Shared hosted play: `R` reveals, `Enter` or `ArrowRight` advances only when allowed, and `ArrowLeft` returns to the previous round.
- Reset Round restores the exact current prepared round and its timer.
- Leaving hosted play pauses and persists the session. Only an explicit confirmed discard deletes it.

## Architecture

- `src/app/` — application shell and route boundaries.
- `src/components/ui/` — branded buttons, notices, dialogs, loading, and icon controls.
- `src/components/gameplay/` — top bar, stage/dock primitives, and scoreboard.
- `src/content/` — versioned content metadata, registry, packs, and validators.
- `src/games/` — lazy game registry, adapters, and game-specific renderers.
- `src/session/` — pure reducer, selectors, seeded preparation, presets, persistence, and controller.
- `src/pwa/` — install, offline, and safe-update presentation.

The session reducer is authoritative for transitions. Renderers cannot bypass `canAdvance`, and persisted Four Pics rounds store the exact hint positions and tile IDs so restoration never re-randomizes a puzzle.

## Deployment

The app is a static Vite build. `vercel.json` supplies the SPA rewrite and no-cache headers for the service worker and manifest. Deploy `dist/` to an HTTPS static host so service workers and installation are available.

## Deferred work

Dual-window local presentation, True or False, Content Studio, new reviewed content, and all connected participation features remain separate later milestones. No backend vendor, room-code service, QR joining, authentication, cloud sync, or participant-phone code is included in this release.
