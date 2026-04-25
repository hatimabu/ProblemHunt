import { useEffect, useRef, useCallback } from "react";

interface StoryNode {
  x: number;
  y: number;
  label: string;
  color: string;
  glowColor: string;
  radius: number;
  lit: number;
  litTarget: number;
  pulsePhase: number;
}

interface PulseRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

interface YellowHub {
  x: number;
  y: number;
  radius: number;
  color: string;
  glowColor: string;
  orbiters: Orbiter[];
  pulsePhase: number;
}

interface Orbiter {
  angle: number;
  speed: number;
  distance: number;
  size: number;
  color: string;
  trail: { x: number; y: number }[];
}

interface Traveler {
  progress: number;
  speed: number;
  size: number;
  color: string;
  glowColor: string;
  fromNode: number;
  toNode: number;
  active: boolean;
  trail: { x: number; y: number; alpha: number }[];
  trailLength: number;
  delay: number;
}

const METAL = {
  silver: { main: "#c8cdd0", glow: "rgba(200,205,208,0.5)" },
  steel: { main: "#a0a8ad", glow: "rgba(160,168,173,0.4)" },
  chrome: { main: "#e2e6e9", glow: "rgba(226,230,233,0.6)" },
  gold: { main: "#d4af37", glow: "rgba(212,175,55,0.45)" },
  goldBright: { main: "#e8c547", glow: "rgba(232,197,71,0.6)" },
};

function createOrbiters(count: number, distances: number[], speeds: number[]): Orbiter[] {
  const colors = [METAL.chrome, METAL.silver, METAL.goldBright, METAL.steel];
  return Array.from({ length: count }, (_, i) => ({
    angle: (Math.PI * 2 * i) / count + Math.random() * 0.5,
    speed: speeds[i % speeds.length] * (0.8 + Math.random() * 0.4),
    distance: distances[i % distances.length],
    size: 1.2 + Math.random() * 1.8,
    color: colors[i % colors.length].main,
    trail: [],
  }));
}

