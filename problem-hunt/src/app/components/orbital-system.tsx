import { useEffect, useRef, useCallback } from "react";

interface OrbitPoint {
  angle: number;
  speed: number;
  size: number;
  color: string;
  glowColor: string;
  trail: { x: number; y: number; alpha: number }[];
  trailLength: number;
}

interface OrbitRing {
  rx: number;
  ry: number;
  rotation: number;
  speed: number;
  points: OrbitPoint[];
  strokeColor: string;
  strokeWidth: number;
  dashArray: number[];
}

const METAL_COLORS = [
  { main: "#c8cdd0", glow: "rgba(200,205,208,0.45)" },   // silver
  { main: "#a0a8ad", glow: "rgba(160,168,173,0.35)" },   // steel
  { main: "#e2e6e9", glow: "rgba(226,230,233,0.55)" },   // chrome
  { main: "#8a9196", glow: "rgba(138,145,150,0.30)" },   // titanium
  { main: "#b8c0c4", glow: "rgba(184,192,196,0.40)" },   // aluminum
  { main: "#d4af37", glow: "rgba(212,175,55,0.25)" },    // gold accent
];

const ORBIT_STROKES = [
  "rgba(160,168,173,0.14)",
  "rgba(138,145,150,0.10)",
  "rgba(200,205,208,0.12)",
  "rgba(184,192,196,0.08)",
];

function createOrbitRing(
  rx: number,
  ry: number,
  rotation: number,
  baseSpeed: number,
  pointCount: number
): OrbitRing {
  const points: OrbitPoint[] = [];
  for (let i = 0; i < pointCount; i++) {
    const colorSet = METAL_COLORS[Math.floor(Math.random() * METAL_COLORS.length)];
    points.push({
      angle: (Math.PI * 2 * i) / pointCount + Math.random() * 0.5,
      speed: baseSpeed * (0.85 + Math.random() * 0.3),
      size: 1.2 + Math.random() * 2.2,
      color: colorSet.main,
      glowColor: colorSet.glow,
      trail: [],
      trailLength: 6 + Math.floor(Math.random() * 8),
    });
  }
  return {
    rx,
    ry,
    rotation,
    speed: baseSpeed,
    points,
    strokeColor: ORBIT_STROKES[Math.floor(Math.random() * ORBIT_STROKES.length)],
    strokeWidth: 0.5 + Math.random() * 0.8,
    dashArray: Math.random() > 0.5 ? [4, 8] : [2, 6],
  };
}

