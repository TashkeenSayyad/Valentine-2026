# Valentine-2026 · Where My Heart Rests

A cinematic, single-page Valentine microsite built with **Next.js App Router + TypeScript**.

## Experience structure

Five narrative scenes + final state:

1. **The Night** — silence, longing, deep midnight sky
2. **The Change** — central warm light, stars drifting inward
3. **The Moments** — three intimate lines revealed progressively
4. **The Heart** — abstract constellation heart + confession
5. **The Promise** — hold-to-answer interaction (1.5s)
6. **Final affirmation** — “Always.” and devotion lines

## Input + device reliability

- Pointer Events for all critical interactions (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`)
- Press-and-hold uses pointer capture (`setPointerCapture` / `releasePointerCapture`)
- Background canvas is non-interactive (`pointer-events: none`)
- Real `<button>` controls with touch-friendly hit areas
- `touch-action: manipulation` on interactive controls
- `-webkit-tap-highlight-color: transparent` globally for buttons
- Dev-mode **Input Debug** panel showing event, pointerType, target, and capture

## Performance notes

- Single animation loop (`requestAnimationFrame`) drives procedural rendering and hold progress
- Device pixel ratio is clamped (`Math.min(devicePixelRatio, 2)`, lower on low-power mode)
- Low-power mode heuristics reduce star density and cost on weaker devices
- `prefers-reduced-motion` disables heavy movement and minimizes transitions

## Stack

- Next.js 14 (App Router)
- React 18 + TypeScript
- CSS Modules
- Canvas 2D procedural rendering

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

- Build command: `npm run build`
- Publish directory: `out`

### GitHub Pages

```bash
npm run build
```

Deploy the `out/` directory to your Pages branch (e.g. with `gh-pages`).
