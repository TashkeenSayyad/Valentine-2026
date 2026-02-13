# Violet Night, Always · Where My Heart Rests

A cinematic single-page Valentine microsite (Next.js + TypeScript) designed as a luxury interactive love letter for Anusha.

## Experience structure

1. **The Night** — stillness and scale
2. **The Change** — central warmth entering the sky
3. **The Moments** — three intimate memory lines
4. **The Heart** — starlight handwriting + abstract heart + eclipse reveal
5. **The Promise** — hold interaction (“Hold to make it ours”)
6. **Final State** — devotion lines and whisper: “I was always yours.”

## Setup

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Build

```bash
npm run build
npm run start
```

## Deployment

### Netlify

- Build command: `npm run build`
- Publish directory: `out`

### GitHub Pages

```bash
npm run build
```

Deploy the `out/` directory to your Pages branch.

## Performance notes

- One `requestAnimationFrame` loop total for visuals + hold ring updates.
- React state is not updated per frame.
- DPR clamped (`Math.min(devicePixelRatio, 2)`; lower on low-power mode).
- Adaptive quality on low-power devices:
  - reduced star count
  - reduced dust complexity
  - fewer costly effects
- `prefers-reduced-motion` is respected:
  - reduced parallax and movement
  - simplified transitions

## Input handling guarantees

- Pointer Events for all critical interactions.
- Hold interaction uses pointer capture (`setPointerCapture` / `releasePointerCapture`).
- Background canvas uses `pointer-events: none`.
- Interactive elements are real `<button>` targets with `touch-action: manipulation` and >=44px touch size.
- Dev-only **Input Debug** panel included.

## Credits (online resources)

1. **Google Fonts** (served by Google, loaded with `next/font/google`):
   - Cormorant Garamond: <https://fonts.google.com/specimen/Cormorant+Garamond>
   - Inter: <https://fonts.google.com/specimen/Inter>
   - License: SIL Open Font License (OFL).

2. **Noise / film grain reference texture**:
   - Three.js example perlin texture:
     <https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/perlin-512.png>
   - Project license: MIT (Three.js repository).
   - Used with graceful fallback to generated procedural noise if unavailable.

## Optional self-hosting

If you want zero runtime dependency on remote texture/font delivery:

- Self-host fonts in `/public/fonts` and switch from `next/font/google` to `next/font/local`.
- Copy the texture into `/public/textures/perlin-512.png` and update the fetch URL in `ValentineExperience.tsx`.
