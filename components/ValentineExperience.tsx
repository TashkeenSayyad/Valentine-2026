"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./ValentineExperience.module.css";
import { heartConstellation, randomStarsSeed } from "@/lib/constellation";

type Scene = 1 | 2 | 3 | 4 | 5 | 6;

type Star = { x: number; y: number; r: number; depth: number; phase: number };
type Dust = { x: number; y: number; depth: number; speed: number; angle: number; length: number };
type DebugInfo = { event: string; pointerType: string; target: string; capture: boolean };
type HeartBurst = { x: number; y: number; born: number; size: number; drift: number };

const HOLD_DURATION_MS = 1500;
const MEMORY_LINES = [
  "The first time you smiled at me, something in me settled.",
  "The way you say my name feels like a promise.",
  "In your quiet presence, my whole life breathes easier."
];

export function ValentineExperience() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const holdButtonRef = useRef<HTMLButtonElement>(null);
  const ringProgressRef = useRef<SVGCircleElement>(null);

  const pointerOffsetRef = useRef({ x: 0, y: 0 });
  const enteredSceneAtRef = useRef(0);
  const holdPointerIdRef = useRef<number | null>(null);
  const holdStartAtRef = useRef<number | null>(null);
  const wavePulseRef = useRef(0);
  const shimmerRef = useRef(0);
  const beamFlashRef = useRef(0);
  const wheelLockRef = useRef(false);
  const sceneTransitionLockRef = useRef(false);
  const grainPatternRef = useRef<CanvasPattern | null>(null);
  const haloPatternRef = useRef<CanvasPattern | null>(null);
  const heartBurstsRef = useRef<HeartBurst[]>([]);
  const passiveHeartAtRef = useRef(0);

  const ringLength = 2 * Math.PI * 22;

  const [scene, setScene] = useState<Scene>(1);
  const [memoryVisibleCount, setMemoryVisibleCount] = useState(0);
  const [centerActivated, setCenterActivated] = useState(false);
  const [assetReady, setAssetReady] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugEnabled, setDebugEnabled] = useState(process.env.NODE_ENV !== "production");
  const [debug, setDebug] = useState<DebugInfo>({ event: "idle", pointerType: "-", target: "-", capture: false });
  const [heartPrompt, setHeartPrompt] = useState(false);
  const [displayScene, setDisplayScene] = useState<Scene>(1);
  const [sceneTransition, setSceneTransition] = useState<"in" | "out">("in");
  const [isHolding, setIsHolding] = useState(false);
  const [romanticLine, setRomanticLine] = useState("I love the way the universe softens when you are near.");

  const reducedMotion = useReducedMotion();
  const lowPower = useLowPowerMode();
  const starCount = lowPower ? Math.floor(randomStarsSeed * 0.6) : randomStarsSeed;
  const dustCount = lowPower ? 90 : 170;

  const stars = useMemo<Star[]>(() => {
    const seeded = (seed: number) => {
      const value = Math.sin(seed) * 10000;
      return value - Math.floor(value);
    };
    return Array.from({ length: starCount }, (_, i) => ({
      x: seeded(i * 31.77),
      y: seeded(i * 41.37),
      r: 0.35 + seeded(i * 71.3) * 1.9,
      depth: seeded(i * 12.13),
      phase: seeded(i * 91.1) * Math.PI * 2
    }));
  }, [starCount]);

  const dust = useMemo<Dust[]>(() => {
    const seeded = (seed: number) => {
      const value = Math.sin(seed) * 10000;
      return value - Math.floor(value);
    };
    return Array.from({ length: dustCount }, (_, i) => ({
      x: seeded(i * 18.71),
      y: seeded(i * 27.19),
      depth: seeded(i * 42.1),
      speed: 0.00002 + seeded(i * 7.3) * 0.00008,
      angle: seeded(i * 14.9) * Math.PI,
      length: 5 + seeded(i * 5.1) * 18
    }));
  }, [dustCount]);

  const updateDebug = useCallback((event: string, pointerType: string, target: string, capture = false) => {
    setDebug({ event, pointerType, target, capture });
  }, []);

  const setSceneWithTime = useCallback((next: Scene) => {
    setScene(next);
    setDisplayScene(next);
    setSceneTransition("in");
    sceneTransitionLockRef.current = false;
    enteredSceneAtRef.current = performance.now();
  }, []);

  const nextScene = useCallback((pointerType: string, target: string) => {
    if (sceneTransitionLockRef.current) return;
    const next = Math.min(displayScene + 1, 5) as Scene;
    if (next === displayScene) return;
    sceneTransitionLockRef.current = true;
    setSceneTransition("out");
    updateDebug("advance", pointerType, target, false);
    window.setTimeout(() => {
      setScene(next);
      setDisplayScene(next);
      enteredSceneAtRef.current = performance.now();
      setSceneTransition("in");
      sceneTransitionLockRef.current = false;
    }, reducedMotion ? 80 : 220);
  }, [displayScene, reducedMotion, updateDebug]);



  const refreshRomanticLine = useCallback(async () => {
    try {
      const response = await fetch("https://api.quotable.io/random?tags=love&maxLength=110", { cache: "no-store" });
      if (!response.ok) throw new Error("quote-fetch-failed");
      const payload = await response.json() as { content?: string };
      if (payload.content) setRomanticLine(payload.content);
    } catch {
      const fallback = [
        "You are the gentlest part of every day I live.",
        "Even silence becomes beautiful when it is with you.",
        "My favorite place in this world is still next to you."
      ];
      setRomanticLine(fallback[Math.floor(Math.random() * fallback.length)]);
    }
  }, []);
  const replay = useCallback((event?: React.PointerEvent<HTMLButtonElement>) => {
    if (event) updateDebug("pointerdown", event.pointerType, "begin-again", false);
    setSceneWithTime(1);
    setCenterActivated(false);
    setMemoryVisibleCount(0);
    holdStartAtRef.current = null;
    holdPointerIdRef.current = null;
    setIsHolding(false);
    wavePulseRef.current = 0;
    shimmerRef.current = 0;
    beamFlashRef.current = 0;
    heartBurstsRef.current = [];
    passiveHeartAtRef.current = 0;
    if (ringProgressRef.current) ringProgressRef.current.style.strokeDashoffset = `${ringLength}`;
  }, [ringLength, setSceneWithTime, updateDebug]);

  useEffect(() => {
    enteredSceneAtRef.current = performance.now();
    if (typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname)) {
      setDebugEnabled(true);
    }
  }, []);

  useEffect(() => {
    if (scene !== 3) {
      setMemoryVisibleCount(0);
      return;
    }
    setMemoryVisibleCount(1);
    const t1 = window.setTimeout(() => setMemoryVisibleCount(2), reducedMotion ? 320 : 1800);
    const t2 = window.setTimeout(() => setMemoryVisibleCount(3), reducedMotion ? 640 : 3800);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [reducedMotion, scene]);


  useEffect(() => {
    setHeartPrompt(displayScene >= 4 && displayScene < 6);
    if (displayScene === 5) void refreshRomanticLine();
  }, [displayScene, refreshRomanticLine]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reducedMotion) return;
    const onMove = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      pointerOffsetRef.current = {
        x: (event.clientX - rect.left) / rect.width - 0.5,
        y: (event.clientY - rect.top) / rect.height - 0.5
      };
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reducedMotion]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onWheel = (event: WheelEvent) => {
      if (displayScene >= 5 || Math.abs(event.deltaY) < 24 || wheelLockRef.current) return;
      wheelLockRef.current = true;
      window.setTimeout(() => {
        wheelLockRef.current = false;
      }, 400);
      nextScene("wheel", "scene-scroll");
    };
    root.addEventListener("wheel", onWheel, { passive: true });
    return () => root.removeEventListener("wheel", onWheel);
  }, [displayScene, nextScene]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const createFallbackPattern = () => {
      const noise = document.createElement("canvas");
      noise.width = 128;
      noise.height = 128;
      const nctx = noise.getContext("2d");
      if (!nctx) return;
      const img = nctx.createImageData(128, 128);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.floor(Math.random() * 255);
        img.data[i] = v;
        img.data[i + 1] = v;
        img.data[i + 2] = v;
        img.data[i + 3] = 18;
      }
      nctx.putImageData(img, 0, 0);
      const main = canvas.getContext("2d");
      if (!main) return;
      grainPatternRef.current = main.createPattern(noise, "repeat");
      setAssetReady(true);
    };

    const texture = new Image();
    texture.crossOrigin = "anonymous";
    texture.src = "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/perlin-512.png";
    texture.onload = () => {
      const main = canvas.getContext("2d");
      if (!main) return;
      grainPatternRef.current = main.createPattern(texture, "repeat");
      setAssetReady(true);
    };
    texture.onerror = createFallbackPattern;

    const halo = new Image();
    halo.crossOrigin = "anonymous";
    halo.src = "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/lensflare/lensflare0.png";
    halo.onload = () => {
      const main = canvas.getContext("2d");
      if (!main) return;
      haloPatternRef.current = main.createPattern(halo, "repeat");
    };

    createFallbackPattern();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = root.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawPath = (points: { x: number; y: number }[], progress: number, stroke: string, lineWidth: number) => {
      if (progress <= 0) return;
      let total = 0;
      for (let i = 1; i < points.length; i += 1) {
        total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      }
      const target = total * Math.min(progress, 1);
      let drawn = 0;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i += 1) {
        const seg = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
        if (drawn + seg <= target) {
          ctx.lineTo(points[i].x, points[i].y);
          drawn += seg;
          continue;
        }
        const remain = target - drawn;
        if (remain > 0) {
          const ratio = remain / seg;
          ctx.lineTo(
            points[i - 1].x + (points[i].x - points[i - 1].x) * ratio,
            points[i - 1].y + (points[i].y - points[i - 1].y) * ratio
          );
        }
        break;
      }
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    };


    const updateHoldRing = (now: number) => {
      if (!holdStartAtRef.current || !ringProgressRef.current) return;
      const ratio = Math.min((now - holdStartAtRef.current) / HOLD_DURATION_MS, 1);
      ringProgressRef.current.style.strokeDashoffset = `${ringLength * (1 - ratio)}`;
      if (ratio >= 1) {
        holdStartAtRef.current = null;
        holdPointerIdRef.current = null;
        setIsHolding(false);
        shimmerRef.current = 1;
        wavePulseRef.current = 1;
        window.setTimeout(() => {
          beamFlashRef.current = 1;
          setSceneWithTime(6);
        }, 300);
      }
    };

    const drawAurora = (time: number, intensity: number) => {
      const baseY = height * 0.12;
      const layers = lowPower ? 2 : 3;
      for (let i = 0; i < layers; i += 1) {
        const y = baseY + i * 54 + Math.sin(time * 0.00015 + i) * (reducedMotion ? 2 : 9);
        const grad = ctx.createLinearGradient(0, y, width, y + 180);
        grad.addColorStop(0, `rgba(104, 89, 170, ${0.07 * intensity})`);
        grad.addColorStop(0.5, `rgba(158, 138, 216, ${0.11 * intensity})`);
        grad.addColorStop(1, "rgba(56, 43, 101, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= width; x += 24) {
          const offset = Math.sin(x * 0.01 + time * 0.00022 + i * 0.8) * (reducedMotion ? 4 : 14);
          ctx.lineTo(x, y + offset + x * 0.02);
        }
        ctx.lineTo(width, y + 220);
        ctx.lineTo(0, y + 220);
        ctx.closePath();
        ctx.fill();
      }
    };

    const animate = (time: number) => {
      const sceneAge = (time - enteredSceneAtRef.current) / 1000;
      const px = reducedMotion ? 0 : pointerOffsetRef.current.x;
      const py = reducedMotion ? 0 : pointerOffsetRef.current.y;
      const holdingNow = holdStartAtRef.current !== null;
      const heartbeat = holdingNow && !reducedMotion ? 0.5 + Math.sin(time * 0.0063) * 0.5 : 0;
      const heartPoints = heartConstellation.map((p) => ({ x: p.x * width, y: p.y * height }));

      updateHoldRing(time);
      ctx.clearRect(0, 0, width, height);

      // Moonlight beams
      const beamMotion = reducedMotion ? 0 : time * 0.000045;
      const beamLayers = lowPower ? 2 : 4;
      const beamStrength = 0.06 + (scene >= 2 ? 0.04 : 0) + beamFlashRef.current * 0.09 + heartbeat * 0.025;
      for (let i = 0; i < beamLayers; i += 1) {
        const angle = (-0.7 + i * 0.24) + beamMotion * (i + 1);
        const x = width * (0.52 + Math.sin(angle) * 0.28);
        const y = -height * 0.2;
        const grad = ctx.createRadialGradient(x, y, 20, x, y, Math.max(width, height) * 1.1);
        grad.addColorStop(0, `rgba(216,196,233,${beamStrength})`);
        grad.addColorStop(0.25, `rgba(180,161,226,${beamStrength * 0.5})`);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(width, height) * 1.12, 0, Math.PI * 2);
        ctx.fill();
      }
      beamFlashRef.current = Math.max(0, beamFlashRef.current - 0.018);

      drawAurora(time, (scene >= 2 ? 1 : 0.5) + heartbeat * 0.12);

      // Galaxy dust
      dust.forEach((d, i) => {
        const driftX = ((time * d.speed * 35 + d.x) % 1) * width;
        const driftY = ((time * d.speed * 14 + d.y) % 1) * height;
        const dd = d.depth * 0.7 + 0.3;
        const dx = Math.cos(d.angle) * d.length * dd;
        const dy = Math.sin(d.angle) * d.length * dd;
        ctx.beginPath();
        ctx.moveTo(driftX + px * 7 * dd, driftY + py * 5 * dd);
        ctx.lineTo(driftX + dx, driftY + dy);
        ctx.strokeStyle = `rgba(205, 198, 228, ${0.02 + dd * 0.06})`;
        ctx.lineWidth = i % 8 === 0 ? 1.2 : 0.7;
        ctx.stroke();
      });

      // Starfield with depth blur approximation
      stars.forEach((star) => {
        const depth = star.depth;
        const layer = depth > 0.66 ? 2 : depth > 0.33 ? 1 : 0;
        const twinkle = reducedMotion ? 0.9 : 0.7 + Math.sin(time * 0.0012 + star.phase) * 0.17;
        const pull = holdingNow ? 0.01 + heartbeat * 0.012 : 0;
        const cx = width * 0.5;
        const cy = height * 0.5;
        const sxBase = star.x * width + px * (layer + 1) * 8;
        const syBase = star.y * height + py * (layer + 1) * 6;
        const sx = sxBase + (cx - sxBase) * pull;
        const sy = syBase + (cy - syBase) * pull;
        const blurAlpha = layer === 0 ? 0.22 : layer === 1 ? 0.36 : 0.56;
        const radius = star.r * twinkle * (layer === 2 ? 1.22 : layer === 1 ? 1 : 0.86);
        if (layer === 0 && !lowPower) {
          ctx.beginPath();
          ctx.arc(sx, sy, radius * 2.1, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(180, 176, 216, ${blurAlpha * 0.35})`;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(232, 228, 245, ${blurAlpha})`;
        ctx.fill();
      });

      // Scene-specific dramatic elements
      if (scene >= 4) {
        const reveal = reducedMotion ? 1 : Math.min(sceneAge * 0.42, 1);
        drawPath(heartPoints, reveal, `rgba(239, 227, 248, ${0.86 + heartbeat * 0.12})`, lowPower ? 1.4 : 1.9);

        // Eclipse reveal event
        const eclipse = Math.min(Math.max((sceneAge - 1.2) / 3, 0), 1);
        if (eclipse > 0 && eclipse < 1) {
          const moonX = width * 0.5;
          const moonY = height * 0.27;
          const haloR = 62;
          ctx.beginPath();
          ctx.arc(moonX, moonY, haloR, 0, Math.PI * 2);
          const halo = ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, haloR);
          halo.addColorStop(0, "rgba(212, 193, 245, 0.06)");
          halo.addColorStop(0.65, "rgba(192, 166, 239, 0.18)");
          halo.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = halo;
          ctx.fill();

          const discX = moonX - 80 + eclipse * 160;
          ctx.beginPath();
          ctx.arc(discX, moonY, 44, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(8, 10, 20, 0.95)";
          ctx.fill();

          ctx.beginPath();
          ctx.arc(discX, moonY, 46, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(191, 168, 239, 0.35)";
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
      }

      if (displayScene === 6) {
        shimmerRef.current = Math.max(0, shimmerRef.current - 0.016);
        wavePulseRef.current = Math.max(0, wavePulseRef.current - 0.013);
        if (wavePulseRef.current > 0) {
          drawPath(heartPoints, 1, `rgba(244, 224, 189, ${0.72 + wavePulseRef.current * 0.2})`, 2.2 + wavePulseRef.current * 1.8);
        }
      }

      // Passive romantic hearts (gentle ambient drift)
      if (displayScene >= 4 && !reducedMotion) {
        const interval = lowPower ? 3200 : 2400;
        if (time - passiveHeartAtRef.current > interval) {
          passiveHeartAtRef.current = time;
          const ambientCount = lowPower ? 1 : 2;
          for (let i = 0; i < ambientCount; i += 1) {
            heartBurstsRef.current.push({
              x: width * (0.34 + Math.random() * 0.32),
              y: height * (0.7 + Math.random() * 0.18),
              born: time - Math.random() * 160,
              size: 5 + Math.random() * 5,
              drift: -10 + Math.random() * 20
            });
          }
          if (heartBurstsRef.current.length > 140) {
            heartBurstsRef.current.splice(0, heartBurstsRef.current.length - 140);
          }
        }
      }

      // Interactive floating heart bursts
      if (heartBurstsRef.current.length) {
        const now = time;
        heartBurstsRef.current = heartBurstsRef.current.filter((b) => now - b.born < 1800);
        heartBurstsRef.current.forEach((b, idx) => {
          const life = (now - b.born) / 1800;
          const alpha = 0.65 * (1 - life);
          const x = b.x + Math.sin((now * 0.002) + idx) * 6 + b.drift * life;
          const y = b.y - life * 70;
          const size = b.size * (1 - life * 0.35);
          drawHeart(ctx, x, y, size, `rgba(238, 194, 221, ${alpha})`);
        });
      }

      // romantic halo mist from online texture
      if (haloPatternRef.current && displayScene >= 4) {
        ctx.save();
        ctx.globalAlpha = reducedMotion ? 0.06 : 0.1;
        ctx.fillStyle = haloPatternRef.current;
        ctx.translate((time * 0.01) % 256, (time * 0.008) % 256);
        ctx.fillRect(-256, -256, width + 512, height + 512);
        ctx.restore();
      }

      // Film grain overlay
      if (grainPatternRef.current) {
        ctx.save();
        ctx.globalAlpha = lowPower ? 0.06 : 0.09;
        ctx.fillStyle = grainPatternRef.current;
        ctx.translate((time * 0.03) % 128, (time * 0.04) % 128);
        ctx.fillRect(-128, -128, width + 256, height + 256);
        ctx.restore();
      }

      // cinematic grade + vignette
      const vignette = ctx.createRadialGradient(width * 0.5, height * 0.48, Math.min(width, height) * 0.2, width * 0.5, height * 0.5, Math.max(width, height) * 0.78);
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(3,3,8,0.34)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.globalCompositeOperation = "soft-light";
      ctx.fillStyle = `rgba(118, 88, 162, ${0.08 + heartbeat * 0.03})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      raf = requestAnimationFrame(animate);
    };

    resize();
    raf = requestAnimationFrame(animate);
    const ro = new ResizeObserver(resize);
    ro.observe(root);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [displayScene, dust, lowPower, reducedMotion, ringLength, scene, setSceneWithTime, stars]);


  const createHeartBurst = (x: number, y: number, pointerType: string) => {
    const now = performance.now();
    const count = lowPower ? 6 : 10;
    for (let i = 0; i < count; i += 1) {
      heartBurstsRef.current.push({
        x,
        y,
        born: now,
        size: 6 + Math.random() * 8,
        drift: -16 + Math.random() * 32
      });
    }
    if (heartBurstsRef.current.length > 140) {
      heartBurstsRef.current.splice(0, heartBurstsRef.current.length - 140);
    }
    updateDebug("pointerdown", pointerType, "heart-burst", false);
  };

  const activateCenter = (event: React.PointerEvent<HTMLButtonElement>) => {
    updateDebug("pointerdown", event.pointerType, "center-glow", false);
    setCenterActivated(true);
  };

  const startHold = (event: React.PointerEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    holdPointerIdRef.current = event.pointerId;
    holdStartAtRef.current = performance.now();
    setIsHolding(true);
    button.setPointerCapture(event.pointerId);
    if (ringProgressRef.current) ringProgressRef.current.style.strokeDashoffset = `${ringLength}`;
    updateDebug("pointerdown", event.pointerType, "hold-make-ours", button.hasPointerCapture(event.pointerId));
  };

  const stopHold = (event: React.PointerEvent<HTMLButtonElement>, reason: "pointerup" | "pointercancel" | "pointermove") => {
    const id = holdPointerIdRef.current;
    if (id === null || event.pointerId !== id) return;

    const button = event.currentTarget;
    if (button.hasPointerCapture(id)) button.releasePointerCapture(id);

    holdPointerIdRef.current = null;
    holdStartAtRef.current = null;
    setIsHolding(false);
    if (ringProgressRef.current) ringProgressRef.current.style.strokeDashoffset = `${ringLength}`;
    updateDebug(reason, event.pointerType, "hold-make-ours", false);
  };

  const onHoldMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const id = holdPointerIdRef.current;
    if (id === null || event.pointerId !== id) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    updateDebug("pointermove", event.pointerType, "hold-make-ours", event.currentTarget.hasPointerCapture(id));
    if (!inside) stopHold(event, "pointermove");
  };

  return (
    <main className={`${styles.shell} ${displayScene >= 4 ? styles.warm : ""} ${displayScene >= 6 ? styles.finalGlow : ""}`}>
      <div className={styles.viewport} ref={rootRef} onPointerDown={(e) => {
        if (displayScene >= 4 && displayScene < 6) {
          const rect = e.currentTarget.getBoundingClientRect();
          createHeartBurst(e.clientX - rect.left, e.clientY - rect.top, e.pointerType);
        }
      }}>
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden />

        <div className={styles.overlay}>
          <section className={`${styles.content} ${styles.sceneLayer} ${sceneTransition === "out" ? styles.sceneOut : styles.sceneIn}`}>
            {displayScene === 1 && (
              <>
                <p className={`${styles.textPrimary} ${styles.blurIn}`}>Before you…</p>
                <p className={`${styles.textSecondary} ${styles.blurInDelay}`}>…the world felt bigger.</p>
                <button type="button" className={`${styles.control} tap`} onPointerDown={(e) => nextScene(e.pointerType, "scene-1-next")}>Continue</button>
                {!assetReady && <p className={styles.loading}>Preparing the night…</p>}

              </>
            )}

            {displayScene === 2 && (
              <>
                <button type="button" aria-label="Awaken the light" className={`${styles.centerLight} tap`} onPointerDown={activateCenter} />
                <p className={`${styles.textPrimary} ${styles.blurIn}`}>Then I found my home.</p>
                <button type="button" className={`${styles.control} tap`} onPointerDown={(e) => nextScene(e.pointerType, "scene-2-next")}>Continue</button>
              </>
            )}

            {displayScene === 3 && (
              <>
                <div className={styles.memoryStack}>
                  {MEMORY_LINES.map((line, index) => (
                    <p key={line} className={`${styles.memoryLine} ${memoryVisibleCount > index ? styles.memoryVisible : ""}`}>{line}</p>
                  ))}
                </div>
                <button type="button" className={`${styles.control} tap`} onPointerDown={(e) => nextScene(e.pointerType, "scene-3-next")}>Continue</button>
              </>
            )}

            {displayScene === 4 && (
              <>
                <p className={`${styles.textPrimary} ${styles.blurIn}`}>With you…</p>
                <p className={`${styles.textSecondary} ${styles.blurInDelay}`}>…everything feels right.</p>
                <h1 className={styles.question}>Anusha,<br />will you be my Valentine?</h1>
                <button type="button" className={`${styles.control} tap`} onPointerDown={(e) => nextScene(e.pointerType, "scene-4-next")}>Continue</button>
              </>
            )}

            {displayScene === 5 && (
              <>
                <h1 className={styles.question}>Anusha,<br />will you be my Valentine?</h1>
                <p className={styles.holdLabel}>Hold to make it ours.</p>
                <p className={styles.romanticLine}>“{romanticLine}”</p>
                {heartPrompt && <p className={styles.skyHint}>Tap the sky to release hearts.</p>}
                <button
                  ref={holdButtonRef}
                  type="button"
                  aria-label="Hold to make it ours"
                  className={`${styles.holdButton} ${isHolding ? styles.holding : ""} tap`}
                  onPointerDown={startHold}
                  onPointerMove={onHoldMove}
                  onPointerUp={(e) => stopHold(e, "pointerup")}
                  onPointerCancel={(e) => stopHold(e, "pointercancel")}
                >
                  <svg viewBox="0 0 56 56" className={styles.ring}>
                    <circle cx="28" cy="28" r="22" className={styles.ringTrack} />
                    <circle ref={ringProgressRef} cx="28" cy="28" r="22" className={styles.ringProgress} style={{ strokeDasharray: ringLength, strokeDashoffset: ringLength }} />
                  </svg>
                  <span>Hold</span>
                </button>
              </>
            )}

            {displayScene === 6 && (
              <>
                <h2 className={styles.always}>Always.</h2>
                <div className={styles.promiseStack}>
                  <p className={styles.promiseLine}>My heart rests with you.</p>
                  <p className={styles.promiseLine}>I choose you.</p>
                  <p className={styles.promiseLine}>Today.</p>
                  <p className={styles.promiseLine}>Tomorrow.</p>
                  <p className={styles.promiseLine}>Every day.</p>
                  <p className={styles.whisper}>I was always yours.</p>
                </div>
                <button type="button" className={`${styles.replay} tap`} onPointerDown={replay}>Begin again</button>
              </>
            )}
          </section>

          {debugEnabled && (
            <DebugPanel
              debug={debug}
              scene={displayScene}
              centerActivated={centerActivated}
              showDebug={showDebug}
              onToggle={() => setShowDebug((prev) => !prev)}
            />
          )}
        </div>
      </div>
    </main>
  );
}


type DebugPanelProps = {
  debug: DebugInfo;
  scene: Scene;
  centerActivated: boolean;
  showDebug: boolean;
  onToggle: () => void;
};

function DebugPanel({ debug, scene, centerActivated, showDebug, onToggle }: DebugPanelProps) {
  return (
    <aside className={styles.debugPanel}>
      <button type="button" className={`${styles.debugToggle} tap`} onPointerDown={onToggle}>Input Debug</button>
      {showDebug && (
        <div className={styles.debugBody}>
          <p><strong>event:</strong> {debug.event}</p>
          <p><strong>pointerType:</strong> {debug.pointerType}</p>
          <p><strong>target:</strong> {debug.target}</p>
          <p><strong>capture:</strong> {debug.capture ? "active" : "inactive"}</p>
          <p><strong>scene:</strong> {scene}</p>
          <p><strong>center:</strong> {centerActivated ? "lit" : "idle"}</p>
        </div>
      )}
    </aside>
  );
}

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, fill: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 14, size / 14);
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.bezierCurveTo(0, -3, -8, -3, -8, 2);
  ctx.bezierCurveTo(-8, 7, -2, 9.5, 0, 12);
  ctx.bezierCurveTo(2, 9.5, 8, 7, 8, 2);
  ctx.bezierCurveTo(8, -3, 0, -3, 0, 4);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(media.matches);
    const listener = (event: MediaQueryListEvent) => setReduced(event.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  return reduced;
}

function useLowPowerMode() {
  const [lowPower, setLowPower] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setLowPower((navigator.hardwareConcurrency || 4) <= 4);
  }, []);

  return lowPower;
}
