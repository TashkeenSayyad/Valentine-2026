"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./ValentineExperience.module.css";
import { heartConstellation, randomStarsSeed, type Vec2 } from "@/lib/constellation";

type Scene = 0 | 1 | 2 | 3 | 4;

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

const HOLD_MS = 1500;

export function ValentineExperience() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const holdRef = useRef<HTMLButtonElement>(null);
  const holdPointerId = useRef<number | null>(null);
  const holdStart = useRef(0);
  const sceneEnteredAt = useRef(0);
  const wheelLock = useRef(false);

  const [scene, setScene] = useState<Scene>(0);
  const [lightTriggered, setLightTriggered] = useState(false);
  const [rippleAt, setRippleAt] = useState<number | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const wavePulseRef = useRef(0);
  const [showDebug, setShowDebug] = useState(false);
  const [debugEnabled, setDebugEnabled] = useState(process.env.NODE_ENV !== "production");
  const [debug, setDebug] = useState<DebugInfo>({ event: "idle", pointerType: "-", target: "-", capture: false });

  const reducedMotion = useReducedMotion();
  const pointerOffset = useRef({ x: 0, y: 0 });

  const stars = useMemo<Star[]>(() => {
    const seeded = (seed: number) => {
      const value = Math.sin(seed) * 10000;
      return value - Math.floor(value);
    };

    return Array.from({ length: randomStarsSeed }, (_, i) => ({
      x: seeded(i * 31.77),
      y: seeded(i * 41.37),
      r: 0.5 + seeded(i * 71.3) * 1.8,
      depth: 0.4 + seeded(i * 15.9) * 1.2,
      phase: seeded(i * 91.1) * Math.PI * 2
    }));
  }, []);

  const setSceneSafe = (next: Scene) => {
    setScene(next);
    sceneEnteredAt.current = performance.now();
  };

  const updateDebug = useCallback((event: string, pointerType: string, target: string, capture = false) => {
    setDebug({ event, pointerType, target, capture });
  }, []);

  const advanceScene = useCallback((pointerType: string, target: string) => {
    setScene((current) => {
      const next = Math.min(current + 1, 3) as Scene;
      if (next !== current) {
        sceneEnteredAt.current = performance.now();
      }
      updateDebug("advance", pointerType, target, false);
      return next;
    });
  }, [updateDebug]);

  const replay = useCallback((event?: React.PointerEvent<HTMLButtonElement>) => {
    if (event) {
      updateDebug("pointerdown", event.pointerType, "replay", false);
    }
    setSceneSafe(0);
    setLightTriggered(false);
    setRippleAt(null);
    setHoldProgress(0);
    setHolding(false);
    wavePulseRef.current = 0;
    holdPointerId.current = null;
  }, [updateDebug]);

  useEffect(() => {
    sceneEnteredAt.current = performance.now();
    if (typeof window !== "undefined" && ["localhost", "127.0.0.1"].includes(window.location.hostname)) {
      setDebugEnabled(true);
    }
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || reducedMotion) return;

    const onMove = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      pointerOffset.current = {
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
      if (Math.abs(event.deltaY) < 25 || wheelLock.current || scene >= 3) return;
      wheelLock.current = true;
      window.setTimeout(() => {
        wheelLock.current = false;
      }, 420);
      advanceScene("wheel", "scene-scroll");
    };

    root.addEventListener("wheel", onWheel, { passive: true });
    return () => root.removeEventListener("wheel", onWheel);
  }, [advanceScene, scene]);

  useEffect(() => {
    if (!holding || scene !== 3) return;

    let frame = 0;
    const tick = (now: number) => {
      const ratio = Math.min((now - holdStart.current) / HOLD_MS, 1);
      setHoldProgress(ratio);
      if (ratio >= 1) {
        setHolding(false);
        setSceneSafe(4);
        wavePulseRef.current = 1;
        holdPointerId.current = null;
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [holding, scene]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;

    const resize = () => {
      const rect = root.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawPath = (points: Vec2[], progress: number, stroke: string, lineWidth: number) => {
      if (progress <= 0) return;
      const mapped = points.map((p) => ({ x: p.x * w, y: p.y * h }));
      let total = 0;
      for (let i = 1; i < mapped.length; i += 1) {
        total += Math.hypot(mapped[i].x - mapped[i - 1].x, mapped[i].y - mapped[i - 1].y);
      }
      const targetLen = total * Math.min(progress, 1);
      let drawn = 0;

      ctx.beginPath();
      ctx.moveTo(mapped[0].x, mapped[0].y);
      for (let i = 1; i < mapped.length; i += 1) {
        const seg = Math.hypot(mapped[i].x - mapped[i - 1].x, mapped[i].y - mapped[i - 1].y);
        if (drawn + seg <= targetLen) {
          ctx.lineTo(mapped[i].x, mapped[i].y);
          drawn += seg;
          continue;
        }
        const remain = targetLen - drawn;
        if (remain > 0) {
          const ratio = remain / seg;
          ctx.lineTo(
            mapped[i - 1].x + (mapped[i].x - mapped[i - 1].x) * ratio,
            mapped[i - 1].y + (mapped[i].y - mapped[i - 1].y) * ratio
          );
        }
        break;
      }

      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowBlur = 18;
      ctx.shadowColor = "rgba(189,170,255,0.5)";
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    const animate = (time: number) => {
      const px = reducedMotion ? 0 : pointerOffset.current.x;
      const py = reducedMotion ? 0 : pointerOffset.current.y;
      const sceneTime = (time - sceneEnteredAt.current) / 1000;

      ctx.clearRect(0, 0, w, h);

      const revealFactor = Math.min(Math.max(scene + (lightTriggered ? 0.65 : 0), 0) / 4, 1);
      stars.forEach((star, i) => {
        const twinkle = reducedMotion ? 0.88 : 0.68 + Math.sin(time * 0.0011 + star.phase) * 0.17;
        const alpha = 0.06 + revealFactor * 0.46;
        const sx = star.x * w + px * star.depth * 11;
        const sy = star.y * h + py * star.depth * 8;
        const gate = scene === 0 ? Math.max(0, sceneTime * 0.24 - i / stars.length) : 1;
        if (gate <= 0) return;
        ctx.beginPath();
        ctx.arc(sx, sy, star.r * twinkle, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(239,233,255,${alpha * gate})`;
        ctx.fill();
      });

      if (scene >= 1) {
        const cx = w * 0.5;
        const cy = h * 0.44;
        const bloom = lightTriggered ? 1 : Math.min(sceneTime * 0.65, 1);
        ctx.beginPath();
        ctx.arc(cx, cy, 3.2 + bloom * 2.8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,238,220,0.96)";
        ctx.shadowBlur = 25;
        ctx.shadowColor = "rgba(255,225,185,0.72)";
        ctx.fill();
        ctx.shadowBlur = 0;

        if (rippleAt) {
          const rippleProgress = Math.min((time - rippleAt) / (reducedMotion ? 560 : 1100), 1);
          if (rippleProgress < 1) {
            ctx.beginPath();
            ctx.arc(cx, cy, 20 + rippleProgress * 170, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(226,201,255,${0.44 - rippleProgress * 0.44})`;
            ctx.lineWidth = 1.6;
            ctx.stroke();
          }
        }
      }

      if (scene >= 2) {
        const pathProgress = reducedMotion ? 1 : Math.min(sceneTime * 0.48, 1);
        drawPath(heartConstellation, pathProgress, "rgba(231,214,255,0.9)", 2.1);
      }

      if (scene >= 3) {
        const beat = reducedMotion ? 0.8 : 0.72 + Math.sin(time * 0.0022) * 0.08;
        heartConstellation.slice(0, -1).forEach((p) => {
          const x = p.x * w;
          const y = p.y * h;
          ctx.beginPath();
          ctx.arc(x, y, 2.8 + beat, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,234,240,0.9)";
          ctx.shadowBlur = 12;
          ctx.shadowColor = "rgba(237,182,210,0.5)";
          ctx.fill();
        });
        ctx.shadowBlur = 0;
      }

      if (scene === 4) {
        wavePulseRef.current = Math.max(wavePulseRef.current - 0.015, 0);
        if (wavePulseRef.current > 0) {
          drawPath(heartConstellation, 1, `rgba(255,236,246,${0.6 + wavePulseRef.current * 0.4})`, 2.8 + wavePulseRef.current * 1.8);
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
  }, [scene, stars, reducedMotion, lightTriggered, rippleAt]);

  const triggerLight = (event: React.PointerEvent<HTMLButtonElement>) => {
    updateDebug("pointerdown", event.pointerType, "central-star", false);
    setLightTriggered(true);
    setRippleAt(performance.now());
  };

  const onHoldDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    holdPointerId.current = event.pointerId;
    button.setPointerCapture(event.pointerId);
    holdStart.current = performance.now();
    setHoldProgress(0);
    setHolding(true);
    updateDebug("pointerdown", event.pointerType, "hold-answer", button.hasPointerCapture(event.pointerId));
  };

  const endHold = (event: React.PointerEvent<HTMLButtonElement>, reason: "pointerup" | "pointercancel" | "pointermove") => {
    const id = holdPointerId.current;
    if (id === null || event.pointerId !== id) return;
    const button = event.currentTarget;
    if (button.hasPointerCapture(id)) {
      button.releasePointerCapture(id);
    }
    setHolding(false);
    setHoldProgress(0);
    holdPointerId.current = null;
    updateDebug(reason, event.pointerType, "hold-answer", false);
  };

  const onHoldMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const id = holdPointerId.current;
    if (id === null || event.pointerId !== id || !holding) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    updateDebug("pointermove", event.pointerType, "hold-answer", event.currentTarget.hasPointerCapture(id));
    if (!inside) {
      endHold(event, "pointermove");
    }
  };

  const ringOffset = 2 * Math.PI * 22 * (1 - holdProgress);

  return (
    <main className={`${styles.shell} ${scene >= 3 ? styles.warmer : ""} ${scene === 4 ? styles.deepFinal : ""}`}>
      <div className={styles.viewport} ref={rootRef}>
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden />

        <div className={styles.uiLayer}>
          <section className={`${styles.content} ${styles[`scene${scene}`]}`}>
            {scene === 0 && (
              <>
                <p className={styles.lineOne}>In a world full of noise…</p>
                <button className={`${styles.progressButton} tap`} type="button" onPointerDown={(e) => advanceScene(e.pointerType, "scene-1-progress")}>Continue</button>
              </>
            )}

            {scene === 1 && (
              <>
                <button type="button" aria-label="Reveal light" className={`${styles.centerStarButton} tap`} onPointerDown={triggerLight} />
                <p className={styles.lineTwo}>You are my calm.</p>
                <button className={`${styles.progressButton} tap`} type="button" onPointerDown={(e) => advanceScene(e.pointerType, "scene-2-progress")}>Continue</button>
              </>
            )}

            {scene === 2 && (
              <>
                <p className={styles.lineThree}>You are my favorite place to exist.</p>
                <button className={`${styles.progressButton} tap`} type="button" onPointerDown={(e) => advanceScene(e.pointerType, "scene-3-progress")}>Continue</button>
              </>
            )}

            {scene === 3 && (
              <>
                <h1 className={styles.question}>Anusha,<br />will you be my Valentine?</h1>
                <p className={styles.holdLabel}>Hold to answer.</p>
                <button
                  ref={holdRef}
                  type="button"
                  aria-label="Hold to answer"
                  className={`${styles.holdButton} ${holding ? styles.holding : ""} tap`}
                  onPointerDown={onHoldDown}
                  onPointerMove={onHoldMove}
                  onPointerUp={(event) => endHold(event, "pointerup")}
                  onPointerCancel={(event) => endHold(event, "pointercancel")}
                >
                  <svg viewBox="0 0 56 56" className={styles.ring}>
                    <circle cx="28" cy="28" r="22" className={styles.ringTrack} />
                    <circle cx="28" cy="28" r="22" className={styles.ringProgress} style={{ strokeDasharray: 2 * Math.PI * 22, strokeDashoffset: ringOffset }} />
                  </svg>
                  <span>Hold</span>
                </button>
              </>
            )}

            {scene === 4 && (
              <>
                <h2 className={styles.always}>Always.</h2>
                <p className={styles.finalCopy}>I choose you.<br />Every day.</p>
                <button type="button" className={`${styles.replay} tap`} onPointerDown={replay}>Replay</button>
              </>
            )}
          </section>

          {debugEnabled && (
            <aside className={styles.debugPanel}>
              <button type="button" className={`${styles.debugToggle} tap`} onPointerDown={() => setShowDebug((s) => !s)}>Input Debug</button>
              {showDebug && (
                <div className={styles.debugBody}>
                  <p><strong>event:</strong> {debug.event}</p>
                  <p><strong>pointerType:</strong> {debug.pointerType}</p>
                  <p><strong>target:</strong> {debug.target}</p>
                  <p><strong>capture:</strong> {debug.capture ? "active" : "inactive"}</p>
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
