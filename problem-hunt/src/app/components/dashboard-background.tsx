import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  radius: number;
  pulsePhase: number;
  pulseSpeed: number;
}

interface Traveler {
  from: number;
  to: number;
  progress: number;
  speed: number;
  size: number;
  alpha: number;
}

function buildScene(width: number, height: number) {
  const nodes: Node[] = [];
  const count = 8;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const dist = 0.15 + Math.random() * 0.3;
    nodes.push({
      x: width * (0.2 + Math.cos(angle) * dist),
      y: height * (0.2 + Math.sin(angle) * dist * 0.6),
      baseX: width * (0.2 + Math.cos(angle) * dist),
      baseY: height * (0.2 + Math.sin(angle) * dist * 0.6),
      radius: 1.5 + Math.random() * 1.5,
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: 0.001 + Math.random() * 0.002,
    });
  }

  const travelers: Traveler[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (Math.random() > 0.5) {
        travelers.push({
          from: i,
          to: j,
          progress: Math.random(),
          speed: 0.0003 + Math.random() * 0.0004,
          size: 1 + Math.random() * 1.2,
          alpha: 0.6,
        });
      }
    }
  }

  return { nodes, travelers };
}

export function DashboardBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<ReturnType<typeof buildScene> | null>(null);
  const frameRef = useRef<number>(0);
  const dimsRef = useRef({ width: 0, height: 0, dpr: 1 });

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
      sceneRef.current = buildScene(width, height);
    };

    resize();
    window.addEventListener("resize", resize);

    let lastTime = performance.now();

    const draw = (time: number) => {
      const dt = Math.min(time - lastTime, 33);
      lastTime = time;
      const { width, height } = dimsRef.current;
      const scene = sceneRef.current;
      if (!scene) return;

      ctx.clearRect(0, 0, width, height);
      const { nodes, travelers } = scene;

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = Math.min(width, height) * 0.5;
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.08;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(160,168,173,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.setLineDash([3, 6]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }

      // Update and draw travelers
      travelers.forEach((t) => {
        t.progress += t.speed * dt;
        if (t.progress >= 1) {
          t.progress = 0;
          const tmp = t.from;
          t.from = t.to;
          t.to = tmp;
        }

        const from = nodes[t.from];
        const to = nodes[t.to];
        const px = from.x + (to.x - from.x) * t.progress;
        const py = from.y + (to.y - from.y) * t.progress;

        // Glow
        const glow = ctx.createRadialGradient(px, py, 0, px, py, t.size * 5);
        glow.addColorStop(0, `rgba(212,175,55,${t.alpha * 0.4})`);
        glow.addColorStop(1, "rgba(10,12,18,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(px, py, t.size * 5, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = `rgba(232,197,71,${t.alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, t.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw nodes
      nodes.forEach((node) => {
        node.pulsePhase += node.pulseSpeed * dt;
        const pulse = 1 + Math.sin(node.pulsePhase) * 0.15;
        node.x = node.baseX + Math.sin(node.pulsePhase * 0.3) * 2;
        node.y = node.baseY + Math.cos(node.pulsePhase * 0.25) * 2;

        const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius * 8 * pulse);
        glow.addColorStop(0, `rgba(200,205,208,${0.2 * pulse})`);
        glow.addColorStop(1, "rgba(10,12,18,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 8 * pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(200,205,208,0.7)";
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.beginPath();
        ctx.arc(node.x - node.radius * 0.25, node.y - node.radius * 0.25, node.radius * 0.3 * pulse, 0, Math.PI * 2);
        ctx.fill();
      });

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
