# Valentine-2026 · Constellation Reveal Microsite

A cinematic, mobile-first Valentine microsite built with **Next.js App Router + TypeScript**.

## Experience highlights

- Fullscreen procedural night sky rendered in Canvas 2D (no image assets).
- Guided star-tap sequence with magnetic snapping + pulse feedback.
- Animated constellation reveal into a luminous heart.
- Post-reveal ask state:
  - **Yes** = press and hold a bright star for ~1.5 seconds with smooth ring progress.
  - **No** = swipe the question text away to elegantly reset with: “Let’s try that again.”
- Confirmation scene with an elegant date card:
  - When: ______
  - Where: ______
  - Note: ______
- Replay flow.
- Respect for `prefers-reduced-motion`.
- Safe-area + dynamic viewport support with `100svh/100dvh`.

## Stack

- Next.js 14 (App Router)
- React 18 + TypeScript
- CSS Modules
- Canvas 2D animation

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Production build

```bash
npm run build
npm run start
```

## Deployment

### Netlify

This project uses static export (`output: "export"` in `next.config.mjs`).

1. Connect repo to Netlify.
2. Build command:
   ```bash
   npm run build
   ```
3. Publish directory:
   ```
   docs
   ```
4. Deploy.

### GitHub Pages

1. Build static output:
   ```bash
   npm run build
   ```
2. Deploy the `docs/` directory to your Pages branch (`gh-pages`) with your preferred tool.

Example with `gh-pages` package:

```bash
npm install --save-dev gh-pages
npx gh-pages -d docs
```

Then configure repository Pages source to the published branch.

## Notes

- Designed mobile-first and tuned for ~390px width.
- No external image assets; all stars/lines/glows are procedural.