function buildScene(width: number, height: number) {
  const storyNodes: StoryNode[] = [
    {
      x: width * 0.14,
      y: height * 0.07,
      label: "SYSTEM OPERATIONAL",
      color: METAL.chrome.main,
      glowColor: METAL.chrome.glow,
      radius: 5,
      lit: 1,
      litTarget: 1,
      pulsePhase: 0,
    },
    {
      x: width * 0.76,
      y: height * 0.18,
      label: "telemetry active",
      color: METAL.steel.main,
      glowColor: METAL.steel.glow,
      radius: 4,
      lit: 0,
      litTarget: 0,
      pulsePhase: Math.random() * Math.PI * 2,
    },
    {
      x: width * 0.82,
      y: height * 0.28,
      label: "Mission Control",
      color: METAL.silver.main,
      glowColor: METAL.silver.glow,
      radius: 4.5,
      lit: 0,
      litTarget: 0,
      pulsePhase: Math.random() * Math.PI * 2,
    },
    {
      x: width * 0.74,
      y: height * 0.61,
      label: "How It Moves",
      color: METAL.silver.main,
      glowColor: METAL.silver.glow,
      radius: 4,
      lit: 0,
      litTarget: 0,
      pulsePhase: Math.random() * Math.PI * 2,
    },
    {
      x: width * 0.2,
      y: height * 0.75,
      label: "Live Signal",
      color: METAL.steel.main,
      glowColor: METAL.steel.glow,
      radius: 4,
      lit: 0,
      litTarget: 0,
      pulsePhase: Math.random() * Math.PI * 2,
    },
    {
      x: width * 0.55,
      y: height * 0.89,
      label: "Ready",
      color: METAL.chrome.main,
      glowColor: METAL.chrome.glow,
      radius: 5,
      lit: 0,
      litTarget: 0,
      pulsePhase: Math.random() * Math.PI * 2,
    },
  ];

  const hubs: YellowHub[] = [
    {
      x: width * 0.55,
      y: height * 0.13,
      radius: 10,
      color: METAL.gold.main,
      glowColor: METAL.gold.glow,
      orbiters: createOrbiters(4, [28, 36, 44, 52], [0.0015, 0.002, 0.0012, 0.0025]),
      pulsePhase: 0,
    },
    {
      x: width * 0.28,
      y: height * 0.31,
      radius: 8,
      color: METAL.goldBright.main,
      glowColor: METAL.goldBright.glow,
      orbiters: createOrbiters(3, [22, 30, 38], [0.002, 0.0015, 0.0028]),
      pulsePhase: Math.random() * Math.PI * 2,
    },
    {
      x: width * 0.7,
      y: height * 0.43,
      radius: 9,
      color: METAL.gold.main,
      glowColor: METAL.gold.glow,
      orbiters: createOrbiters(5, [26, 34, 42, 50, 58], [0.0018, 0.0022, 0.0014, 0.0026, 0.0016]),
      pulsePhase: Math.random() * Math.PI * 2,
    },
    {
      x: width * 0.35,
      y: height * 0.57,
      radius: 7,
      color: METAL.goldBright.main,
      glowColor: METAL.goldBright.glow,
      orbiters: createOrbiters(3, [20, 28, 36], [0.0022, 0.0018, 0.0025]),
      pulsePhase: Math.random() * Math.PI * 2,
    },
    {
      x: width * 0.65,
      y: height * 0.73,
      radius: 8,
      color: METAL.gold.main,
      glowColor: METAL.gold.glow,
      orbiters: createOrbiters(4, [24, 32, 40, 48], [0.0016, 0.002, 0.0014, 0.0024]),
      pulsePhase: Math.random() * Math.PI * 2,
    },
    {
      x: width * 0.4,
      y: height * 0.85,
      radius: 7,
      color: METAL.goldBright.main,
      glowColor: METAL.goldBright.glow,
      orbiters: createOrbiters(3, [20, 28, 34], [0.002, 0.0016, 0.0028]),
      pulsePhase: Math.random() * Math.PI * 2,
    },
  ];

  const routes: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5],
    [1, 3], [2, 4], [0, 2], [3, 5],
  ];

  const travelers: Traveler[] = [];
  routes.forEach(([from, to], ri) => {
    const count = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      travelers.push({
        progress: Math.random(),
        speed: 0.00025 + Math.random() * 0.00035,
        size: 1.2 + Math.random() * 1.5,
        color: METAL.chrome.main,
        glowColor: METAL.chrome.glow,
        fromNode: from,
        toNode: to,
        active: true,
        trail: [],
        trailLength: 8 + Math.floor(Math.random() * 6),
        delay: ri * 900 + i * 500 + Math.random() * 700,
      });
    }
  });

  // Gold spawn travelers from System Operational
  for (let i = 0; i < 4; i++) {
    travelers.push({
      progress: 0,
      speed: 0.00035 + Math.random() * 0.00025,
      size: 1.5 + Math.random(),
      color: METAL.goldBright.main,
      glowColor: METAL.goldBright.glow,
      fromNode: 0,
      toNode: [1, 2, 3, 4][i],
      active: true,
      trail: [],
      trailLength: 10 + Math.floor(Math.random() * 6),
      delay: 1500 + i * 1000,
    });
  }

  const pulseRings: PulseRing[] = [];

  return { storyNodes, hubs, travelers, pulseRings };
}

function bezierPoint(
  t: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number }
) {
  const u = 1 - t;
  const u2 = u * u;
  const t2 = t * t;
  return {
    x: u2 * u * p0.x + 3 * u2 * t * p1.x + 3 * u * t2 * p2.x + t2 * t * p3.x,
    y: u2 * u * p0.y + 3 * u2 * t * p1.y + 3 * u * t2 * p2.y + t2 * t * p3.y,
  };
}

