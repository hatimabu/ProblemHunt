import { useEffect, useRef, useCallback } from "react";

interface NetworkNode {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  radius: number;
  color: string;
  glowColor: string;
  label: string;
  type: "hub" | "problem" | "builder" | "solution";
  pulsePhase: number;
  pulseSpeed: number;
}

interface NetworkEdge {
  from: number;
  to: number;
  packets: { progress: number; speed: number; size: number }[];
  opacity: number;
}

const METAL_PALETTE = {
  hub: { main: "#e2e6e9", glow: "rgba(226,230,233,0.35)" },
  problem: { main: "#c8cdd0", glow: "rgba(200,205,208,0.28)" },
  builder: { main: "#a0a8ad", glow: "rgba(160,168,173,0.22)" },
  solution: { main: "#8a9196", glow: "rgba(138,145,150,0.18)" },
  gold: { main: "#d4af37", glow: "rgba(212,175,55,0.2)" },
};

function buildNetwork(width: number, height: number): { nodes: NetworkNode[]; edges: NetworkEdge[] } {
  const cx = width / 2;
  const cy = height / 2;
  const scale = Math.min(width, height) / 1000;

  const nodes: NetworkNode[] = [
    {
      x: cx, y: cy, baseX: cx, baseY: cy,
      radius: 5 * scale,
      color: METAL_PALETTE.hub.main,
      glowColor: METAL_PALETTE.hub.glow,
      label: "HUB",
      type: "hub",
      pulsePhase: 0,
      pulseSpeed: 0.002,
    },
  ];

  const layers = [
    { count: 4, dist: 180 * scale, type: "problem" as const, r: 3.5 * scale },
    { count: 6, dist: 300 * scale, type: "builder" as const, r: 2.8 * scale },
    { count: 5, dist: 420 * scale, type: "solution" as const, r: 2.2 * scale },
  ];

  layers.forEach((layer, li) => {
    for (let i = 0; i < layer.count; i++) {
      const angle = (Math.PI * 2 * i) / layer.count + li * 0.4;
      const dist = layer.dist * (0.85 + Math.random() * 0.3);
      const x = cx + Math.cos(angle) * dist;
      const y = cy + Math.sin(angle) * dist;
      const palette = layer.type === "problem" ? METAL_PALETTE.problem : layer.type === "builder" ? METAL_PALETTE.builder : METAL_PALETTE.solution;
      nodes.push({
        x, y, baseX: x, baseY: y,
        radius: layer.r,
        color: palette.main,
        glowColor: palette.glow,
        label: layer.type.toUpperCase(),
        type: layer.type,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.0015 + Math.random() * 0.002,
      });
    }
  });

  // Add a few random extra nodes
  for (let i = 0; i < 4; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = (250 + Math.random() * 200) * scale;
    const x = cx + Math.cos(angle) * dist;
    const y = cy + Math.sin(angle) * dist;
    nodes.push({
      x, y, baseX: x, baseY: y,
      radius: 2 * scale,
      color: METAL_PALETTE.gold.main,
      glowColor: METAL_PALETTE.gold.glow,
      label: "NODE",
      type: "solution",
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: 0.002 + Math.random() * 0.002,
    });
  }

  const edges: NetworkEdge[] = [];
  // Hub connects to all layer 1
  for (let i = 1; i <= layers[0].count; i++) {
    edges.push({
      from: 0, to: i,
      packets: Array.from({ length: 1 + Math.floor(Math.random() * 2) }, () => ({
        progress: Math.random(),
        speed: 0.002 + Math.random() * 0.003,
        size: 1.5 + Math.random(),
      })),
      opacity: 0.12 + Math.random() * 0.1,
    });
  }

  // Layer 1 connects to layer 2
  for (let i = 1; i <= layers[0].count; i++) {
    const targets: number[] = [];
    for (let j = layers[0].count + 1; j <= layers[0].count + layers[1].count; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 220 * scale && Math.random() > 0.3) {
        targets.push(j);
      }
    }
    targets.forEach((t) => {
      edges.push({
        from: i, to: t,
        packets: Array.from({ length: Math.random() > 0.5 ? 1 : 0 }, () => ({
          progress: Math.random(),
          speed: 0.002 + Math.random() * 0.003,
          size: 1 + Math.random() * 0.8,
        })),
        opacity: 0.08 + Math.random() * 0.08,
      });
    });
  }

  // Layer 2 connects to layer 3
  for (let i = layers[0].count + 1; i <= layers[0].count + layers[1].count; i++) {
    const targets: number[] = [];
    for (let j = layers[0].count + layers[1].count + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 180 * scale && Math.random() > 0.4) {
        targets.push(j);
      }
    }
    targets.forEach((t) => {
      edges.push({
        from: i, to: t,
        packets: Array.from({ length: Math.random() > 0.6 ? 1 : 0 }, () => ({
          progress: Math.random(),
          speed: 0.002 + Math.random() * 0.003,
          size: 0.8 + Math.random() * 0.6,
        })),
        opacity: 0.06 + Math.random() * 0.06,
      });
    });
  }

  // Some cross-connections for mesh feel
  for (let i = 1; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (edges.some((e) => (e.from === i && e.to === j) || (e.from === j && e.to === i))) continue;
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 140 * scale && Math.random() > 0.85) {
        edges.push({
          from: i, to: j,
          packets: [],
          opacity: 0.04,
        });
      }
    }
  }

  return { nodes, edges };
}

