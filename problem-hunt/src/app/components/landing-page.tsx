import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from "motion/react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Briefcase,
  ChevronRight,
  Globe,
  LogOut,
  Radar,
  Rocket,
  Shield,
  Signal,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";
import { Button } from "./ui/button";
import { Navbar } from "./navbar";
import { useAuth } from "../contexts/AuthContext";
import { API_ENDPOINTS } from "../../lib/api-config";
import { formatTimeAgo, type ProblemPost } from "../../lib/marketplace";

/* ================================================================== */
/*  Types                                                             */
/* ================================================================== */

interface LeaderboardEntry {
  rank: number;
  builderId: string;
  builderName: string;
  proposalsSubmitted: number;
  proposalsAccepted: number;
  tipsReceived: number;
  reputationScore: number;
  tier: string;
}

/* ================================================================== */
/*  Motion presets — shared language across the whole page            */
/* ================================================================== */

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

/* ================================================================== */
/*  Theme data                                                        */
/* ================================================================== */

const FEATURES = [
  {
    icon: Globe,
    title: "Borderless Bounties",
    copy: "Post work from anywhere. Builders from any timezone can bid, ship, and get paid — no bank account required.",
  },
  {
    icon: Shield,
    title: "Trustless Escrow",
    copy: "Funds lock on-chain when a brief is accepted. Payout releases only when work is verified and approved.",
  },
  {
    icon: Zap,
    title: "Direct Settlement",
    copy: "No middlemen, no holding periods. Wallet-to-wallet settlement in seconds, not business days.",
  },
  {
    icon: Wallet,
    title: "Multi-Chain Ready",
    copy: "Solana, Ethereum, Polygon, Arbitrum. Connect the wallet that matches your stack and keep everything in one place.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Post the brief",
    copy: "Describe the problem, set a budget or bounty, and publish it to the board in under a minute.",
  },
  {
    n: "02",
    title: "Review real proposals",
    copy: "Builders respond with scoped plans, pricing, and timelines. No cold DMs, no guessing.",
  },
  {
    n: "03",
    title: "Accept & track",
    copy: "Pick a builder, watch the job move from accepted to in-progress to complete in one place.",
  },
  {
    n: "04",
    title: "Pay on-chain",
    copy: "Release payment wallet-to-wallet the moment the work is verified. No invoices, no waiting.",
  },
];

const TIER_STYLES: Record<string, string> = {
  Legend: "border-[color:rgba(201,168,76,0.36)] bg-[rgba(201,168,76,0.12)] text-[var(--board-gold)]",
  Expert: "border-[color:rgba(201,84,94,0.34)] bg-[rgba(201,84,94,0.14)] text-[var(--board-accent)]",
  Senior: "border-[color:var(--board-line-strong)] bg-[var(--board-panel-strong)] text-[var(--board-ink)]",
  Builder: "border-[color:var(--board-line)] bg-[var(--board-panel)] text-[var(--board-muted)]",
  Newcomer: "border-[color:var(--board-line)] bg-[var(--board-bg)] text-[var(--board-soft)]",
};

/* ================================================================== */
/*  Animated counter                                                  */
/* ================================================================== */

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started.current) {
            started.current = true;
            const duration = 1100;
            const start = performance.now();
            const tick = (now: number) => {
              const progress = Math.min((now - start) / duration, 1);
              const eased = 1 - Math.pow(1 - progress, 3);
              setDisplay(Math.round(eased * value));
              if (progress < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
            io.disconnect();
          }
        });
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

/* ================================================================== */
/*  Sub-components                                                    */
/* ================================================================== */

