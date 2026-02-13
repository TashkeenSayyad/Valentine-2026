"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./ValentineExperience.module.css";
import { heartConstellation, randomStarsSeed } from "@/lib/constellation";

type Scene = 1 | 2 | 3 | 4 | 5 | 6;

type Star = {
  x: number;
  y: number;
  r: number;
  depth: number;
  phase: number;
};

type DebugInfo = {
  event: string;
  pointerType: string;
  target: string;
  capture: boolean;
};

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
  const ringLen = 2 * Math.PI * 22;

  const pointerOffsetRef = useRef({ x: 0, y: 0 });
  const enteredSceneAtRef = useRef(0);
  const holdPointerIdRef = useRef<number | null>(null);
  const holdStartAtRef = useRef<number | null>(null);
  const wavePulseRef = useRef(0);
  const shimmerRef = useRef(0);
  const beamFlashRef = useRef(0);
  const wheelLockRef = useRef(false);

  const [scene, setScene] = useState<Scene>(1);
  const [centerActivated, setCenterActivated] = useState(false);
  const [memoryVisibleCount, setMemoryVisibleCount] = useState(0);
  const [debugEnabled, setDebugEnabled] = useState(process.env.NODE_ENV !== "production");
  const [showDebug, setShowDebug] = useState(false);
  const [debug, setDebug] = useState<DebugInfo>({ event: "idle", pointerType: "-", target: "-", capture: false });

  const reducedMotion = useReducedMotion();
  const lowPower = useLowPowerMode();

  const starCount = lowPower ? Math.floor(randomStarsSeed * 0.62) : randomStarsSeed;

  const stars = useMemo<Star[]>(() => {
    const seeded = (seed: number) => {
      const value = Math.sin(seed) * 10000;
      return value - Math.floor(value);
    };
    return Array.from({ length: starCount }, (_, i) => ({
      x: seeded(i * 31.77),
      y: seeded(i * 41.37),
      r: 0.45 + seeded(i * 71.3) * 1.7,
      depth: 0.34 + seeded(i * 15.9) * 1.2,
      phase: seeded(i * 91.1) * Math.PI * 2
    }));
  }, [starCount]);

  const updateDebug = useCallback((event: string, pointerType: string, target: string, capture = false) => {
    setDebug({ event, pointerType, target, capture });
  }, []);

  const goToScene = useCallback((next: Scene) => {
    setScene(next);
    enteredSceneAtRef.current = performance.now();
  }, []);

  const nextScene = useCallback((pointerType: string, target: string) => {
    setScene((prev) => {
      const next = Math.min(prev + 1, 5) as Scene;
      if (next !== prev) {
        enteredSceneAtRef.current = performance.now();
      }
      updateDebug("advance", pointerType, target, false);
      return next;
    });
  }, [updateDebug]);

  const replay = useCallback((event?: React.PointerEvent<HTMLButtonElement>) => {
    if (event) {
      updateDebug("pointerdown", event.pointerType, "begin-again", false);
    }
    goToScene(1);
    setCenterActivated(false);
    holdStartAtRef.current = null;
    holdPointerIdRef.current = null;
    wavePulseRef.current = 0;
    shimmerRef.current = 0;
    beamFlashRef.current = 0;
    if (ringProgressRef.current) {
      ringProgressRef.current.style.strokeDashoffset = `${ringLen}`;
    }
  }, [goToScene, ringLen, updateDebug]);

  useEffect(() => {
    enteredSceneAtRef.current = performance.now();
    if (typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname)) {
      setDebugEnabled(true);
    }
  }, []);

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
      if (scene >= 5 || Math.abs(event.deltaY) < 24 || wheelLockRef.current) return;
      wheelLockRef.current = true;
      window.setTimeout(() => {
        wheelLockRef.current = false;
      }, 380);
      nextScene("wheel", "scene-scroll");
    };

    root.addEventListener("wheel", onWheel, { passive: true });
    return () => root.removeEventListener("wheel", onWheel);
  }, [nextScene, scene]);


  useEffect(() => {
    if (scene !== 3) {
      setMemoryVisibleCount(0);
      return;
    }

    setMemoryVisibleCount(1);
    const first = window.setTimeout(() => setMemoryVisibleCount(2), reducedMotion ? 380 : 1450);
    const second = window.setTimeout(() => setMemoryVisibleCount(3), reducedMotion ? 760 : 2900);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(second);
    };
  }, [scene, reducedMotion]);

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
      const dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1.4 : 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawConstellationPath = (progress: number, stroke: string, lineWidth: number) => {
      if (progress <= 0) return;
      const points = heartConstellation.map((p) => ({ x: p.x * width, y: p.y * height }));
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
      ctx.shadowBlur = 14;
      ctx.shadowColor = "rgba(180,166,235,0.45)";
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    const updateHoldProgressRing = (now: number) => {
      const started = holdStartAtRef.current;
      if (!started || !ringProgressRef.current) return;

      const ratio = Math.min((now - started) / HOLD_DURATION_MS, 1);
      ringProgressRef.current.style.strokeDashoffset = `${ringLen * (1 - ratio)}`;

      if (ratio >= 1) {
        holdStartAtRef.current = null;
        holdPointerIdRef.current = null;
        wavePulseRef.current = 1;
        shimmerRef.current = 1;
        beamFlashRef.current = 1;
        goToScene(6);
      }
    };

    const animate = (time: number) => {
      const sceneAge = (time - enteredSceneAtRef.current) / 1000;
      const px = reducedMotion ? 0 : pointerOffsetRef.current.x;
      const py = reducedMotion ? 0 : pointerOffsetRef.current.y;

      updateHoldProgressRing(time);

      ctx.clearRect(0, 0, width, height);

      // Moonlight beams (subtle volumetric effect)
      const beamMotion = reducedMotion ? 0 : time * 0.00005;
      const beamAlpha = 0.08 + (scene >= 2 ? 0.035 : 0) + beamFlashRef.current * 0.08;
      for (let i = 0; i < 3; i += 1) {
        const angle = (-0.8 + i * 0.35) + beamMotion * (i + 1);
        const x = width * (0.5 + Math.sin(angle) * 0.28);
        const y = -height * 0.15;
        const grad = ctx.createRadialGradient(x, y, 20, x, y, Math.max(width, height) * 1.12);
        grad.addColorStop(0, `rgba(236, 227, 200, ${beamAlpha})`);
        grad.addColorStop(0.2, `rgba(204, 195, 231, ${beamAlpha * 0.36})`);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(width, height) * 1.16, 0, Math.PI * 2);
        ctx.fill();
      }
      beamFlashRef.current = Math.max(beamFlashRef.current - 0.016, 0);

      const reveal = Math.min(scene / 4, 1);

      stars.forEach((star, i) => {
        const twinkle = reducedMotion ? 0.86 : 0.64 + Math.sin(time * 0.0012 + star.phase) * 0.16;
        const gate = scene === 1 ? Math.max(0, sceneAge * 0.22 - i / stars.length) : 1;
        if (gate <= 0) return;

        let sx = star.x * width + px * star.depth * 10;
        let sy = star.y * height + py * star.depth * 7;

        if (scene >= 2 && !reducedMotion) {
          const cx = width * 0.5;
          const cy = height * 0.42;
          sx += (cx - sx) * 0.00045 * (Math.sin(time * 0.001 + i) + 1.4);
          sy += (cy - sy) * 0.00045 * (Math.cos(time * 0.0012 + i) + 1.4);
        }

        const alpha = (0.14 + reveal * 0.4) * gate;
        ctx.beginPath();
        ctx.arc(sx, sy, star.r * twinkle, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(233, 228, 246, ${alpha})`;
        ctx.fill();
      });

      if (scene >= 4) {
        const pathDraw = reducedMotion ? 1 : Math.min(sceneAge * 0.48, 1);
        drawConstellationPath(pathDraw, "rgba(228, 218, 246, 0.92)", lowPower ? 1.45 : 1.8);

        const pulse = reducedMotion ? 0.75 : 0.7 + Math.sin(time * 0.0022) * 0.08;
        const shimmer = shimmerRef.current;
        heartConstellation.slice(0, -1).forEach((p) => {
          const x = p.x * width;
          const y = p.y * height;
          ctx.beginPath();
          ctx.arc(x, y, 2.7 + pulse + shimmer * 1.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(251, 244, 230, ${0.75 + shimmer * 0.2})`;
          ctx.shadowBlur = 10 + shimmer * 5;
          ctx.shadowColor = "rgba(224, 192, 144, 0.45)";
          ctx.fill();
        });
        ctx.shadowBlur = 0;
        shimmerRef.current = Math.max(shimmerRef.current - 0.016, 0);
      }

      if (scene === 6) {
        wavePulseRef.current = Math.max(wavePulseRef.current - 0.013, 0);
        if (wavePulseRef.current > 0) {
          drawConstellationPath(1, `rgba(251, 233, 198, ${0.74 + wavePulseRef.current * 0.2})`, 2.4 + wavePulseRef.current * 1.8);
        }
      }

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
  }, [goToScene, lowPower, reducedMotion, ringLen, scene, stars]);

  const activateCenter = (event: React.PointerEvent<HTMLButtonElement>) => {
    updateDebug("pointerdown", event.pointerType, "center-glow", false);
    setCenterActivated(true);
  };

  const startHold = (event: React.PointerEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    holdPointerIdRef.current = event.pointerId;
    holdStartAtRef.current = performance.now();
    button.setPointerCapture(event.pointerId);
    if (ringProgressRef.current) {
      ringProgressRef.current.style.strokeDashoffset = `${ringLen}`;
    }
    updateDebug("pointerdown", event.pointerType, "hold-make-ours", button.hasPointerCapture(event.pointerId));
  };

  const cancelHold = (event: React.PointerEvent<HTMLButtonElement>, type: "pointerup" | "pointercancel" | "pointermove") => {
    const id = holdPointerIdRef.current;
    if (id === null || event.pointerId !== id) return;

    const button = event.currentTarget;
    if (button.hasPointerCapture(id)) {
      button.releasePointerCapture(id);
    }

    holdPointerIdRef.current = null;
    holdStartAtRef.current = null;
    if (ringProgressRef.current) {
      ringProgressRef.current.style.strokeDashoffset = `${ringLen}`;
    }
    updateDebug(type, event.pointerType, "hold-make-ours", false);
  };

  const onHoldMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const id = holdPointerIdRef.current;
    if (id === null || event.pointerId !== id) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    updateDebug("pointermove", event.pointerType, "hold-make-ours", event.currentTarget.hasPointerCapture(id));

    if (!inside) {
      cancelHold(event, "pointermove");
    }
  };

  return (
    <main className={`${styles.shell} ${scene >= 4 ? styles.warm : ""} ${scene >= 6 ? styles.finalGlow : ""}`}>
      <div className={styles.viewport} ref={rootRef}>
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden />

        <div className={styles.overlay}>
          <section className={styles.content}>
            {scene === 1 && (
              <>
                <p className={`${styles.textPrimary} ${styles.blurIn}`}>Before you…</p>
                <p className={`${styles.textSecondary} ${styles.blurInDelay}`}>…the world felt bigger.</p>
                <button type="button" className={`${styles.control} tap`} onPointerDown={(e) => nextScene(e.pointerType, "scene-1-next")}>Continue</button>
              </>
            )}

            {scene === 2 && (
              <>
                <button type="button" aria-label="Awaken the light" className={`${styles.centerLight} tap`} onPointerDown={activateCenter} />
                <p className={`${styles.textPrimary} ${styles.blurIn}`}>Then I found my home.</p>
                <button type="button" className={`${styles.control} tap`} onPointerDown={(e) => nextScene(e.pointerType, "scene-2-next")}>Continue</button>
              </>
            )}

            {scene === 3 && (
              <>
                <div className={styles.memoryStack}>
                  {MEMORY_LINES.map((line, idx) => (
                    <p key={line} className={`${styles.memoryLine} ${memoryVisibleCount > idx ? styles.memoryVisible : ""}`}>{line}</p>
                  ))}
                </div>
                <button type="button" className={`${styles.control} tap`} onPointerDown={(e) => nextScene(e.pointerType, "scene-3-next")}>Continue</button>
              </>
            )}

            {scene === 4 && (
              <>
                <p className={`${styles.textPrimary} ${styles.blurIn}`}>With you…</p>
                <p className={`${styles.textSecondary} ${styles.blurInDelay}`}>…everything feels right.</p>
                <h1 className={styles.question}>Anusha,<br />will you be my Valentine?</h1>
                <button type="button" className={`${styles.control} tap`} onPointerDown={(e) => nextScene(e.pointerType, "scene-4-next")}>Continue</button>
              </>
            )}

            {scene === 5 && (
              <>
                <h1 className={styles.question}>Anusha,<br />will you be my Valentine?</h1>
                <p className={styles.holdLabel}>Hold to make it ours.</p>
                <button
                  ref={holdButtonRef}
                  type="button"
                  aria-label="Hold to make it ours"
                  className={`${styles.holdButton} tap`}
                  onPointerDown={startHold}
                  onPointerMove={onHoldMove}
                  onPointerUp={(e) => cancelHold(e, "pointerup")}
                  onPointerCancel={(e) => cancelHold(e, "pointercancel")}
                >
                  <svg viewBox="0 0 56 56" className={styles.ring}>
                    <circle cx="28" cy="28" r="22" className={styles.ringTrack} />
                    <circle ref={ringProgressRef} cx="28" cy="28" r="22" className={styles.ringProgress} style={{ strokeDasharray: ringLen, strokeDashoffset: ringLen }} />
                  </svg>
                  <span>Hold</span>
                </button>
              </>
            )}

            {scene === 6 && (
              <>
                <h2 className={styles.always}>Always.</h2>
                <div className={styles.promiseStack}>
                  <p className={styles.promiseLine}>My heart rests with you.</p>
                  <p className={styles.promiseLine}>I choose you.</p>
                  <p className={styles.promiseLine}>Today.</p>
                  <p className={styles.promiseLine}>Tomorrow.</p>
                  <p className={styles.promiseLine}>Every day.</p>
                </div>
                <button type="button" className={`${styles.replay} tap`} onPointerDown={replay}>Begin again</button>
              </>
            )}
          </section>

          {debugEnabled && (
            <aside className={styles.debugPanel}>
              <button type="button" className={`${styles.debugToggle} tap`} onPointerDown={() => setShowDebug((prev) => !prev)}>Input Debug</button>
              {showDebug && (
                <div className={styles.debugBody}>
                  <p><strong>event:</strong> {debug.event}</p>
                  <p><strong>pointerType:</strong> {debug.pointerType}</p>
                  <p><strong>target:</strong> {debug.target}</p>
                  <p><strong>capture:</strong> {debug.capture ? "active" : "inactive"}</p>
                  <p><strong>scene:</strong> {scene}</p>
                  <p><strong>light:</strong> {centerActivated ? "active" : "idle"}</p>
                </div>
              )}
            </aside>
          )}
        </div>
      </div>
    </main>
  );
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
    const cores = navigator.hardwareConcurrency || 4;
    setLowPower(cores <= 4);
  }, []);

  return lowPower;
}
