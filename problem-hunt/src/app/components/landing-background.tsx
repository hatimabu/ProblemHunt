import { useEffect, useRef } from "react";

/* ================================================================
   ProblemHunt — Deep Space Nebula Background
   ================================================================
   A multi-layer Canvas 2D procedural background:
   1. Nebula fog      (simplex-noise clouds in brand colours)
   2. Starfield       (twinkling stars + diffraction spikes)
   3. Constellations  (faint connections with traveling pulses)
   4. Shooting stars  (occasional streaks)
   5. Mouse aura      (subtle reactive glow)
   6. Vignette        (dark edge falloff for focus)
   ================================================================ */

/* ------------------------------------------------------------------
   Mini simplex noise (2D) — adapted from standard implementation
   ------------------------------------------------------------------ */
const SIMPLEX_PERM = new Uint8Array(512);
const SIMPLEX_GRAD = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [1, 0], [-1, 0],
  [0, 1], [0, -1], [0, 1], [0, -1],
] as const;

(function initPerm() {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) SIMPLEX_PERM[i] = p[i & 255];
})();

function simplexNoise2D(xin: number, yin: number): number {
  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;
  const s = (xin + yin) * F2;
  const i = Math.floor(xin + s);
  const j = Math.floor(yin + s);
  const t = (i + j) * G2;
  const X0 = i - t;
  const Y0 = j - t;
  const x0 = xin - X0;
  const y0 = yin - Y0;
  let i1: number, j1: number;
  if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
  const x1 = x0 - i1 + G2;
  const y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2;
  const y2 = y0 - 1 + 2 * G2;
  const ii = i & 255;
  const jj = j & 255;
  let n0 = 0, n1 = 0, n2 = 0;
  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 >= 0) {
    t0 *= t0;
    const g = SIMPLEX_GRAD[SIMPLEX_PERM[ii + SIMPLEX_PERM[jj]] % 12];
    n0 = t0 * t0 * (g[0] * x0 + g[1] * y0);
  }
  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 >= 0) {
    t1 *= t1;
    const g = SIMPLEX_GRAD[SIMPLEX_PERM[ii + i1 + SIMPLEX_PERM[jj + j1]] % 12];
    n1 = t1 * t1 * (g[0] * x1 + g[1] * y1);
  }
  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 >= 0) {
    t2 *= t2;
    const g = SIMPLEX_GRAD[SIMPLEX_PERM[ii + 1 + SIMPLEX_PERM[jj + 1]] % 12];
    n2 = t2 * t2 * (g[0] * x2 + g[1] * y2);
  }
  return 70 * (n0 + n1 + n2);
}

function fbm(x: number, y: number, octaves = 4): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  let max = 0;
  for (let i = 0; i < octaves; i++) {
    value += amp * simplexNoise2D(x * freq, y * freq);
    max += amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return value / max;
}

/* ------------------------------------------------------------------
   Colour helpers
   ------------------------------------------------------------------ */
const PALETTE = {
  bg: "#070a0f",
  gold: { r: 201, g: 168, b: 76 },
  rust: { r: 201, g: 84, b: 94 },
  steel: { r: 160, g: 168, b: 173 },
  chrome: { r: 226, g: 230, b: 233 },
  deepBlue: { r: 26, g: 30, b: 40 },
};

function rgba(c: { r: number; g: number; b: number }, a: number): string {
  return `rgba(${c.r},${c.g},${c.b},${a})`;
}

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */
interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  hasSpikes: boolean;
  spikeAngle: number;
  color: { r: number; g: number; b: number };
}

interface Connection {
  a: number; // star index
  b: number; // star index
  alpha: number;
  pulseOffset: number;
}

interface Pulse {
  connectionIndex: number;
  progress: number;
  speed: number;
  size: number;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  life: number;
  maxLife: number;
  active: boolean;
}

interface NebulaBlob {
  x: number;
  y: number;
  rx: number;
  ry: number;
  color: { r: number; g: number; b: number };
  alpha: number;
  driftX: number;
  driftY: number;
  phase: number;
  speed: number;
}

interface Scene {
  stars: Star[];
  connections: Connection[];
  pulses: Pulse[];
  shootingStars: ShootingStar[];
  nebulaBlobs: NebulaBlob[];
}

