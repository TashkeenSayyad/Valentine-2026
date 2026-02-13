"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./ValentineExperience.module.css";
import { heartConstellation, randomStarsSeed, sequencePath, type Vec2 } from "@/lib/constellation";

type Stage = "sequence" | "ask" | "confirmed";

type Star = {
  x: number;
  y: number;
  r: number;
  depth: number;
  phase: number;
};

const HOLD_DURATION = 1500;
const SNAP_DISTANCE = 44;

export function ValentineExperience() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<Stage>("sequence");
  const [picked, setPicked] = useState(0);
  const [hintPulse, setHintPulse] = useState<{ x: number; y: number; id: number } | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const [noMessage, setNoMessage] = useState("");
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const stars = useMemo<Star[]>(() => {
    const seeded = (seed: number) => {
      const value = Math.sin(seed) * 10000;
      return value - Math.floor(value);
    };
    return Array.from({ length: randomStarsSeed }, (_, i) => ({
      x: seeded(i * 37.21),
      y: seeded(i * 51.77),
      r: 0.5 + seeded(i * 71.3) * 1.9,
      depth: 0.3 + seeded(i * 15.9) * 1.4,
      phase: seeded(i * 91.1) * Math.PI * 2
    }));
  }, []);

  const reducedMotion = useReducedMotion();
  const pointerOffset = useRef({ x: 0, y: 0 });
  const holdStart = useRef<number | null>(null);
  const holdFrame = useRef<number | null>(null);
  const holdPointer = useRef<number | null>(null);

  const toScreen = useCallback((point: Vec2, w: number, h: number) => ({ x: point.x * w, y: point.y * h }), []);

  const resetToSequence = useCallback(() => {
    setStage("sequence");
    setPicked(0);
    setNoMessage("Let’s try that again.");
    setSwipeX(0);
  }, []);

  useEffect(() => {
    if (stage !== "sequence") {
      setNoMessage("");
    }
  }, [stage]);

  useEffect(() => {
    const element = areaRef.current;
    if (!element || reducedMotion) {
      return;
    }
    const onMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      pointerOffset.current = { x, y };
    };

    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = areaRef.current;
    if (!canvas || !wrap) {
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    let frameId = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawPathAnimated = (points: Vec2[], progress: number, stroke: string, lineWidth: number) => {
      if (progress <= 0) return;
      const mapped = points.map((p) => toScreen(p, width, height));
      let total = 0;
      for (let i = 1; i < mapped.length; i += 1) {
        total += Math.hypot(mapped[i].x - mapped[i - 1].x, mapped[i].y - mapped[i - 1].y);
      }
      const targetLen = total * Math.min(progress, 1);
      let drawn = 0;
      context.beginPath();
      context.moveTo(mapped[0].x, mapped[0].y);
      for (let i = 1; i < mapped.length; i += 1) {
        const segLen = Math.hypot(mapped[i].x - mapped[i - 1].x, mapped[i].y - mapped[i - 1].y);
        if (drawn + segLen <= targetLen) {
          context.lineTo(mapped[i].x, mapped[i].y);
          drawn += segLen;
          continue;
        }
        const remain = targetLen - drawn;
        if (remain > 0) {
          const ratio = remain / segLen;
          context.lineTo(
            mapped[i - 1].x + (mapped[i].x - mapped[i - 1].x) * ratio,
            mapped[i - 1].y + (mapped[i].y - mapped[i - 1].y) * ratio
          );
        }
        break;
      }
      context.strokeStyle = stroke;
      context.lineWidth = lineWidth;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.shadowBlur = 18;
      context.shadowColor = "rgba(198,174,255,0.6)";
      context.stroke();
      context.shadowBlur = 0;
    };

    let revealStart = 0;

    const animate = (time: number) => {
      if (!revealStart && stage !== "sequence") revealStart = time;
      if (stage === "sequence") revealStart = 0;
      context.clearRect(0, 0, width, height);

      const px = reducedMotion ? 0 : pointerOffset.current.x;
      const py = reducedMotion ? 0 : pointerOffset.current.y;

      stars.forEach((star) => {
        const twinkle = reducedMotion ? 0.9 : 0.65 + Math.sin(time * 0.0014 + star.phase) * 0.18;
        const sx = star.x * width + px * star.depth * 16;
        const sy = star.y * height + py * star.depth * 10;
        context.beginPath();
        context.arc(sx, sy, star.r * twinkle, 0, Math.PI * 2);
        context.fillStyle = `rgba(232, 228, 255, ${0.22 + twinkle * 0.45})`;
        context.fill();
      });

      const sequenceProgress = picked / sequencePath.length;
      drawPathAnimated(sequencePath, sequenceProgress, "rgba(189,166,255,0.88)", 1.9);

      sequencePath.forEach((point, index) => {
        const pos = toScreen(point, width, height);
        const active = index < picked;
        context.beginPath();
        context.arc(pos.x, pos.y, active ? 5.8 : 4.2, 0, Math.PI * 2);
        context.fillStyle = active ? "rgba(255,214,186,0.96)" : "rgba(208,194,255,0.8)";
        context.shadowBlur = active ? 18 : 8;
        context.shadowColor = active ? "rgba(255,200,166,0.6)" : "rgba(171,150,255,0.45)";
        context.fill();
      });

      if (stage !== "sequence") {
        const elapsed = time - revealStart;
        const drawSpeed = reducedMotion ? 1200 : 1800;
        const revealProgress = Math.min(elapsed / drawSpeed, 1);
        const glow = reducedMotion ? 0.16 : 0.24;
        drawPathAnimated(heartConstellation, revealProgress, `rgba(255,201,184,${0.85 + glow})`, 2.5);

        if (revealProgress > 0.3) {
          heartConstellation.slice(0, -1).forEach((point) => {
            const pos = toScreen(point, width, height);
            context.beginPath();
            context.arc(pos.x, pos.y, 3.8, 0, Math.PI * 2);
            context.fillStyle = "rgba(255,223,204,0.92)";
            context.shadowBlur = 14;
            context.shadowColor = "rgba(255,193,170,0.56)";
            context.fill();
          });
        }
      }

      frameId = requestAnimationFrame(animate);
    };

    resize();
    frameId = requestAnimationFrame(animate);

    const observer = new ResizeObserver(resize);
    observer.observe(wrap);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [picked, reducedMotion, stage, stars, toScreen]);

  const onTap = (event: React.PointerEvent<HTMLDivElement>) => {
    if (stage !== "sequence") return;
    const wrap = areaRef.current;
    if (!wrap) return;

    const rect = wrap.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const target = sequencePath[picked];
    const tx = target.x * rect.width;
    const ty = target.y * rect.height;
    const dist = Math.hypot(x - tx, y - ty);

    if (dist < SNAP_DISTANCE) {
      setHintPulse({ x: tx, y: ty, id: Date.now() });
      const next = picked + 1;
      setPicked(next);
      if (next === sequencePath.length) {
        window.setTimeout(() => setStage("ask"), reducedMotion ? 600 : 1400);
      }
    }
  };

  const beginHold = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (stage !== "ask") return;
    event.stopPropagation();
    holdPointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    holdStart.current = performance.now();
    const run = (now: number) => {
      if (!holdStart.current) return;
      const ratio = Math.min((now - holdStart.current) / HOLD_DURATION, 1);
      setHoldProgress(ratio);
      if (ratio >= 1) {
        setStage("confirmed");
        holdStart.current = null;
        return;
      }
      holdFrame.current = requestAnimationFrame(run);
    };
    holdFrame.current = requestAnimationFrame(run);
  };

  const stopHold = (event?: React.PointerEvent<HTMLButtonElement>) => {
    if (event && holdPointer.current !== null && event.pointerId !== holdPointer.current) {
      return;
    }
    holdStart.current = null;
    holdPointer.current = null;
    if (holdFrame.current) {
      cancelAnimationFrame(holdFrame.current);
      holdFrame.current = null;
    }
    setHoldProgress(0);
  };

  const keepHoldWithinRange = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (holdPointer.current === null || event.pointerId !== holdPointer.current || !holdStart.current) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const distance = Math.hypot(event.clientX - cx, event.clientY - cy);
    if (distance > 86) {
      stopHold(event);
    }
  };

  const swipeStart = useRef(0);

  const onQuestionDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (stage !== "ask") return;
    swipeStart.current = event.clientX;
    setIsSwiping(true);
  };

  const onQuestionMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isSwiping || stage !== "ask") return;
    const delta = event.clientX - swipeStart.current;
    setSwipeX(delta);
  };

  const onQuestionUp = () => {
    if (!isSwiping || stage !== "ask") return;
    if (Math.abs(swipeX) > 96) {
      resetToSequence();
    }
    setSwipeX(0);
    setIsSwiping(false);
  };

  const ringOffset = 2 * Math.PI * 22 * (1 - holdProgress);

  return (
    <main className={`${styles.shell} ${stage === "confirmed" ? styles.warm : ""}`}>
      <div
        ref={areaRef}
        className={styles.viewport}
        onPointerDown={onTap}
        role="application"
        aria-label="Constellation reveal"
      >
        <canvas ref={canvasRef} className={styles.canvas} />
        {hintPulse && (
          <span
            key={hintPulse.id}
            className={styles.pulse}
            style={{ left: hintPulse.x, top: hintPulse.y }}
            aria-hidden
          />
        )}

        <section className={styles.copyBlock}>
          {stage === "sequence" && (
            <>
              <p className={styles.eyebrow}>Constellation reveal</p>
              <h1 className={styles.title}>Trace the stars, one by one.</h1>
              <p className={styles.caption}>Follow the brighter markers to bring the sky into focus.</p>
              {noMessage && <p className={styles.retry}>{noMessage}</p>}
            </>
          )}

          {stage !== "sequence" && (
            <div
              className={styles.questionWrap}
              onPointerDown={onQuestionDown}
              onPointerMove={onQuestionMove}
              onPointerUp={onQuestionUp}
              onPointerCancel={onQuestionUp}
              style={{ transform: `translateX(${swipeX}px)`, opacity: Math.max(1 - Math.abs(swipeX) / 160, 0.4) }}
            >
              {stage === "ask" && (
                <>
                  <p className={styles.eyebrow}>A quiet question</p>
                  <h2 className={styles.question}>Anusha, will you be my Valentine?</h2>
                  <p className={styles.caption}>Press and hold the bright star to say yes. Swipe the question away to reset.</p>
                </>
              )}
            </div>
          )}

          {stage === "ask" && (
            <button
              type="button"
              className={styles.holdStar}
              onPointerDown={beginHold}
              onPointerMove={keepHoldWithinRange}
              onPointerUp={stopHold}
              onPointerCancel={stopHold}
              aria-label="Press and hold to confirm yes"
            >
              <svg viewBox="0 0 56 56" className={styles.ring}>
                <circle cx="28" cy="28" r="22" className={styles.ringTrack} />
                <circle
                  cx="28"
                  cy="28"
                  r="22"
                  className={styles.ringProgress}
                  style={{ strokeDasharray: 2 * Math.PI * 22, strokeDashoffset: ringOffset }}
                />
              </svg>
              <span className={styles.innerStar}>✦</span>
            </button>
          )}

          {stage === "confirmed" && (
            <article className={styles.card}>
              <p className={styles.eyebrow}>Perfect.</p>
              <h2 className={styles.cardTitle}>Our Date Card</h2>
              <dl className={styles.details}>
                <div><dt>When:</dt><dd>________</dd></div>
                <div><dt>Where:</dt><dd>________</dd></div>
                <div><dt>Note:</dt><dd>________</dd></div>
              </dl>
              <button type="button" className={styles.replay} onClick={resetToSequence}>Replay</button>
            </article>
          )}
        </section>
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