function ProblemCard({ post }: { post: ProblemPost }) {
  return (
    <motion.div variants={fadeUp}>
      <Link
        to={`/problem/${post.id}`}
        className="group block rounded-xl border border-[color:var(--board-line)] bg-[var(--board-panel)] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[color:rgba(160,168,173,0.35)] hover:bg-[var(--board-panel-strong)] hover:shadow-[0_18px_40px_rgba(0,0,0,0.28)]"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--board-line)] bg-[var(--board-panel-strong)] px-2.5 py-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--board-metal-steel)]">
            <Signal className="h-3 w-3 text-emerald-500/80" />
            {post.type === "job" ? "Paid task" : "Bounty"}
          </span>
          <span className="font-mono text-[0.65rem] text-[var(--board-muted)]">
            {formatTimeAgo(post.createdAt)}
          </span>
        </div>

        <h3 className="mt-3 font-[family-name:var(--font-display)] text-[1.15rem] font-medium leading-snug tracking-[-0.02em] text-[var(--board-ink)] transition-colors group-hover:text-[var(--board-accent)]">
          {post.title}
        </h3>

        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--board-muted)]">
          {post.description}
        </p>

        <div className="mt-4 flex items-center gap-4 border-t border-[color:var(--board-line)] pt-3">
          {post.budgetSol ? (
            <span className="flex items-center gap-1 font-mono text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-[var(--board-gold)]">
              <Wallet className="h-3 w-3" />
              {post.budgetSol} SOL
            </span>
          ) : post.budget ? (
            <span className="flex items-center gap-1 font-mono text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-[var(--board-gold)]">
              <Wallet className="h-3 w-3" />
              {post.budget}
            </span>
          ) : null}
          <span className="flex items-center gap-1 font-mono text-[0.72rem] text-[var(--board-muted)]">
            <Briefcase className="h-3 w-3" />
            {post.proposals} proposal{post.proposals === 1 ? "" : "s"}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const tierStyle = TIER_STYLES[entry.tier] || TIER_STYLES.Newcomer;
  return (
    <motion.div
      variants={fadeUp}
      className="flex items-center gap-4 rounded-xl border border-[color:var(--board-line)] bg-[var(--board-panel)] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[color:rgba(160,168,173,0.35)] hover:bg-[var(--board-panel-strong)]"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--board-line)] bg-[var(--board-panel-strong)] font-[family-name:var(--font-display)] text-sm font-medium text-[var(--board-ink)]">
        {entry.rank}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-[var(--board-ink)]">{entry.builderName}</span>
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.12em] ${tierStyle}`}>
            {entry.tier}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-3 font-mono text-[0.65rem] text-[var(--board-muted)]">
          <span>{entry.proposalsAccepted} accepted</span>
          <span>·</span>
          <span>{entry.reputationScore} rep</span>
        </div>
      </div>
      {entry.rank === 1 && <Trophy className="h-5 w-5 shrink-0 text-[var(--board-gold)]" />}
    </motion.div>
  );
}

/* ================================================================== */
/*  Unified animated background — persists across the whole page      */
/* ================================================================== */

function LivingBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const smoothX = useSpring(mouseX, { stiffness: 40, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 40, damping: 20 });

  const glowLeft = useTransform(smoothX, (v) => `${v * 100}%`);
  const glowTop = useTransform(smoothY, (v) => `${v * 100}%`);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      mouseX.set(e.clientX / window.innerWidth);
      mouseY.set(e.clientY / window.innerHeight);
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, [mouseX, mouseY]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    const nodes: { x: number; y: number; vx: number; vy: number }[] = [];

    const resize = () => {
      w = window.innerWidth;
      h = document.documentElement.scrollHeight;
      canvas.width = w;
      canvas.height = h;
    };

    const init = () => {
      resize();
      nodes.length = 0;
      const count = Math.floor((w * Math.min(h, window.innerHeight * 2.2)) / 24000);
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const viewTop = window.scrollY - 200;
      const viewBottom = window.scrollY + window.innerHeight + 200;

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        if (a.y < viewTop || a.y > viewBottom) continue;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(160,168,173,${0.05 * (1 - dist / 130)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        if (n.y < viewTop || n.y > viewBottom) continue;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.1, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(160,168,173,0.3)";
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    init();
    draw();
    window.addEventListener("resize", init);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", init);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <canvas ref={canvasRef} aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, width: "100%", opacity: 0.55 }} />
      <motion.div
        aria-hidden="true"
        className="absolute h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          left: glowLeft,
          top: glowTop,
          background: "radial-gradient(circle, rgba(201,84,94,0.07), transparent 60%)",
          filter: "blur(10px)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 900px 500px at 15% 0%, rgba(201,84,94,0.07), transparent 60%), radial-gradient(ellipse 900px 500px at 85% 30%, rgba(232,197,71,0.05), transparent 60%), radial-gradient(ellipse 900px 600px at 50% 100%, rgba(120,150,255,0.04), transparent 60%)",
        }}
      />
    </div>
  );
}

/* ================================================================== */
/*  Scroll progress rail                                              */
/* ================================================================== */

function ScrollRail() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      className="fixed left-0 right-0 top-0 z-[60] h-[2px] origin-left bg-gradient-to-r from-[var(--board-accent)] via-[var(--board-gold)] to-[var(--board-accent)]"
      style={{ scaleX }}
    />
  );
}

/* ================================================================== */
/*  Main                                                              */
/* ================================================================== */

export function LandingPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [latestPosts, setLatestPosts] = useState<ProblemPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [topBuilders, setTopBuilders] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setPostsLoading(true);
        const token = localStorage.getItem("problemhunt-token");
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(`${API_ENDPOINTS.PROBLEMS}?category=all&sortBy=newest&type=all`, { headers });
        if (!res.ok) throw new Error("fail");
        const data = await res.json();
        const problems = Array.isArray(data.problems) ? data.problems : [];
        setLatestPosts(problems.slice(0, 3));
        setLiveCount(typeof data.total === "number" ? data.total : problems.length);
      } catch {
        setLatestPosts([]);
      } finally {
        setPostsLoading(false);
      }
    };
    void fetchPosts();
  }, []);

  useEffect(() => {
    const fetchLb = async () => {
      try {
        setLeaderboardLoading(true);
        const token = localStorage.getItem("problemhunt-token");
        const res = await fetch(`${API_ENDPOINTS.LEADERBOARD}?period=alltime&limit=3`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error("fail");
        const data = await res.json();
        setTopBuilders(data.leaderboard || []);
      } catch {
        setTopBuilders([]);
      } finally {
        setLeaderboardLoading(false);
      }
    };
    void fetchLb();
  }, []);

  const handleSignOut = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="board-app relative">
      <ScrollRail />
      <LivingBackground />
      <Navbar />

      <main className="relative z-[2]">
        {/* ========================= HERO ========================= */}
        <section className="relative flex min-h-[calc(100svh-64px)] items-center overflow-hidden py-16 md:min-h-[calc(100svh-73px)] md:py-20">
          <div className="board-container relative z-[2]">
            <motion.div
              initial="hidden"
              animate="show"
              variants={stagger}
              className="mx-auto max-w-4xl text-center"
            >
              <motion.div
                variants={fadeUp}
                className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-[color:rgba(232,197,71,0.35)] bg-[rgba(10,14,22,0.6)] px-4 py-2 backdrop-blur-md"
              >
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#e8c547] shadow-[0_0_0_4px_rgba(232,197,71,0.18)]" />
                <span className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[#e8c547]">
                  System Under Construction
                </span>
                <span
                  role="img"
                  aria-label="Notice"
                  title="This website is currently under development. Some features might be unavailable or temporarily down."
                  className="ml-0.5 flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-[color:rgba(232,197,71,0.5)] text-[#e8c547] transition-colors hover:bg-[rgba(232,197,71,0.15)]"
                >
                  <AlertTriangle className="h-2.5 w-2.5" strokeWidth={2.5} />
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="font-[family-name:var(--font-display)] text-[clamp(2.8rem,8vw,6.5rem)] font-medium leading-[0.95] tracking-[-0.04em] text-[var(--board-ink)]"
              >
                Put the work on the board and find a builder who can actually close it.
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="mx-auto mt-6 max-w-2xl text-[clamp(1rem,1.6vw,1.15rem)] leading-relaxed text-[var(--board-muted)]"
              >
                Problem Hunt is a bounty marketplace for technical work that keeps getting delayed.
                Post a brief, price the ask, review serious responses, and move from backlog to shipped.
              </motion.p>

              <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <Link to="/browse">
                  <Button className="h-12 border-0 bg-[var(--board-metal-accent)] px-7 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-metal-dark)] transition-all hover:bg-[var(--board-metal-light)] hover:shadow-[0_0_20px_rgba(200,205,208,0.35)] hover:scale-[1.02]">
                    Browse live work
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>

                <Link to="/post">
                  <Button className="h-12 border-0 bg-[var(--board-accent)] px-7 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-white transition-all hover:bg-[var(--color-accent-hover)] hover:shadow-[0_0_20px_rgba(200,205,208,0.35)] hover:scale-[1.02]">
                    <Rocket className="h-4 w-4" />
                    Post a brief
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </div>

          <motion.div
            aria-hidden="true"
            className="absolute bottom-6 left-1/2 -translate-x-1/2"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronRight className="h-5 w-5 rotate-90 text-[var(--board-metal-steel)]" />
          </motion.div>
        </section>

        {/* ========================= HOW IT WORKS ========================= */}
        <section className="relative border-t border-[color:var(--board-line)] py-16 md:py-20">
          <div className="board-container">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeUp}
              className="max-w-2xl"
            >
              <p className="board-kicker">The flow</p>
              <h2 className="board-title mt-3">From backlog to paid, in four moves.</h2>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              variants={stagger}
              className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-[color:var(--board-line)] bg-[color:var(--board-line)] sm:grid-cols-2 lg:grid-cols-4"
            >
              {STEPS.map((step) => (
                <motion.div
                  key={step.n}
                  variants={fadeUp}
                  className="relative bg-[var(--board-panel)] p-6 transition-colors hover:bg-[var(--board-panel-strong)]"
                >
                  <span className="font-[family-name:var(--font-display)] text-[2.2rem] font-medium tracking-[-0.03em] text-[color:rgba(160,168,173,0.28)]">
                    {step.n}
                  </span>
                  <h3 className="mt-3 font-[family-name:var(--font-display)] text-[1.05rem] font-medium tracking-[-0.02em] text-[var(--board-ink)]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--board-muted)]">{step.copy}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ========================= LIVE WORK ========================= */}
        <section className="relative border-t border-[color:var(--board-line)] py-16 md:py-20">
          <div className="board-container">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeUp}
              className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"
            >
              <div>
                <div className="flex items-center gap-2">
                  <Radar className="h-4 w-4 animate-[cpuPulse_3s_ease-in-out_infinite] text-[#e8c547]" />
                  <p className="board-kicker">Live Briefs</p>
                </div>
                <h2 className="board-title mt-3">Work that is waiting for the right builder.</h2>
              </div>
              <Link to="/browse">
                <Button className="btn-glow h-11 border-0 bg-[var(--board-accent)] px-5 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-[var(--color-accent-hover)]">
                  View all briefs
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.15 }}
              variants={stagger}
              className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {postsLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-[color:var(--board-line)] bg-[var(--board-panel)] p-5">
                      <div className="skeleton h-3 w-24" />
                      <div className="skeleton mt-4 h-6 w-3/4" />
                      <div className="skeleton mt-3 h-4 w-full" />
                      <div className="skeleton mt-2 h-4 w-5/6" />
                      <div className="skeleton mt-5 h-4 w-32" />
                    </div>
                  ))
                : latestPosts.length > 0
                ? latestPosts.map((post) => <ProblemCard key={post.id} post={post} />)
                : (
                  <motion.div
                    variants={fadeUp}
                    className="col-span-full rounded-xl border border-dashed border-[color:var(--board-line)] bg-[var(--board-panel)] p-10 text-center"
                  >
                    <p className="text-sm text-[var(--board-muted)]">
                      No briefs on the board yet. Be the first to post one.
                    </p>
                  </motion.div>
                )}
            </motion.div>
          </div>
        </section>

        {/* ========================= FEATURES ========================= */}
        <section className="relative border-t border-[color:var(--board-line)] py-16 md:py-20">
          <div className="board-container">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeUp}
              className="max-w-2xl"
            >
              <p className="board-kicker">Decentralized</p>
              <h2 className="board-title mt-3">No gatekeepers. Just work and wallets.</h2>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.15 }}
              variants={stagger}
              className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
            >
              {FEATURES.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.title}
                    variants={scaleIn}
                    whileHover={{ y: -4 }}
                    className="feature-box-navy rounded-2xl border p-6"
                  >
                    <div className="feature-box-navy__icon-wrap flex h-10 w-10 items-center justify-center rounded-xl border">
                      <Icon className="feature-box-navy__icon h-4 w-4" />
                    </div>
                    <h3 className="feature-box-navy__title board-subtitle mt-5 text-[1.25rem]">{item.title}</h3>
                    <p className="feature-box-navy__copy board-copy mt-3 text-sm leading-7">{item.copy}</p>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* ========================= LEADERBOARD ========================= */}
        <section className="relative border-t border-[color:var(--board-line)] py-16 md:py-20">
          <div className="board-container">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeUp}
              className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"
            >
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-[var(--board-metal-steel)]" />
                  <p className="board-kicker">Top Builders</p>
                </div>
                <h2 className="board-title mt-3">Builders who earn trust by shipping.</h2>
              </div>
              <Link to="/leaderboard">
                <Button className="btn-glow h-11 border-0 bg-[var(--board-accent)] px-5 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-[var(--color-accent-hover)]">
                  Full leaderboard
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.15 }}
              variants={stagger}
              className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {leaderboardLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 rounded-xl border border-[color:var(--board-line)] bg-[var(--board-panel)] p-4">
                      <div className="skeleton h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <div className="skeleton h-4 w-32" />
                        <div className="skeleton mt-2 h-3 w-24" />
                      </div>
                    </div>
                  ))
                : topBuilders.length > 0
                ? topBuilders.map((entry) => <LeaderboardRow key={entry.builderId} entry={entry} />)
                : (
                  <motion.div
                    variants={fadeUp}
                    className="col-span-full rounded-xl border border-dashed border-[color:var(--board-line)] bg-[var(--board-panel)] p-10 text-center"
                  >
                    <p className="text-sm text-[var(--board-muted)]">
                      No rankings yet. Once builders start winning work, they'll show up here.
                    </p>
                  </motion.div>
                )}
            </motion.div>
          </div>
        </section>

        {/* ========================= FINAL CTA ========================= */}
        <section className="relative border-t border-[color:var(--board-line)] py-16 md:py-20">
          <div className="board-container">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              variants={scaleIn}
              className="relative overflow-hidden rounded-2xl border border-[color:var(--board-line)] bg-[var(--board-panel)] p-8 md:p-12"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse 500px 300px at 90% 0%, rgba(201,84,94,0.08), transparent 60%)",
                }}
              />
              <div className="relative">
                <p className="board-kicker">Ready</p>
                <h2 className="board-title mt-3 max-w-3xl">
                  If the task keeps surviving the sprint, it probably belongs on the board.
                </h2>
                <p className="board-copy mt-5">
                  Start with the thing your team keeps pushing forward, the workflow nobody owns, or the scoped
                  implementation that needs a real builder behind it.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link to="/post">
                    <Button className="h-12 border-0 bg-[var(--board-accent)] px-6 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-white transition-all hover:bg-[var(--color-accent-hover)] hover:shadow-[0_0_20px_rgba(200,205,208,0.35)] hover:scale-[1.02]">
                      <Rocket className="h-4 w-4" />
                      Post a brief
                    </Button>
                  </Link>
                  <Link to="/browse">
                    <Button className="h-12 border-0 bg-[var(--board-metal-accent)] px-6 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-metal-dark)] transition-all hover:bg-[var(--board-metal-light)] hover:shadow-[0_0_20px_rgba(200,205,208,0.35)] hover:scale-[1.02]">
                      Browse live work
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* ========================= FOOTER ========================= */}
      <footer className="relative z-[2] border-t border-[color:var(--board-line)]">
        <div className="board-container flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="board-eyebrow">Problem Hunt</p>
            <p className="mt-2 text-sm text-[var(--board-muted)]">
              A decentralized marketplace for technical work, scoped tasks, and bounty-backed problem solving.
            </p>
          </div>

          {user ? (
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="h-10 border-[color:var(--board-line-strong)] bg-transparent px-4 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-muted)] hover:bg-[var(--board-panel-strong)] hover:text-[var(--board-ink)]"
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              Sign out
            </Button>
          ) : (
            <Link to="/auth">
              <Button
                variant="outline"
                className="h-10 border-[color:var(--board-line-strong)] bg-transparent px-4 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-muted)] hover:bg-[var(--board-panel-strong)] hover:text-[var(--board-ink)]"
              >
                Sign in
              </Button>
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
}