/* ------------------------------------------------------------------
   Scene builder
   ------------------------------------------------------------------ */
function buildScene(width: number, height: number): Scene {
  const count = Math.min(350, Math.max(120, Math.floor((width * height) / 4500)));
  const stars: Star[] = [];

  for (let i = 0; i < count; i++) {
    const isGold = Math.random() < 0.06;
    const isRust = !isGold && Math.random() < 0.04;
    const color = isGold ? PALETTE.gold : isRust ? PALETTE.rust : PALETTE.chrome;
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() < 0.92 ? 0.4 + Math.random() * 1.2 : 1.6 + Math.random() * 1.4,
      baseAlpha: 0.15 + Math.random() * 0.55,
      twinkleSpeed: 0.0008 + Math.random() * 0.0025,
      twinklePhase: Math.random() * Math.PI * 2,
      hasSpikes: Math.random() < 0.08,
      spikeAngle: Math.random() * Math.PI,
      color,
    });
  }

  // Build constellation connections between nearby stars
  const connections: Connection[] = [];
  const maxDist = Math.min(width, height) * 0.14;
  for (let i = 0; i < stars.length; i++) {
    for (let j = i + 1; j < stars.length; j++) {
      const dx = stars[i].x - stars[j].x;
      const dy = stars[i].y - stars[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < maxDist && Math.random() < 0.35) {
        connections.push({
          a: i,
          b: j,
          alpha: (1 - dist / maxDist) * 0.08,
          pulseOffset: Math.random() * Math.PI * 2,
        });
      }
    }
  }

  // Pre-seed a few pulses
  const pulses: Pulse[] = [];
  for (let i = 0; i < connections.length; i++) {
    if (Math.random() < 0.15) {
      pulses.push({
        connectionIndex: i,
        progress: Math.random(),
        speed: 0.0002 + Math.random() * 0.0004,
        size: 1 + Math.random() * 1.5,
      });
    }
  }

  // Shooting-star pool
  const shootingStars: ShootingStar[] = Array.from({ length: 3 }, () => ({
    x: 0, y: 0, vx: 0, vy: 0, length: 0, life: 0, maxLife: 1, active: false,
  }));

  // Nebula blobs — large, soft, slow-drifting colour washes
  const nebulaBlobs: NebulaBlob[] = [
    {
      x: width * 0.25, y: height * 0.3,
      rx: width * 0.35, ry: height * 0.25,
      color: PALETTE.gold, alpha: 0.035,
      driftX: 0.00008, driftY: 0.00005, phase: 0, speed: 0.0003,
    },
    {
      x: width * 0.75, y: height * 0.6,
      rx: width * 0.3, ry: height * 0.22,
      color: PALETTE.rust, alpha: 0.03,
      driftX: -0.00006, driftY: 0.00007, phase: Math.PI * 0.7, speed: 0.00025,
    },
    {
      x: width * 0.5, y: height * 0.15,
      rx: width * 0.4, ry: height * 0.18,
      color: PALETTE.deepBlue, alpha: 0.045,
      driftX: 0.00004, driftY: -0.00003, phase: Math.PI * 1.3, speed: 0.0002,
    },
    {
      x: width * 0.15, y: height * 0.75,
      rx: width * 0.25, ry: height * 0.2,
      color: PALETTE.steel, alpha: 0.025,
      driftX: 0.00005, driftY: 0.00004, phase: Math.PI * 2.1, speed: 0.00035,
    },
  ];

  return { stars, connections, pulses, shootingStars, nebulaBlobs };
}

/* ------------------------------------------------------------------
   Component
   ------------------------------------------------------------------ */
