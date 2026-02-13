# Valentine-2026 · You Are My Universe

A cinematic, mobile-first Valentine microsite built with **Next.js App Router + TypeScript**.

## Experience

A 4-scene interactive short film:

1. **Silence** — deep night ambience + opening line
2. **Light** — one central star awakens the sky
3. **Constellation** — abstract heart constellation draws in
4. **The Question** — hold-to-answer interaction

Final state: **Always.** / **I choose you. Every day.**

## Input reliability (cross-device)

- Pointer Events for all critical interactions (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`)
- Pointer capture for hold-to-answer (`setPointerCapture` / `releasePointerCapture`)
- Real `<button>` tap targets (no div buttons)
- Canvas background is non-interactive (`pointer-events: none`)
- iOS-friendly tap behavior:
  - `touch-action: manipulation`
  - `-webkit-tap-highlight-color: transparent`
- Dev-only **Input Debug** panel (localhost/dev) with:
  - last event type
  - pointer type
  - target label
  - pointer-capture state

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

Deploy the `out/` directory to your Pages branch (for example with `gh-pages`).
