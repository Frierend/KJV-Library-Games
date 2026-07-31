# KJV Bible Games

A responsive, host-led Bible game collection built with React, TypeScript, and
Vite. It is ready to deploy as a static web app on Vercel.

## Included games

- **KJV Bible Quiz** — 100-question bank, mixed rounds, 10/20/30/50/100/custom
  question totals, and 10/15/20/30-second automatic countdowns.
- **4 Pics 1 Word** — 30 Bible puzzles with four visual clues, stable prefilled
  letter hints, shuffled letter tiles, answer reveal, and KJV references.

There is no score tracking. The quiz is designed for a host to recognize the
first raised hand and check that participant's answer.

## Run in Codex or locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite.

## Quality checks

```bash
npm test
npm run typecheck
npm run build
```

The production files are generated in `dist/`.

## Deploy to Vercel

### From GitHub

1. Push this folder to a GitHub repository.
2. In Vercel, select **Add New → Project** and import that repository.
3. Vercel detects Vite automatically. The included `vercel.json` already sets
   the build command, output folder, and SPA rewrite.
4. Select **Deploy**.

### With the Vercel CLI

```bash
npm install -g vercel
vercel
```

Follow the prompts. Use `npm run build` as the build command and `dist` as the
output directory if prompted.

## Host controls

- The countdown starts automatically when a round opens.
- **Reset Timer / Reset Round** restarts the same round.
- **Reveal Answer** shows the answer and Bible reference.
- **Setup** returns to the countdown and question/round selector.
- The speaker toggles the final-three-second and time-up sounds.
- The diagonal arrow enters or exits fullscreen presentation mode.
- Quiz keyboard shortcuts: `A`–`D`, `R` to reveal, arrow keys to navigate.

Refreshing the browser deliberately returns to the main game library instead
of restoring a half-finished session.

## Adding another game

Create the game component under `src/games/`, add its data under `src/data/`,
then lazy-load it from `src/App.tsx`. Keeping each game in its own module
prevents the whole app from becoming slow as the library grows.