export function LandingBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const motionFactor = prefersReducedMotion ? 0 : 1;

    let scene: Scene | null = null;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let frameId = 0;
    let lastTime = performance.now();
    let elapsed = 0;

    const mouse = { x: -1000, y: -1000, active: false };

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = parent.clientWidth;
      height = parent.scrollHeight || parent.clientHeight || window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scene = buildScene(width, height);
    };

    resize();

    const ro = new ResizeObserver(() => resize());
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    window.addEventListener("resize", resize);

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };
    const onMouseLeave = () => {
      mouse.active = false;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);

    /* ---- Drawing helpers ---- */
    function drawNebula(time: number) {
      if (!scene) return;
      for (const blob of scene.nebulaBlobs) {
        blob.phase += blob.speed * motionFactor;
        const ox = Math.sin(blob.phase) * width * 0.04;
        const oy = Math.cos(blob.phase * 0.7) * height * 0.03;
        const cx = blob.x + ox;
        const cy = blob.y + oy;

        // Use noise to distort the ellipse shape
        const steps = 24;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const angle = (i / steps) * Math.PI * 2;
          const n = fbm(
            Math.cos(angle) * 1.5 + blob.phase * 0.2,
            Math.sin(angle) * 1.5 + blob.phase * 0.15,
            3
          );
          const rScale = 1 + n * 0.35;
          const px = cx + Math.cos(angle) * blob.rx * rScale;
          const py = cy + Math.sin(angle) * blob.ry * rScale;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(blob.rx, blob.ry));
        grad.addColorStop(0, rgba(blob.color, blob.alpha * 1.5));
        grad.addColorStop(0.5, rgba(blob.color, blob.alpha * 0.6));
        grad.addColorStop(1, rgba(blob.color, 0));
        ctx.fillStyle = grad;
        ctx.fill();
      }
    }

    function drawStarField(time: number) {
      if (!scene) return;
      for (const star of scene.stars) {
        const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase);
        const alpha = star.baseAlpha + twinkle * 0.08 * motionFactor;
        const finalAlpha = Math.max(0, Math.min(1, alpha));

        // Mouse proximity boost
        let mouseBoost = 0;
        if (mouse.active) {
          const mdx = mouse.x - star.x;
          const mdy = mouse.y - star.y;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mdist < 180) mouseBoost = (1 - mdist / 180) * 0.25;
        }

        const drawAlpha = Math.min(1, finalAlpha + mouseBoost);
        if (drawAlpha < 0.01) continue;

        // Glow
        if (star.size > 1.2 || mouseBoost > 0.05) {
          const glowR = star.size * 5;
          const glow = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, glowR);
          glow.addColorStop(0, rgba(star.color, drawAlpha * 0.35));
          glow.addColorStop(1, rgba(star.color, 0));
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(star.x, star.y, glowR, 0, Math.PI * 2);
          ctx.fill();
        }

        // Core
        ctx.fillStyle = rgba(star.color, drawAlpha);
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Diffraction spikes on bright stars
        if (star.hasSpikes && motionFactor > 0) {
          const spikeLen = star.size * 8 * (0.8 + twinkle * 0.2);
          const sa = star.spikeAngle + time * 0.00005;
          ctx.strokeStyle = rgba(star.color, drawAlpha * 0.18);
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(star.x - Math.cos(sa) * spikeLen, star.y - Math.sin(sa) * spikeLen);
          ctx.lineTo(star.x + Math.cos(sa) * spikeLen, star.y + Math.sin(sa) * spikeLen);
          ctx.moveTo(star.x - Math.cos(sa + Math.PI / 2) * spikeLen, star.y - Math.sin(sa + Math.PI / 2) * spikeLen);
          ctx.lineTo(star.x + Math.cos(sa + Math.PI / 2) * spikeLen, star.y + Math.sin(sa + Math.PI / 2) * spikeLen);
          ctx.stroke();
        }
      }
    }

    function drawConstellations(time: number) {
      if (!scene) return;
      const { stars, connections, pulses } = scene;

      // Static faint lines
      for (const conn of connections) {
        const a = stars[conn.a];
        const b = stars[conn.b];
        if (!a || !b) continue;
        const pulse = Math.sin(time * 0.0004 + conn.pulseOffset) * 0.5 + 0.5;
        const lineAlpha = conn.alpha * (0.6 + pulse * 0.4) * motionFactor;
        if (lineAlpha < 0.005) continue;

        ctx.strokeStyle = rgba(PALETTE.steel, lineAlpha);
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      // Traveling pulses (data packets)
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.progress += p.speed * motionFactor;
        if (p.progress >= 1) {
          // Respawn on a different random connection
          p.connectionIndex = Math.floor(Math.random() * connections.length);
          p.progress = 0;
          p.speed = 0.0002 + Math.random() * 0.0004;
          continue;
        }
        const conn = connections[p.connectionIndex];
        if (!conn) continue;
        const a = stars[conn.a];
        const b = stars[conn.b];
        if (!a || !b) continue;

        const px = a.x + (b.x - a.x) * p.progress;
        const py = a.y + (b.y - a.y) * p.progress;

        // Glow
        const glow = ctx.createRadialGradient(px, py, 0, px, py, p.size * 6);
        glow.addColorStop(0, rgba(PALETTE.gold, 0.35));
        glow.addColorStop(1, rgba(PALETTE.gold, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(px, py, p.size * 6, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = rgba(PALETTE.chrome, 0.9);
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function updateAndDrawShootingStars(dt: number) {
      if (!scene || motionFactor === 0) return;
      const { shootingStars } = scene;

      // Spawn chance
      if (Math.random() < 0.0008 * dt) {
        const free = shootingStars.find((s) => !s.active);
        if (free) {
          const side = Math.floor(Math.random() * 4); // 0=top,1=right,2=bottom,3=left
          const angle = Math.random() * Math.PI * 0.4 + Math.PI * 0.3; // generally diagonal down-right
          const speed = 0.3 + Math.random() * 0.35;
          if (side === 0) {
            free.x = Math.random() * width;
            free.y = -20;
          } else if (side === 1) {
            free.x = width + 20;
            free.y = Math.random() * height * 0.5;
          } else {
            free.x = Math.random() * width * 0.5;
            free.y = -20;
          }
          free.vx = Math.cos(angle) * speed;
          free.vy = Math.sin(angle) * speed;
          free.length = 40 + Math.random() * 80;
          free.life = 1;
          free.maxLife = 1;
          free.active = true;
        }
      }

      for (const s of shootingStars) {
        if (!s.active) continue;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= 0.0006 * dt;
        if (s.life <= 0 || s.x > width + 100 || s.y > height + 100) {
          s.active = false;
          continue;
        }
        const lifeRatio = s.life / s.maxLife;
        const tailX = s.x - s.vx * (s.length / Math.sqrt(s.vx * s.vx + s.vy * s.vy));
        const tailY = s.y - s.vy * (s.length / Math.sqrt(s.vx * s.vx + s.vy * s.vy));

        const grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
        grad.addColorStop(0, rgba(PALETTE.chrome, lifeRatio * 0.9));
        grad.addColorStop(0.4, rgba(PALETTE.gold, lifeRatio * 0.5));
        grad.addColorStop(1, rgba(PALETTE.gold, 0));

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        // Head spark
        ctx.fillStyle = rgba(PALETTE.chrome, lifeRatio);
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawVignette() {
      const grad = ctx.createRadialGradient(
        width * 0.5, height * 0.4, Math.min(width, height) * 0.25,
        width * 0.5, height * 0.4, Math.max(width, height) * 0.85
      );
      grad.addColorStop(0, "rgba(7,10,15,0)");
      grad.addColorStop(0.5, "rgba(7,10,15,0.25)");
      grad.addColorStop(1, "rgba(7,10,15,0.72)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    function drawMouseAura() {
      if (!mouse.active) return;
      const r = 120;
      const grad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, r);
      grad.addColorStop(0, "rgba(200,205,208,0.025)");
      grad.addColorStop(1, "rgba(200,205,208,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawScanlines() {
      ctx.fillStyle = "rgba(7,10,15,0.015)";
      const lineH = 4;
      for (let y = 0; y < height; y += lineH * 2) {
        ctx.fillRect(0, y, width, lineH);
      }
    }

    /* ---- Main loop ---- */
    const draw = (time: number) => {
      const dt = Math.min(time - lastTime, 33);
      lastTime = time;
      elapsed = time;

      ctx.clearRect(0, 0, width, height);

      // Background fill (ensures no bleed-through)
      ctx.fillStyle = PALETTE.bg;
      ctx.fillRect(0, 0, width, height);

      drawNebula(elapsed);
      drawStarField(elapsed);
      drawConstellations(elapsed);
      updateAndDrawShootingStars(dt);
      drawMouseAura();
      drawVignette();
      drawScanlines();

      frameId = requestAnimationFrame(draw);
    };

    frameId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 1,
      }}
    />
  );
}