export function OrbitalSystem() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ringsRef = useRef<OrbitRing[]>([]);
  const frameRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const dimsRef = useRef({ width: 0, height: 0, dpr: 1 });

  const initRings = useCallback((width: number, height: number) => {
    const minDim = Math.min(width, height);
    const baseScale = minDim / 900;

    ringsRef.current = [
      createOrbitRing(320 * baseScale, 280 * baseScale, -0.15, 0.0012, 5),
      createOrbitRing(260 * baseScale, 220 * baseScale, 0.25, 0.0018, 4),
      createOrbitRing(200 * baseScale, 170 * baseScale, -0.35, 0.0024, 3),
      createOrbitRing(150 * baseScale, 130 * baseScale, 0.45, 0.0032, 3),
      createOrbitRing(100 * baseScale, 85 * baseScale, -0.55, 0.0042, 2),
      createOrbitRing(70 * baseScale, 60 * baseScale, 0.15, 0.0055, 2),
      createOrbitRing(45 * baseScale, 38 * baseScale, -0.25, 0.007, 1),
    ];
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      dimsRef.current = { width, height, dpr };
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initRings(width, height);
    };

    resize();
    window.addEventListener("resize", resize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true,
      };
    };
    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    let lastTime = performance.now();

    const draw = (time: number) => {
      const dt = Math.min(time - lastTime, 33);
      lastTime = time;
      const { width, height } = dimsRef.current;
      const cx = width / 2;
      const cy = height / 2;

      // Fade trail effect
      ctx.fillStyle = "rgba(10, 12, 18, 0.22)";
      ctx.fillRect(0, 0, width, height);

      // Subtle grid
      ctx.strokeStyle = "rgba(160,168,173,0.03)";
      ctx.lineWidth = 0.5;
      const gridSize = 60;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Central core glow
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120);
      coreGrad.addColorStop(0, "rgba(200,205,208,0.06)");
      coreGrad.addColorStop(0.5, "rgba(160,168,173,0.02)");
      coreGrad.addColorStop(1, "rgba(10,12,18,0)");
      ctx.fillStyle = coreGrad;
      ctx.fillRect(cx - 120, cy - 120, 240, 240);

      // Draw rings and points
      const allPoints: { x: number; y: number; point: OrbitPoint }[] = [];

      ringsRef.current.forEach((ring) => {
        const cosR = Math.cos(ring.rotation);
        const sinR = Math.sin(ring.rotation);

        // Draw orbit path
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ring.rotation);
        ctx.beginPath();
        ctx.ellipse(0, 0, ring.rx, ring.ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = ring.strokeColor;
        ctx.lineWidth = ring.strokeWidth;
        ctx.setLineDash(ring.dashArray);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // Update and draw points
        ring.points.forEach((point) => {
          point.angle += point.speed * dt;
          const px = Math.cos(point.angle) * ring.rx;
          const py = Math.sin(point.angle) * ring.ry;
          const rx = px * cosR - py * sinR + cx;
          const ry = px * sinR + py * cosR + cy;

          // Update trail
          point.trail.push({ x: rx, y: ry, alpha: 1 });
          if (point.trail.length > point.trailLength) {
            point.trail.shift();
          }
          point.trail.forEach((t, i) => {
            t.alpha = i / point.trail.length;
          });

          allPoints.push({ x: rx, y: ry, point });

          // Draw trail
          if (point.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(point.trail[0].x, point.trail[0].y);
            for (let i = 1; i < point.trail.length; i++) {
              ctx.lineTo(point.trail[i].x, point.trail[i].y);
            }
            ctx.strokeStyle = point.glowColor.replace(/[\d.]+\)$/, `${0.15})`);
            ctx.lineWidth = point.size * 0.6;
            ctx.stroke();
          }
        });
      });

      // Draw connections between nearby points (constellation effect)
      for (let i = 0; i < allPoints.length; i++) {
        for (let j = i + 1; j < allPoints.length; j++) {
          const dx = allPoints[i].x - allPoints[j].x;
          const dy = allPoints[i].y - allPoints[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 140;
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.12;
            ctx.beginPath();
            ctx.moveTo(allPoints[i].x, allPoints[i].y);
            ctx.lineTo(allPoints[j].x, allPoints[j].y);
            ctx.strokeStyle = `rgba(184,192,196,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw points with glow
      allPoints.forEach(({ x, y, point }) => {
        // Outer glow
        const glow = ctx.createRadialGradient(x, y, 0, x, y, point.size * 6);
        glow.addColorStop(0, point.glowColor.replace(/[\d.]+\)$/, "0.4)"));
        glow.addColorStop(1, "rgba(10,12,18,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, point.size * 6, 0, Math.PI * 2);
        ctx.fill();

        // Core point
        ctx.fillStyle = point.color;
        ctx.beginPath();
        ctx.arc(x, y, point.size, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.beginPath();
        ctx.arc(x - point.size * 0.3, y - point.size * 0.3, point.size * 0.35, 0, Math.PI * 2);
        ctx.fill();
      });

      // Central hub
      ctx.fillStyle = "rgba(200,205,208,0.15)";
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(200,205,208,0.3)";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Mouse interaction - subtle attraction glow
      if (mouseRef.current.active) {
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;
        const mGlow = ctx.createRadialGradient(mx, my, 0, mx, my, 80);
        mGlow.addColorStop(0, "rgba(200,205,208,0.04)");
        mGlow.addColorStop(1, "rgba(10,12,18,0)");
        ctx.fillStyle = mGlow;
        ctx.beginPath();
        ctx.arc(mx, my, 80, 0, Math.PI * 2);
        ctx.fill();
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [initRings]);

  return (
    <canvas
      ref={canvasRef}
      className="orbital-system"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "auto",
        zIndex: 2,
      }}
    />
  );
}