export function LandingBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<ReturnType<typeof buildScene> | null>(null);
  const frameRef = useRef<number>(0);
  const dimsRef = useRef({ width: 0, height: 0, dpr: 1 });
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const startTimeRef = useRef<number>(0);

  const initScene = useCallback((width: number, height: number) => {
    sceneRef.current = buildScene(width, height);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    startTimeRef.current = performance.now();

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = parent.clientWidth;
      const height = parent.scrollHeight;
      dimsRef.current = { width, height, dpr };
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initScene(width, height);
    };

    resize();
    window.addEventListener("resize", resize);

    const ro = new ResizeObserver(() => resize());
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, active: true };
    };
    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    let lastTime = performance.now();

    const draw = (time: number) => {
      const dt = Math.min(time - lastTime, 33);
      lastTime = time;
      const elapsed = time - startTimeRef.current;
      const { width, height } = dimsRef.current;
      const scene = sceneRef.current;
      if (!scene) return;

      ctx.clearRect(0, 0, width, height);
      const { storyNodes, hubs, travelers, pulseRings } = scene;
      const HIDDEN_NODE = 4; // Live Signal node and its travelers hidden

      // ---- Spawn pulse rings from nodes periodically ----
      storyNodes.forEach((node, i) => {
        if (i === HIDDEN_NODE) return;
        const interval = 4000 + i * 800;
        const offset = i * 1200;
        if (elapsed > offset && Math.floor((elapsed - offset) / interval) > Math.floor((elapsed - offset - dt) / interval)) {
          pulseRings.push({
            x: node.x,
            y: node.y,
            radius: node.radius * 2,
            maxRadius: node.radius * 14,
            alpha: 0.35 + node.lit * 0.25,
            color: i === 0 || node.lit > 0.5 ? METAL.goldBright.main : node.color,
          });
        }
      });

      // ---- Update and draw pulse rings ----
      for (let i = pulseRings.length - 1; i >= 0; i--) {
        const ring = pulseRings[i];
        ring.radius += 0.08 * dt;
        ring.alpha -= 0.00025 * dt;
        if (ring.alpha <= 0 || ring.radius >= ring.maxRadius) {
          pulseRings.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx.strokeStyle = ring.color.replace("#", "").match(/^[0-9a-f]{6}$/i)
          ? `rgba(${parseInt(ring.color.slice(1, 3), 16)},${parseInt(ring.color.slice(3, 5), 16)},${parseInt(ring.color.slice(5, 7), 16)},${ring.alpha})`
          : `rgba(200,205,208,${ring.alpha})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // ---- Connection lines between nearby story nodes ----
      for (let i = 0; i < storyNodes.length; i++) {
        if (i === HIDDEN_NODE) continue;
        for (let j = i + 1; j < storyNodes.length; j++) {
          if (j === HIDDEN_NODE) continue;
          const a = storyNodes[i];
          const b = storyNodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = Math.min(width, height) * 0.45;
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.06 * (0.5 + (a.lit + b.lit) * 0.25);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(200,205,208,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.setLineDash([4, 8]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }

      // ---- Connections from hubs to nearby story nodes ----
      hubs.forEach((hub) => {
        storyNodes.forEach((node, ni) => {
          if (ni === HIDDEN_NODE) return;
          const dx = hub.x - node.x;
          const dy = hub.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = Math.min(width, height) * 0.35;
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.05 * (1 + node.lit * 0.5);
            ctx.beginPath();
            ctx.moveTo(hub.x, hub.y);
            ctx.lineTo(node.x, node.y);
            ctx.strokeStyle = `rgba(212,175,55,${alpha})`;
            ctx.lineWidth = 0.4;
            ctx.setLineDash([2, 6]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        });
      });

      // ---- Update and draw travelers ----
      travelers.forEach((traveler) => {
        if (!traveler.active || elapsed < traveler.delay) return;
        if (traveler.fromNode === HIDDEN_NODE || traveler.toNode === HIDDEN_NODE) return;

        const from = storyNodes[traveler.fromNode];
        const to = storyNodes[traveler.toNode];

        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const perpX = -dy * 0.28;
        const perpY = dx * 0.28;

        const cp1 = { x: from.x + (midX - from.x) * 0.5 + perpX, y: from.y + (midY - from.y) * 0.5 + perpY };
        const cp2 = { x: to.x - (to.x - midX) * 0.5 + perpX, y: to.y - (to.y - midY) * 0.5 + perpY };

        const prevProgress = traveler.progress;
        traveler.progress += traveler.speed * dt;

        if (traveler.progress > 0.88 && prevProgress <= 0.88) {
          to.litTarget = 1;
          // Spawn a pulse ring when arriving
          pulseRings.push({
            x: to.x,
            y: to.y,
            radius: to.radius * 2,
            maxRadius: to.radius * 12,
            alpha: 0.4,
            color: traveler.color,
          });
        }

        if (traveler.progress >= 1) {
          traveler.progress = 0;
          const possibleDests = travelers
            .filter((t) => t.fromNode === traveler.toNode && t.toNode !== traveler.fromNode)
            .map((t) => t.toNode);
          if (possibleDests.length > 0) {
            traveler.fromNode = traveler.toNode;
            traveler.toNode = possibleDests[Math.floor(Math.random() * possibleDests.length)];
          } else {
            const tmp = traveler.fromNode;
            traveler.fromNode = traveler.toNode;
            traveler.toNode = tmp;
          }
        }

        const pos = bezierPoint(traveler.progress, from, cp1, cp2, to);

        traveler.trail.push({ x: pos.x, y: pos.y, alpha: 1 });
        if (traveler.trail.length > traveler.trailLength) traveler.trail.shift();
        traveler.trail.forEach((t, i) => { t.alpha = i / traveler.trail.length; });

        if (traveler.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(traveler.trail[0].x, traveler.trail[0].y);
          for (let i = 1; i < traveler.trail.length; i++) ctx.lineTo(traveler.trail[i].x, traveler.trail[i].y);
          const trailAlpha = 0.14 + traveler.progress * 0.18;
          ctx.strokeStyle = traveler.glowColor.replace(/[\d.]+\)$/, `${trailAlpha})`);
          ctx.lineWidth = traveler.size * 0.5;
          ctx.stroke();
        }

        // Glow
        const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, traveler.size * 6);
        glow.addColorStop(0, traveler.glowColor.replace(/[\d.]+\)$/, "0.5)"));
        glow.addColorStop(1, "rgba(10,12,18,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, traveler.size * 6, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = traveler.color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, traveler.size, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath();
        ctx.arc(pos.x - traveler.size * 0.25, pos.y - traveler.size * 0.25, traveler.size * 0.35, 0, Math.PI * 2);
        ctx.fill();
      });

      // ---- Yellow hubs with orbiters ----
      hubs.forEach((hub) => {
        hub.pulsePhase += 0.0015 * dt;
        const pulse = 1 + Math.sin(hub.pulsePhase) * 0.08;

        // Outer glow
        const hubGlow = ctx.createRadialGradient(hub.x, hub.y, 0, hub.x, hub.y, hub.radius * 6 * pulse);
        hubGlow.addColorStop(0, hub.glowColor.replace(/[\d.]+\)$/, `${0.3 * pulse})`));
        hubGlow.addColorStop(1, "rgba(10,12,18,0)");
        ctx.fillStyle = hubGlow;
        ctx.beginPath();
        ctx.arc(hub.x, hub.y, hub.radius * 6 * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Dashed orbit ring
        ctx.beginPath();
        ctx.arc(hub.x, hub.y, hub.radius * 2 * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(212,175,55,${0.18 * pulse})`;
        ctx.lineWidth = 0.8;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Core
        ctx.fillStyle = hub.color;
        ctx.beginPath();
        ctx.arc(hub.x, hub.y, hub.radius * 0.65 * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Inner bright spot
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.beginPath();
        ctx.arc(hub.x - hub.radius * 0.2, hub.y - hub.radius * 0.2, hub.radius * 0.25 * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Orbiters
        hub.orbiters.forEach((orbiter) => {
          orbiter.angle += orbiter.speed * dt;
          const ox = hub.x + Math.cos(orbiter.angle) * orbiter.distance * pulse;
          const oy = hub.y + Math.sin(orbiter.angle) * orbiter.distance * pulse;
          const isGold = orbiter.color === METAL.goldBright.main || orbiter.color === METAL.gold.main;

          orbiter.trail.push({ x: ox, y: oy });
          if (orbiter.trail.length > 5) orbiter.trail.shift();

          if (orbiter.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(orbiter.trail[0].x, orbiter.trail[0].y);
            for (let i = 1; i < orbiter.trail.length; i++) ctx.lineTo(orbiter.trail[i].x, orbiter.trail[i].y);
            ctx.strokeStyle = isGold ? `rgba(232,197,71,0.12)` : `rgba(200,205,208,0.1)`;
            ctx.lineWidth = orbiter.size * 0.4;
            ctx.stroke();
          }

          const oGlow = ctx.createRadialGradient(ox, oy, 0, ox, oy, orbiter.size * 4);
          oGlow.addColorStop(0, isGold ? "rgba(232,197,71,0.3)" : "rgba(200,205,208,0.25)");
          oGlow.addColorStop(1, "rgba(10,12,18,0)");
          ctx.fillStyle = oGlow;
          ctx.beginPath();
          ctx.arc(ox, oy, orbiter.size * 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = orbiter.color;
          ctx.beginPath();
          ctx.arc(ox, oy, orbiter.size, 0, Math.PI * 2);
          ctx.fill();
        });
      });

      // ---- Story nodes ----
      storyNodes.forEach((node, ni) => {
        if (ni === HIDDEN_NODE) return;
        node.pulsePhase += 0.0015 * dt;
        node.lit += (node.litTarget - node.lit) * 0.025 * dt;
        if (node.litTarget > 0 && Math.abs(node.litTarget - node.lit) < 0.02) {
          node.litTarget = Math.max(0, node.litTarget - 0.0004 * dt);
        }

        const litPulse = 1 + Math.sin(node.pulsePhase) * 0.1 + node.lit * 0.45;
        const glowRadius = node.radius * 10 * litPulse;

        const nodeGlow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowRadius);
        const glowAlpha = 0.15 + node.lit * 0.4;
        nodeGlow.addColorStop(0, node.glowColor.replace(/[\d.]+\)$/, `${glowAlpha})`));
        nodeGlow.addColorStop(1, "rgba(10,12,18,0)");
        ctx.fillStyle = nodeGlow;
        ctx.beginPath();
        ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 2.5 * litPulse, 0, Math.PI * 2);
        ctx.strokeStyle = ni === 0 || node.lit > 0.4
          ? `rgba(226,230,233,${0.14 + node.lit * 0.22})`
          : `rgba(160,168,173,${0.1 + node.lit * 0.15})`;
        ctx.lineWidth = 0.6;
        ctx.setLineDash([3, 5]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Core
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * litPulse, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.fillStyle = `rgba(255,255,255,${0.55 + node.lit * 0.35})`;
        ctx.beginPath();
        ctx.arc(node.x - node.radius * 0.3 * litPulse, node.y - node.radius * 0.3 * litPulse, node.radius * 0.35 * litPulse, 0, Math.PI * 2);
        ctx.fill();

        // Label
        if (ni === 0 || node.lit > 0.3) {
          ctx.font = `600 ${0.65 * litPulse}rem var(--font-mono, monospace)`;
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.fillStyle = `rgba(200,205,208,${0.3 + node.lit * 0.4})`;
          ctx.fillText(node.label, node.x, node.y - node.radius * 3 * litPulse - 6);
        }
      });

      // ---- Mouse ripple ----
      if (mouseRef.current.active) {
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;
        const mGlow = ctx.createRadialGradient(mx, my, 0, mx, my, 60);
        mGlow.addColorStop(0, "rgba(200,205,208,0.04)");
        mGlow.addColorStop(1, "rgba(10,12,18,0)");
        ctx.fillStyle = mGlow;
        ctx.beginPath();
        ctx.arc(mx, my, 60, 0, Math.PI * 2);
        ctx.fill();
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      ro.disconnect();
    };
  }, [initScene]);

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
