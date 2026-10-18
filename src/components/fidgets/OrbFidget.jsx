import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const ORB_COUNT = 12;

export default function OrbFidget() {
  const canvasRef = useRef(null);
  const orbsRef = useRef([]);
  const frameRef = useRef(0);
  const drawRef = useRef(null);
  const pointerRef = useRef({ down: false, x: 0, y: 0 });
  const [isInteracting, setIsInteracting] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      throw new Error("Your browser could not start the orb stress reliever.");
    }

    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let accent = "#6688cc";
    let surface = "#ffffff";
    let muted = "#9aa8bd";
    const orbs = Array.from({ length: ORB_COUNT }, (_, index) => ({
      x: 0,
      y: 0,
      homeX: 0,
      homeY: 0,
      vx: 0,
      vy: 0,
      size: 16 + ((index * 11) % 15),
      phase: index * 1.7,
    }));
    orbsRef.current = orbs;

    function draw() {
      if (!width || !height) return;
      context.clearRect(0, 0, width, height);
      orbs.forEach((orb, index) => {
        const radius = orb.size * Math.min(width / 680, height / 330, 1.25);
        const gradient = context.createRadialGradient(
          orb.x - radius * 0.35,
          orb.y - radius * 0.4,
          radius * 0.08,
          orb.x,
          orb.y,
          radius,
        );
        gradient.addColorStop(0, surface);
        gradient.addColorStop(0.3, accent);
        gradient.addColorStop(1, index % 3 === 0 ? muted : accent);
        context.beginPath();
        context.arc(orb.x, orb.y, radius, 0, Math.PI * 2);
        context.fillStyle = gradient;
        context.globalAlpha = 0.72;
        context.shadowColor = accent;
        context.shadowBlur = radius * 0.55;
        context.fill();
        context.shadowBlur = 0;

        context.beginPath();
        context.arc(orb.x - radius * 0.32, orb.y - radius * 0.35, Math.max(1.5, radius * 0.11), 0, Math.PI * 2);
        context.fillStyle = surface;
        context.globalAlpha = 0.8;
        context.fill();
      });
      context.globalAlpha = 1;
    }

    function resize() {
      const bounds = canvas.getBoundingClientRect();
      const nextWidth = Math.max(1, bounds.width);
      const nextHeight = Math.max(1, bounds.height);
      const scaleX = width ? nextWidth / width : 1;
      const scaleY = height ? nextHeight / height : 1;
      width = nextWidth;
      height = nextHeight;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      const styles = getComputedStyle(canvas);
      accent = styles.getPropertyValue("--accent").trim() || accent;
      surface = styles.getPropertyValue("--surface").trim() || surface;
      muted = styles.getPropertyValue("--muted").trim() || muted;
      orbs.forEach((orb, index) => {
        if (orb.homeX && orb.homeY) {
          orb.x *= scaleX;
          orb.y *= scaleY;
        }
        const columns = width < 480 ? 3 : 4;
        const rows = Math.ceil(ORB_COUNT / columns);
        const column = index % columns;
        const row = Math.floor(index / columns);
        orb.homeX = width * (column + 1) / (columns + 1);
        orb.homeY = height * (row + 1) / (rows + 1);
        if (!orb.x && !orb.y) {
          orb.x = orb.homeX;
          orb.y = orb.homeY;
        }
      });
      draw();
    }

    function animate() {
      frameRef.current = 0;
      let moving = false;
      orbs.forEach((orb) => {
        orb.vx += (orb.homeX - orb.x) * 0.012;
        orb.vy += (orb.homeY - orb.y) * 0.012;
        orb.vx *= 0.91;
        orb.vy *= 0.91;
        orb.x += orb.vx;
        orb.y += orb.vy;
        if (
          Math.abs(orb.homeX - orb.x) < 0.25 &&
          Math.abs(orb.homeY - orb.y) < 0.25 &&
          Math.abs(orb.vx) < 0.08 &&
          Math.abs(orb.vy) < 0.08
        ) {
          orb.x = orb.homeX;
          orb.y = orb.homeY;
          orb.vx = 0;
          orb.vy = 0;
        } else {
          moving = true;
        }
      });
      draw();
      if (moving) frameRef.current = requestAnimationFrame(animate);
      else setIsInteracting(false);
    }

    function scheduleAnimation() {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(animate);
    }

    function pushOrbs(x, y, strength) {
      const radius = Math.max(90, Math.min(width, height) * 0.28);
      orbs.forEach((orb) => {
        const dx = orb.x - x;
        const dy = orb.y - y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        if (distance > radius) return;
        const force = (1 - distance / radius) * strength;
        orb.vx += (dx / distance) * force;
        orb.vy += (dy / distance) * force;
      });
      setIsInteracting(true);
      scheduleAnimation();
    }

    function getPoint(event) {
      const bounds = canvas.getBoundingClientRect();
      return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    }

    function handlePointerDown(event) {
      if (event.button !== undefined && event.button !== 0) return;
      event.preventDefault();
      const point = getPoint(event);
      pointerRef.current = { down: true, ...point };
      canvas.setPointerCapture(event.pointerId);
      pushOrbs(point.x, point.y, 15);
    }

    function handlePointerMove(event) {
      if (!pointerRef.current.down) return;
      const point = getPoint(event);
      const previous = pointerRef.current;
      const strength = Math.min(18, Math.hypot(point.x - previous.x, point.y - previous.y) * 0.55);
      pointerRef.current = { down: true, ...point };
      if (strength > 0) pushOrbs(point.x, point.y, strength);
    }

    function handlePointerUp() {
      pointerRef.current.down = false;
    }

    function handleKeyDown(event) {
      if (![" ", "Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault();
      pushOrbs(width * 0.5, height * 0.5, 15);
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
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerUp);
      canvas.removeEventListener("keydown", handleKeyDown);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      drawRef.current = null;
    };
  }, []);

  function resetOrbs() {
    orbsRef.current.forEach((orb) => {
      orb.x = orb.homeX;
      orb.y = orb.homeY;
      orb.vx = 0;
      orb.vy = 0;
    });
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
    drawRef.current?.();
    setIsInteracting(false);
  }

  return (
    <section className="orb-fidget-section mt-16 sm:mt-20" aria-labelledby="orb-fidget-title">
      <header className="orb-fidget-header">
        <div>
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.16em] text-theme-accent">
            A little motion
          </p>
          <h2 id="orb-fidget-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Floating orbs
          </h2>
          <p className="mt-3 max-w-xl text-theme-muted">
            Tap or sweep through the orbs and watch them scatter, then settle back into place.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-theme-border bg-theme-surface px-4 py-2 text-sm"
          onClick={resetOrbs}
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Reset
        </button>
      </header>
      <div className={`orb-fidget-canvas mt-6 ${isInteracting ? "is-interacting" : ""}`}>
        <canvas
          ref={canvasRef}
          className="orb-fidget-orbs"
          role="application"
          aria-label="Interactive floating orb fidget. Tap or drag to push the orbs around, or use arrow keys or space."
          tabIndex={0}
        />
      </div>
      <p className="mt-4 text-center text-sm text-theme-muted" aria-live="polite">
        {isInteracting ? "Let the orbs find their way back." : "Tap, drag, or press a key to play."}
      </p>
    </section>
  );
}
