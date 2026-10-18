import { Maximize, Minimize, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import OrbFidget from "./fidgets/OrbFidget";
import useFullscreen from "../hooks/useFullscreen";

const STRAND_COUNT = 150;
const SEGMENTS = 28;

export default function MentalBreak() {
  const canvasRef = useRef(null);
  const drawRef = useRef(null);
  const frameRef = useRef(0);
  const strandsRef = useRef([]);
  const pointerRef = useRef({ down: false, x: 0, y: 0 });
  const reducedMotionRef = useRef(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const strandFullscreen = useFullscreen();

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      throw new Error("Your browser could not start the interactive stress reliever.");
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = reducedMotion.matches;
    const handleMotionPreference = () => {
      reducedMotionRef.current = reducedMotion.matches;
    };
    reducedMotion.addEventListener("change", handleMotionPreference);

    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let accent = "#6688cc";
    let muted = "#9aa8bd";
    const strands = Array.from({ length: STRAND_COUNT }, (_, index) => ({
      angle: -Math.PI + 0.16 + (index / (STRAND_COUNT - 1)) * (Math.PI - 0.32),
      length: 0.55 + ((index * 37) % 47) / 100,
      phase: (index * 2.399) % (Math.PI * 2),
      offset: 0,
      velocity: 0,
    }));
    strandsRef.current = strands;

    function resize() {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      const styles = getComputedStyle(canvas);
      accent = styles.getPropertyValue("--accent").trim() || accent;
      muted = styles.getPropertyValue("--muted").trim() || muted;
      draw(false);
    }

    function draw(animate) {
      if (!width || !height) return;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
      const originX = width * 0.5;
      const originY = height * 1.06;
      const maxLength = Math.hypot(width * 0.8, height * 1.08);
      const lineWidth = width < 600 ? 0.8 : 1;

      strands.forEach((strand, index) => {
        const dx = Math.cos(strand.angle);
        const dy = Math.sin(strand.angle);
        const length = maxLength * strand.length;
        const bend = strand.offset * Math.min(width, height) * 0.2;
        const phase = animate && !reducedMotionRef.current ? strand.phase : 0;

        context.beginPath();
        for (let step = 0; step <= (animate ? SEGMENTS : 1); step++) {
          const progress = step / (animate ? SEGMENTS : 1);
          const wave = Math.sin(progress * Math.PI) * bend;
          const ripple =
            animate && !reducedMotionRef.current
              ? Math.sin(progress * 11 + phase) * strand.offset * 4 * progress
              : 0;
          const normalX = -dy;
          const normalY = dx;
          const x = originX + dx * length * progress + normalX * (wave + ripple);
          const y = originY + dy * length * progress + normalY * (wave + ripple);
          if (step === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.strokeStyle = index % 5 === 0 ? accent : muted;
        context.globalAlpha = index % 5 === 0 ? 0.72 : 0.43;
        context.lineWidth = lineWidth;
        context.stroke();

        const dotX = originX + dx * length + -dy * bend;
        const dotY = originY + dy * length + dx * bend;
        context.beginPath();
        context.arc(dotX, dotY, index % 4 === 0 ? 2 : 1.3, 0, Math.PI * 2);
        context.fillStyle = accent;
        context.globalAlpha = index % 4 === 0 ? 0.8 : 0.45;
        context.fill();
      });
      context.globalAlpha = 1;
    }

    function animate() {
      frameRef.current = 0;
      let moving = false;
      strands.forEach((strand) => {
        strand.velocity += -strand.offset * 0.09;
        strand.velocity *= 0.88;
        strand.offset += strand.velocity;
        if (Math.abs(strand.offset) < 0.001 && Math.abs(strand.velocity) < 0.001) {
          strand.offset = 0;
          strand.velocity = 0;
        } else {
          moving = true;
        }
      });
      draw(moving);
      if (moving) frameRef.current = requestAnimationFrame(animate);
      else draw(false);
    }

    function scheduleAnimation() {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(animate);
    }

    function disturb(x, y, force) {
      const originX = width * 0.5;
      const originY = height * 1.06;
      const dx = x - originX;
      const dy = y - originY;
      const radius = Math.max(34, Math.min(width, height) * 0.12);

      strands.forEach((strand) => {
        const unitX = Math.cos(strand.angle);
        const unitY = Math.sin(strand.angle);
        const along = dx * unitX + dy * unitY;
        if (along <= 0) return;
        const across = Math.abs(dx * unitY - dy * unitX);
        const proximity = Math.exp(-((across / radius) ** 2));
        const depth = Math.min(1, along / (Math.hypot(width, height) * strand.length));
        const weight = proximity * depth;
        if (weight < 0.002) return;
        const side = dx * unitY - dy * unitX;
        strand.velocity += (side >= 0 ? 1 : -1) * weight * force;
      });
      scheduleAnimation();
    }

    function pointerPosition(event) {
      const bounds = canvas.getBoundingClientRect();
      return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    }

    function handlePointerDown(event) {
      if (event.button !== undefined && event.button !== 0) return;
      event.preventDefault();
      const point = pointerPosition(event);
      pointerRef.current = { down: true, ...point };
      canvas.setPointerCapture(event.pointerId);
      setIsInteracting(true);
      disturb(point.x, point.y, 0.55);
    }

    function handlePointerMove(event) {
      if (!pointerRef.current.down) return;
      const point = pointerPosition(event);
      const previous = pointerRef.current;
      const movement = Math.min(1.2, Math.hypot(point.x - previous.x, point.y - previous.y) / Math.max(40, Math.min(width, height) * 0.1));
      pointerRef.current = { down: true, ...point };
      disturb(point.x, point.y, 0.18 + movement * 0.35);
    }

    function handlePointerUp() {
      pointerRef.current.down = false;
      setIsInteracting(false);
    }

    function handleKeyDown(event) {
      if (![" ", "Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault();
      const point = pointerRef.current;
      const x = point.x || width * 0.5;
      const y = point.y || height * 0.55;
      disturb(x, y, 0.55);
    }

    drawRef.current = draw;
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);
    canvas.addEventListener("keydown", handleKeyDown);

    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener("change", handleMotionPreference);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerUp);
      canvas.removeEventListener("keydown", handleKeyDown);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      drawRef.current = null;
    };
  }, []);

  function resetStrands() {
    strandsRef.current.forEach((strand) => {
      strand.velocity = 0;
      strand.offset = 0;
    });
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
    drawRef.current?.(false);
    setIsInteracting(false);
  }

  return (
    <div className="mental-break-page py-12 sm:py-16">
      <section aria-labelledby="mental-break-title">
        <header className="mental-break-header">
          <div>
            <p className="mb-2 text-sm font-medium uppercase tracking-[0.16em] text-theme-accent">
              A moment for you
            </p>
            <h1 id="mental-break-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Mental break
            </h1>
            <p className="mt-3 max-w-xl text-theme-muted">
              Take a breath and play with the strands. Press and drag anywhere to make them move.
            </p>
          </div>
        </header>
      </section>
      <section
        ref={strandFullscreen.elementRef}
        className={`strand-fidget-section${strandFullscreen.isFullscreen ? " is-fullscreen" : ""}`}
        aria-labelledby="strand-fidget-title"
      >
        <header className="mental-break-header">
          <h2 id="strand-fidget-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Amoeba strands
          </h2>
          <div className="fidget-controls">
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-theme-border bg-theme-surface px-4 py-2 text-sm"
              onClick={resetStrands}
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              Reset
            </button>
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-theme-border bg-theme-surface px-4 py-2 text-sm"
              onClick={strandFullscreen.toggleFullscreen}
              aria-label={strandFullscreen.isFullscreen ? "Exit fullscreen strands" : "View strands fullscreen"}
            >
              {strandFullscreen.isFullscreen
                ? <Minimize aria-hidden="true" className="size-4" />
                : <Maximize aria-hidden="true" className="size-4" />}
              {strandFullscreen.isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            </button>
          </div>
        </header>
        {strandFullscreen.error && <p className="fullscreen-error" role="alert">{strandFullscreen.error}</p>}
        <div className={`mental-break-canvas mt-6 ${isInteracting ? "is-interacting" : ""}`}>
          <canvas
            ref={canvasRef}
            className="mental-break-strands"
            role="application"
            aria-label="Interactive strand stress reliever. Press or drag to move the strands; use arrow keys or space to make them ripple."
            tabIndex={0}
          />
        </div>
        <p className="mt-4 text-center text-sm text-theme-muted" aria-live="polite">
          {isInteracting ? "Let go whenever you’re ready." : "Press, drag, and watch the motion settle."}
        </p>
      </section>
      <OrbFidget />
    </div>
  );
}
