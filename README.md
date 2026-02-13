# Violet Night, Always · Where My Heart Rests

A cinematic single-page Valentine microsite (Next.js + TypeScript) designed as a luxury interactive love letter for Anusha.

## Experience structure

1. **The Night** — stillness and scale
2. **The Change** — central warmth entering the sky
3. **The Moments** — three intimate memory lines
4. **The Heart** — abstract heart constellation + eclipse reveal
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

Use the included workflow (`.github/workflows/pages.yml`) for reliable deploys.

1. In GitHub: **Settings → Pages → Build and deployment**
2. Set **Source** to **GitHub Actions**
3. Push to your branch (or run the workflow manually)

The workflow builds with `next export`, uploads `out/`, and deploys it.
It also writes `out/.nojekyll` so Next.js `_next/*` assets are served correctly.

> If you only see your README on Pages, your repo is likely publishing from the wrong source (for example root/docs instead of the built `out/` artifact). Switch Pages source to **GitHub Actions**.

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

3. **Lens flare texture** (romantic halo overlay):
   - Three.js example lensflare texture:
     <https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/lensflare/lensflare0.png>
   - Project license: MIT (Three.js repository).

4. **Romantic quote source**:
   - Quotable API (love-tag lines): <https://api.quotable.io/>
   - License: Open source project (MIT) and API terms apply.
   - App includes local fallback lines if request fails.

## Optional self-hosting

If you want zero runtime dependency on remote texture/font delivery:

- Self-host fonts in `/public/fonts` and switch from `next/font/google` to `next/font/local`.
- Copy the texture into `/public/textures/perlin-512.png` and update the fetch URL in `ValentineExperience.tsx`.
