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
const SNAP_DISTANCE = 52;

export function ValentineExperience() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const holdButtonRef = useRef<HTMLButtonElement>(null);

  const [stage, setStage] = useState<Stage>("sequence");
  const [picked, setPicked] = useState(0);
  const [hintPulse, setHintPulse] = useState<{ x: number; y: number; id: number } | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [noMessage, setNoMessage] = useState("");
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const pointerOffset = useRef({ x: 0, y: 0 });
  const holdStartedAt = useRef(0);
  const swipeStart = useRef(0);

  const reducedMotion = useReducedMotion();

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

  const toScreen = useCallback((point: Vec2, w: number, h: number) => ({ x: point.x * w, y: point.y * h }), []);

  const resetToSequence = useCallback(() => {
    setStage("sequence");
    setPicked(0);
    setNoMessage("Let’s try that again.");
    setSwipeX(0);
    setIsSwiping(false);
    setHoldProgress(0);
    setIsHolding(false);
  }, []);

  useEffect(() => {
    if (stage !== "sequence") {
      setNoMessage("");
    }
  }, [stage]);

  useEffect(() => {
    const element = areaRef.current;
    if (!element || reducedMotion) return;

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
    if (!isHolding || stage !== "ask") return;

    let raf = 0;
    const tick = (now: number) => {
      const ratio = Math.min((now - holdStartedAt.current) / HOLD_DURATION, 1);
      setHoldProgress(ratio);
      if (ratio >= 1) {
        setIsHolding(false);
        setStage("confirmed");
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isHolding, stage]);

  useEffect(() => {
    if (stage !== "ask") return;

    const stop = () => {
      setIsHolding(false);
      setHoldProgress(0);
    };

    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    window.addEventListener("blur", stop);

    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      window.removeEventListener("blur", stop);
    };
  }, [stage]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = areaRef.current;
    if (!canvas || !wrap) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let frameId = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let revealStart = 0;

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
      context.shadowColor = "rgba(238, 164, 255, 0.45)";
      context.stroke();
      context.shadowBlur = 0;
    };

    const animate = (time: number) => {
      if (!revealStart && stage !== "sequence") revealStart = time;
      if (stage === "sequence") revealStart = 0;

      context.clearRect(0, 0, width, height);

      const px = reducedMotion ? 0 : pointerOffset.current.x;
      const py = reducedMotion ? 0 : pointerOffset.current.y;

      stars.forEach((star) => {
        const twinkle = reducedMotion ? 0.9 : 0.66 + Math.sin(time * 0.0012 + star.phase) * 0.18;
        const sx = star.x * width + px * star.depth * 15;
        const sy = star.y * height + py * star.depth * 11;
        context.beginPath();
        context.arc(sx, sy, star.r * twinkle, 0, Math.PI * 2);
        context.fillStyle = `rgba(244, 235, 255, ${0.2 + twinkle * 0.45})`;
        context.fill();
      });

      const sequenceProgress = picked / sequencePath.length;
      drawPathAnimated(sequencePath, sequenceProgress, "rgba(217,182,255,0.95)", 2);

      sequencePath.forEach((point, index) => {
        const pos = toScreen(point, width, height);
        const active = index < picked;
        context.beginPath();
        context.arc(pos.x, pos.y, active ? 6.2 : 4.6, 0, Math.PI * 2);
        context.fillStyle = active ? "rgba(255, 218, 204, 0.98)" : "rgba(222, 194, 255, 0.85)";
        context.shadowBlur = active ? 20 : 10;
        context.shadowColor = active ? "rgba(255, 196, 166, 0.62)" : "rgba(199, 147, 255, 0.55)";
        context.fill();
      });

      if (stage !== "sequence") {
        const elapsed = time - revealStart;
        const drawSpeed = reducedMotion ? 1150 : 1750;
        const revealProgress = Math.min(elapsed / drawSpeed, 1);
        drawPathAnimated(heartConstellation, revealProgress, "rgba(255, 202, 219, 0.92)", 2.6);

        if (revealProgress > 0.25) {
          heartConstellation.slice(0, -1).forEach((point) => {
            const pos = toScreen(point, width, height);
            context.beginPath();
            context.arc(pos.x, pos.y, 3.8, 0, Math.PI * 2);
            context.fillStyle = "rgba(255,231,238,0.95)";
            context.shadowBlur = 18;
            context.shadowColor = "rgba(255,176,199,0.62)";
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

  const onTapSky = (event: React.PointerEvent<HTMLDivElement>) => {
    if (stage !== "sequence") return;
    const wrap = areaRef.current;
    if (!wrap) return;

    const target = sequencePath[picked];
    if (!target) {
      return;
    }

    const rect = wrap.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const tx = target.x * rect.width;
    const ty = target.y * rect.height;
    const dist = Math.hypot(x - tx, y - ty);

    if (dist < SNAP_DISTANCE) {
      setHintPulse({ x: tx, y: ty, id: Date.now() });
      const next = picked + 1;
      setPicked(next);
      if (next >= sequencePath.length) {
        window.setTimeout(() => setStage("ask"), reducedMotion ? 520 : 1300);
      }
    }
  };

  const beginHold = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (stage !== "ask") return;
    event.preventDefault();
    event.stopPropagation();
    holdStartedAt.current = performance.now();
    setHoldProgress(0);
    setIsHolding(true);
    holdButtonRef.current?.focus({ preventScroll: true });
  };

  const cancelHold = (event?: React.PointerEvent<HTMLButtonElement>) => {
    if (event) {
      const rect = event.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dist = Math.hypot(event.clientX - centerX, event.clientY - centerY);
      if (dist <= 94 && event.type === "pointerleave") {
        return;
      }
    }

    if (stage === "ask") {
      setIsHolding(false);
      setHoldProgress(0);
    }
  };

  const onQuestionDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (stage !== "ask") return;
    swipeStart.current = event.clientX;
    setIsSwiping(true);
  };

  const onQuestionMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isSwiping || stage !== "ask") return;
    setSwipeX(event.clientX - swipeStart.current);
  };

  const onQuestionUp = () => {
    if (!isSwiping || stage !== "ask") return;
    if (Math.abs(swipeX) > 96) {
      resetToSequence();
      return;
    }
    setSwipeX(0);
    setIsSwiping(false);
  };

  const ringOffset = 2 * Math.PI * 22 * (1 - holdProgress);

  return (
    <main className={`${styles.shell} ${stage === "confirmed" ? styles.warm : ""}`}>
      <div ref={areaRef} className={styles.viewport} onPointerDown={onTapSky} role="application" aria-label="Constellation reveal">
        <canvas ref={canvasRef} className={styles.canvas} />

        {hintPulse && <span key={hintPulse.id} className={styles.pulse} style={{ left: hintPulse.x, top: hintPulse.y }} aria-hidden />}

        <section className={styles.copyBlock}>
          {stage === "sequence" && (
            <>
              <p className={styles.eyebrow}>A constellation for us</p>
              <h1 className={styles.title}>Trace the stars and wake the heart.</h1>
              <p className={styles.caption}>Tap near each guiding star. It will softly snap into place.</p>
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
              style={{ transform: `translateX(${swipeX}px)`, opacity: Math.max(1 - Math.abs(swipeX) / 170, 0.45) }}
            >
              {stage === "ask" && (
                <>
                  <p className={styles.eyebrow}>For my love, Anusha</p>
                  <h2 className={styles.question}>Anusha, will you be my Valentine?</h2>
                  <p className={styles.caption}>Press and hold the glowing star to say yes. Swipe this line away to reset.</p>
                </>
              )}
            </div>
          )}

          {stage === "ask" && (
            <button
              ref={holdButtonRef}
              type="button"
              className={`${styles.holdStar} ${isHolding ? styles.holdStarActive : ""}`}
              onPointerDown={beginHold}
              onPointerUp={cancelHold}
              onPointerCancel={cancelHold}
              onPointerLeave={cancelHold}
              aria-label="Press and hold to confirm yes"
            >
              <svg viewBox="0 0 56 56" className={styles.ring}>
                <circle cx="28" cy="28" r="22" className={styles.ringTrack} />
                <circle cx="28" cy="28" r="22" className={styles.ringProgress} style={{ strokeDasharray: 2 * Math.PI * 22, strokeDashoffset: ringOffset }} />
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
