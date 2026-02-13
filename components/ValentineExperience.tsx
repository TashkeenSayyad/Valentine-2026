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

type DebugInfo = {
  event: string;
  pointerType: string;
  target: string;
  capture: boolean;
};

const HOLD_DURATION = 1500;
const SNAP_DISTANCE = 52;

export function ValentineExperience() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const holdButtonRef = useRef<HTMLButtonElement>(null);
  const holdPointerIdRef = useRef<number | null>(null);
  const holdStartRef = useRef(0);
  const pointerOffset = useRef({ x: 0, y: 0 });
  const swipeStart = useRef(0);

  const [stage, setStage] = useState<Stage>("sequence");
  const [picked, setPicked] = useState(0);
  const [hintPulse, setHintPulse] = useState<{ x: number; y: number; id: number } | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [noMessage, setNoMessage] = useState("");
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugEnabled, setDebugEnabled] = useState(process.env.NODE_ENV !== "production");
  const [debug, setDebug] = useState<DebugInfo>({ event: "idle", pointerType: "-", target: "-", capture: false });

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

  const updateDebug = useCallback((event: string, pointerType: string, target: string, capture = false) => {
    setDebug({ event, pointerType, target, capture });
  }, []);

  const resetToSequence = useCallback(() => {
    setStage("sequence");
    setPicked(0);
    setNoMessage("Let’s try that again.");
    setSwipeX(0);
    setIsSwiping(false);
    setIsHolding(false);
    setHoldProgress(0);
    holdPointerIdRef.current = null;
  }, []);


  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      setDebugEnabled(true);
    }
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

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reducedMotion]);

  useEffect(() => {
    if (!isHolding || stage !== "ask") return;

    let raf = 0;
    const run = (now: number) => {
      const ratio = Math.min((now - holdStartRef.current) / HOLD_DURATION, 1);
      setHoldProgress(ratio);
      if (ratio >= 1) {
        setIsHolding(false);
        setStage("confirmed");
        holdPointerIdRef.current = null;
        return;
      }
      raf = requestAnimationFrame(run);
    };

    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [isHolding, stage]);

  useEffect(() => {
    if (stage !== "ask") return;

    const stop = () => {
      setIsHolding(false);
      setHoldProgress(0);
      holdPointerIdRef.current = null;
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

    let frame = 0;
    let width = 0;
    let height = 0;
    let revealStart = 0;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = rect.width;
      height = rect.height;
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
        } else {
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
      }

      context.strokeStyle = stroke;
      context.lineWidth = lineWidth;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.shadowBlur = 18;
      context.shadowColor = "rgba(246,171,221,0.46)";
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
        const twinkle = reducedMotion ? 0.9 : 0.68 + Math.sin(time * 0.0012 + star.phase) * 0.17;
        const sx = star.x * width + px * star.depth * 14;
        const sy = star.y * height + py * star.depth * 10;
        context.beginPath();
        context.arc(sx, sy, star.r * twinkle, 0, Math.PI * 2);
        context.fillStyle = `rgba(250, 241, 255, ${0.2 + twinkle * 0.42})`;
        context.fill();
      });

      drawPathAnimated(sequencePath, picked / sequencePath.length, "rgba(230, 184, 255, 0.95)", 2);

      sequencePath.forEach((point, index) => {
        const pos = toScreen(point, width, height);
        const active = index < picked;
        context.beginPath();
        context.arc(pos.x, pos.y, active ? 6.4 : 4.6, 0, Math.PI * 2);
        context.fillStyle = active ? "rgba(255, 223, 209, 0.98)" : "rgba(228, 200, 255, 0.88)";
        context.shadowBlur = active ? 20 : 10;
        context.shadowColor = active ? "rgba(255, 194, 174, 0.65)" : "rgba(205, 153, 255, 0.58)";
        context.fill();
      });

      if (stage !== "sequence") {
        const revealProgress = Math.min((time - revealStart) / (reducedMotion ? 1200 : 1800), 1);
        drawPathAnimated(heartConstellation, revealProgress, "rgba(255, 204, 225, 0.96)", 2.6);

        if (revealProgress > 0.24) {
          heartConstellation.slice(0, -1).forEach((point) => {
            const pos = toScreen(point, width, height);
            context.beginPath();
            context.arc(pos.x, pos.y, 3.7, 0, Math.PI * 2);
            context.fillStyle = "rgba(255,236,244,0.95)";
            context.shadowBlur = 18;
            context.shadowColor = "rgba(255,173,200,0.62)";
            context.fill();
          });
        }
      }

      frame = requestAnimationFrame(animate);
    };

    resize();
    frame = requestAnimationFrame(animate);
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [picked, reducedMotion, stage, stars, toScreen]);

  const onSequenceTap = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (stage !== "sequence") return;
    const wrap = areaRef.current;
    const target = sequencePath[picked];
    if (!wrap || !target) return;

    const rect = wrap.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const tx = target.x * rect.width;
    const ty = target.y * rect.height;
    const dist = Math.hypot(x - tx, y - ty);

    updateDebug("pointerdown", event.pointerType, "sequence-target", false);

    if (dist > SNAP_DISTANCE) {
      return;
    }

    setHintPulse({ x: tx, y: ty, id: Date.now() });
    const next = picked + 1;
    setPicked(next);
    if (next >= sequencePath.length) {
      window.setTimeout(() => setStage("ask"), reducedMotion ? 500 : 1300);
    }
  };

  const onHoldDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (stage !== "ask") return;
    const button = event.currentTarget;
    holdPointerIdRef.current = event.pointerId;
    button.setPointerCapture(event.pointerId);
    holdStartRef.current = performance.now();
    setHoldProgress(0);
    setIsHolding(true);
    updateDebug("pointerdown", event.pointerType, "yes-hold-star", button.hasPointerCapture(event.pointerId));
  };

  const stopHold = (event: React.PointerEvent<HTMLButtonElement>, reason: "pointerup" | "pointercancel" | "pointermove") => {
    const pointerId = holdPointerIdRef.current;
    if (pointerId === null || event.pointerId !== pointerId) return;

    const button = event.currentTarget;
    if (button.hasPointerCapture(pointerId)) {
      button.releasePointerCapture(pointerId);
    }

    setIsHolding(false);
    setHoldProgress(0);
    holdPointerIdRef.current = null;
    updateDebug(reason, event.pointerType, "yes-hold-star", false);
  };

  const onHoldMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const pointerId = holdPointerIdRef.current;
    if (pointerId === null || event.pointerId !== pointerId || !isHolding) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    updateDebug("pointermove", event.pointerType, "yes-hold-star", event.currentTarget.hasPointerCapture(pointerId));

    if (!inside) {
      stopHold(event, "pointermove");
    }
  };

  const onQuestionDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (stage !== "ask") return;
    swipeStart.current = event.clientX;
    setIsSwiping(true);
    updateDebug("pointerdown", event.pointerType, "question-swipe", false);
  };

  const onQuestionMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isSwiping || stage !== "ask") return;
    setSwipeX(event.clientX - swipeStart.current);
  };

  const onQuestionUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isSwiping || stage !== "ask") return;
    updateDebug("pointerup", event.pointerType, "question-swipe", false);
    if (Math.abs(swipeX) > 96) {
      resetToSequence();
      return;
    }
    setSwipeX(0);
    setIsSwiping(false);
  };

  const currentTarget = sequencePath[picked];
  const ringOffset = 2 * Math.PI * 22 * (1 - holdProgress);

  return (
    <main className={`${styles.shell} ${stage === "confirmed" ? styles.warm : ""}`}>
      <div ref={areaRef} className={styles.viewport} role="application" aria-label="Constellation reveal">
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden />

        <div className={styles.uiLayer}>
          {stage === "sequence" && currentTarget && (
            <button
              type="button"
              aria-label="Tap star target"
              className={`${styles.sequenceTarget} tap`}
              style={{ left: `${currentTarget.x * 100}%`, top: `${currentTarget.y * 100}%` }}
              onPointerDown={onSequenceTap}
            />
          )}

          {hintPulse && <span key={hintPulse.id} className={styles.pulse} style={{ left: hintPulse.x, top: hintPulse.y }} aria-hidden />}

          <section className={styles.copyBlock}>
            {stage === "sequence" && (
              <>
                <p className={styles.eyebrow}>A constellation for us</p>
                <h1 className={styles.title}>Trace the stars and wake the heart.</h1>
                <p className={styles.caption}>Tap each guiding star to connect the sky.</p>
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
                    <p className={styles.caption}>Press and hold the glowing star for yes. Swipe this text away to reset.</p>
                  </>
                )}
              </div>
            )}

            {stage === "ask" && (
              <button
                ref={holdButtonRef}
                type="button"
                aria-label="Press and hold to confirm yes"
                className={`${styles.holdStar} ${isHolding ? styles.holdStarActive : ""} tap`}
                onPointerDown={onHoldDown}
                onPointerMove={onHoldMove}
                onPointerUp={(event) => stopHold(event, "pointerup")}
                onPointerCancel={(event) => stopHold(event, "pointercancel")}
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
                <button type="button" className={`${styles.replay} tap`} onPointerDown={resetToSequence}>Replay</button>
              </article>
            )}
          </section>

          {debugEnabled && (
            <aside className={styles.debugPanel}>
              <button type="button" className={`${styles.debugToggle} tap`} onPointerDown={() => setShowDebug((prev) => !prev)}>
                Input Debug
              </button>
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