export function NetworkGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const networkRef = useRef<{ nodes: NetworkNode[]; edges: NetworkEdge[] } | null>(null);
  const frameRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const dimsRef = useRef({ width: 0, height: 0, dpr: 1 });

  const initNetwork = useCallback((width: number, height: number) => {
    networkRef.current = buildNetwork(width, height);
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
      initNetwork(width, height);
    };

    resize();
    window.addEventListener("resize", resize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, active: true };
    };
    const handleMouseLeave = () => { mouseRef.current.active = false; };
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    let lastTime = performance.now();

    const draw = (time: number) => {
      const dt = Math.min(time - lastTime, 33);
      lastTime = time;
      const { width, height } = dimsRef.current;
      const network = networkRef.current;
      if (!network) return;

      ctx.clearRect(0, 0, width, height);

      // Subtle vignette
      const vignette = ctx.createRadialGradient(width / 2, height / 2, height * 0.3, width / 2, height / 2, height * 0.75);
      vignette.addColorStop(0, "rgba(10,12,18,0)");
      vignette.addColorStop(1, "rgba(10,12,18,0.45)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      // Draw edges
      network.edges.forEach((edge) => {
        const from = network.nodes[edge.from];
        const to = network.nodes[edge.to];
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = `rgba(160,168,173,${edge.opacity})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();

        // Update and draw packets
        edge.packets.forEach((pkt) => {
          pkt.progress += pkt.speed * dt;
          if (pkt.progress > 1) pkt.progress = 0;
          const px = from.x + (to.x - from.x) * pkt.progress;
          const py = from.y + (to.y - from.y) * pkt.progress;

          const pglow = ctx.createRadialGradient(px, py, 0, px, py, pkt.size * 4);
          pglow.addColorStop(0, `rgba(226,230,233,${0.35 * (1 - Math.abs(pkt.progress - 0.5) * 2)})`);
          pglow.addColorStop(1, "rgba(10,12,18,0)");
          ctx.fillStyle = pglow;
          ctx.beginPath();
          ctx.arc(px, py, pkt.size * 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "rgba(226,230,233,0.8)";
          ctx.beginPath();
          ctx.arc(px, py, pkt.size, 0, Math.PI * 2);
          ctx.fill();
        });
      });

      // Draw nodes
      network.nodes.forEach((node) => {
        node.pulsePhase += node.pulseSpeed * dt;
        const pulse = 1 + Math.sin(node.pulsePhase) * 0.15;

        // Subtle drift
        node.x = node.baseX + Math.sin(node.pulsePhase * 0.3) * 3;
        node.y = node.baseY + Math.cos(node.pulsePhase * 0.25) * 3;

        // Glow
        const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius * 8 * pulse);
        glow.addColorStop(0, node.glowColor.replace(/[\d.]+\)$/, `${0.3 * pulse})`));
        glow.addColorStop(1, "rgba(10,12,18,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 8 * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.beginPath();
        ctx.arc(node.x - node.radius * 0.25, node.y - node.radius * 0.25, node.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Mouse interaction ripple
      if (mouseRef.current.active) {
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;
        const mGlow = ctx.createRadialGradient(mx, my, 0, mx, my, 60);
        mGlow.addColorStop(0, "rgba(200,205,208,0.05)");
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
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [initNetwork]);

  return (
    <canvas
      ref={canvasRef}
      className="network-graph"
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
