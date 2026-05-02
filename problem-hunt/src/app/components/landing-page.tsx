import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  ChevronRight,
  Globe,
  LayoutDashboard,
  LogIn,
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
import { supabase } from "../../../lib/supabaseClient";
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
/*  Scroll-reveal hook (self-contained)                               */
/* ================================================================== */

function useScrollReveal() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (CSS.supports("animation-timeline", "view()")) return;

    const els = document.querySelectorAll<HTMLElement>(".sr");
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("sr-on");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -48px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

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

const TIER_STYLES: Record<string, string> = {
  Legend: "border-[color:rgba(201,168,76,0.36)] bg-[rgba(201,168,76,0.12)] text-[var(--board-gold)]",
  Expert: "border-[color:rgba(201,84,94,0.34)] bg-[rgba(201,84,94,0.14)] text-[var(--board-accent)]",
  Senior: "border-[color:var(--board-line-strong)] bg-[var(--board-panel-strong)] text-[var(--board-ink)]",
  Builder: "border-[color:var(--board-line)] bg-[var(--board-panel)] text-[var(--board-muted)]",
  Newcomer: "border-[color:var(--board-line)] bg-[var(--board-bg)] text-[var(--board-soft)]",
};

/* ================================================================== */
/*  Sub-components                                                    */
/* ================================================================== */

function ProblemCard({ post, index }: { post: ProblemPost; index: number }) {
  return (
    <Link
      to={`/problem/${post.id}`}
      className={`group block rounded-xl border border-[color:var(--board-line)] bg-[var(--board-panel)] p-5 transition-all duration-300 hover:border-[color:rgba(160,168,173,0.35)] hover:bg-[var(--board-panel-strong)] hover:shadow-[0_14px_34px_rgba(0,0,0,0.22)] sr sr-d${Math.min(index + 1, 5)}`}
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
  );
}

function LeaderboardRow({ entry, index }: { entry: LeaderboardEntry; index: number }) {
  const tierStyle = TIER_STYLES[entry.tier] || TIER_STYLES.Newcomer;
  return (
    <div className={`flex items-center gap-4 rounded-xl border border-[color:var(--board-line)] bg-[var(--board-panel)] p-4 transition-all duration-300 hover:border-[color:rgba(160,168,173,0.35)] hover:bg-[var(--board-panel-strong)] sr sr-d${Math.min(index + 1, 5)}`}>
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
      {index === 0 && <Trophy className="h-5 w-5 shrink-0 text-[var(--board-gold)]" />}
    </div>
  );
}

/* ================================================================== */
/*  Mesh background canvas                                            */
/* ================================================================== */

function MeshBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;
    };

    const init = () => {
      resize();
      nodes.length = 0;
      const count = Math.floor((w * h) / 18000);
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(160,168,173,${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(160,168,173,0.35)";
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
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        opacity: 0.6,
        pointerEvents: "none",
      }}
    />
  );
}

/* ================================================================== */
/*  Main                                                              */
/* ================================================================== */

export function LandingPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  useScrollReveal();

  const [latestPosts, setLatestPosts] = useState<ProblemPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [topBuilders, setTopBuilders] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setPostsLoading(true);
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(
          `${API_ENDPOINTS.PROBLEMS}?category=all&sortBy=newest&type=all`,
          { headers }
        );
        if (!res.ok) throw new Error("fail");
        const data = await res.json();
        setLatestPosts(Array.isArray(data.problems) ? data.problems.slice(0, 3) : []);
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
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const res = await fetch(
          `${API_ENDPOINTS.LEADERBOARD}?period=alltime&limit=3`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
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
    <div className="board-app">
      <Navbar />

      <main>
        {/* ========================= HERO ========================= */}
        <section className="relative flex min-h-[calc(100svh-64px)] items-center overflow-hidden py-16 md:min-h-[calc(100svh-73px)] md:py-20">
          <MeshBackground />

          {/* Gradient overlays */}
          <div
            className="pointer-events-none absolute inset-0 z-[1]"
            style={{
              background:
                "radial-gradient(ellipse at 20% 20%, rgba(201,84,94,0.06), transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(232,197,71,0.04), transparent 50%)",
            }}
          />

          <div className="board-container relative z-[2]">
            <div className="mx-auto max-w-4xl text-center">
              {/* eyebrow */}
              <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-[color:var(--board-line)] bg-[rgba(10,14,22,0.6)] px-4 py-2 backdrop-blur-md">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(34,197,94,0.15)]" />
                <span className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[var(--board-metal-steel)]">
                  System Operational
                </span>
              </div>

              {/* headline */}
              <h1 className="font-[family-name:var(--font-display)] text-[clamp(2.8rem,8vw,6.5rem)] font-medium leading-[0.95] tracking-[-0.04em] text-[var(--board-ink)]">
                Put the work on the board and find a builder who can actually close it.
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-[clamp(1rem,1.6vw,1.15rem)] leading-relaxed text-[var(--board-muted)]">
                Problem Hunt is a bounty marketplace for technical work that keeps getting delayed.
                Post a brief, price the ask, review serious responses, and move from backlog to shipped.
              </p>

              {/* CTA buttons */}
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <Link to="/browse">
                  <Button className="btn-glow h-12 border-0 bg-[var(--board-accent)] px-7 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-[var(--color-accent-hover)]">
                    Browse live work
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>

                <Link to="/post">
                  <Button className="btn-glow-metal h-12 border-0 bg-[var(--board-metal-accent)] px-7 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-metal-dark)] hover:bg-[var(--board-metal-light)]">
                    <Rocket className="h-4 w-4" />
                    Post a brief
                  </Button>
                </Link>

                <Link to="/leaderboard">
                  <Button
                    variant="outline"
                    className="btn-outline-animated h-12 border-[color:var(--board-line-strong)] bg-transparent px-6 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-muted)]"
                  >
                    <Trophy className="h-4 w-4" />
                    Leaderboard
                  </Button>
                </Link>

                {user ? (
                  <>
                    <Link to="/dashboard">
                      <Button
                        variant="outline"
                        className="btn-outline-animated h-12 border-[color:var(--board-line-strong)] bg-transparent px-6 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-muted)]"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      onClick={handleSignOut}
                      className="btn-outline-animated h-12 border-[color:var(--board-line-strong)] bg-transparent px-6 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-muted)] hover:border-[color:rgba(219,84,97,0.4)] hover:text-[var(--board-accent)]"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </Button>
                  </>
                ) : (
                  <Link to="/auth">
                    <Button
                      variant="outline"
                      className="btn-outline-animated h-12 border-[color:var(--board-line-strong)] bg-transparent px-6 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-muted)]"
                    >
                      <LogIn className="h-4 w-4" />
                      Sign in
                    </Button>
                  </Link>
                )}
              </div>

              {/* stats */}
              <div className="mx-auto mt-14 grid max-w-2xl gap-6 border-t border-[color:var(--board-line)] pt-8 sm:grid-cols-3">
                <div>
                  <div className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,3.5vw,2.6rem)] font-medium tracking-[-0.03em] text-[var(--board-ink)]">
                    One
                  </div>
                  <div className="mt-1 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[var(--board-metal-steel)]">
                    Place for briefs, tasks, and bounties
                  </div>
                </div>
                <div>
                  <div className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,3.5vw,2.6rem)] font-medium tracking-[-0.03em] text-[var(--board-ink)]">
                    Direct
                  </div>
                  <div className="mt-1 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[var(--board-metal-steel)]">
                    Wallet-aware payout flow
                  </div>
                </div>
                <div>
                  <div className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,3.5vw,2.6rem)] font-medium tracking-[-0.03em] text-[var(--board-ink)]">
                    Clear
                  </div>
                  <div className="mt-1 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[var(--board-metal-steel)]">
                    Signals, bids, and ownership
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================= LIVE WORK ========================= */}
        <section className="relative border-t border-[color:var(--board-line)] py-16 md:py-20">
          <div className="board-container">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
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
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
                : latestPosts.map((post, i) => <ProblemCard key={post.id} post={post} index={i} />)}
            </div>
          </div>
        </section>

        {/* ========================= FEATURES ========================= */}
        <section className="relative border-t border-[color:var(--board-line)] py-16 md:py-20">
          <div className="board-container">
            <div className="max-w-2xl">
              <p className="board-kicker">Decentralized</p>
              <h2 className="board-title mt-3">No gatekeepers. Just work and wallets.</h2>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className={`feature-box-navy rounded-2xl border p-6 sr sr-d${Math.min(index + 1, 5)}`}
                  >
                    <div className="feature-box-navy__icon-wrap flex h-10 w-10 items-center justify-center rounded-xl border">
                      <Icon className="feature-box-navy__icon h-4 w-4" />
                    </div>
                    <h3 className="feature-box-navy__title board-subtitle mt-5 text-[1.25rem]">{item.title}</h3>
                    <p className="feature-box-navy__copy board-copy mt-3 text-sm leading-7">{item.copy}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================= LEADERBOARD ========================= */}
        <section className="relative border-t border-[color:var(--board-line)] py-16 md:py-20">
          <div className="board-container">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
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
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                : topBuilders.map((entry, i) => <LeaderboardRow key={entry.builderId} entry={entry} index={i} />)}
            </div>
          </div>
        </section>

        {/* ========================= FINAL CTA ========================= */}
        <section className="relative border-t border-[color:var(--board-line)] py-16 md:py-20">
          <div className="board-container">
            <div className="sr sr-d1 rounded-2xl border border-[color:var(--board-line)] bg-[var(--board-panel)] p-8 md:p-12">
              <p className="board-kicker">Ready</p>
              <h2 className="board-title mt-3 max-w-3xl">
                If the task keeps surviving the sprint, it probably belongs on the board.
              </h2>
              <p className="board-copy mt-5">
                Start with the thing your team keeps pushing forward, the workflow nobody owns, or the scoped implementation that needs a real builder behind it.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {user ? (
                  <>
                    <Link to="/post">
                      <Button className="btn-glow h-12 border-0 bg-[var(--board-accent)] px-6 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-[var(--color-accent-hover)]">
                        <Rocket className="h-4 w-4" />
                        Post a brief
                      </Button>
                    </Link>
                    <Link to="/dashboard">
                      <Button
                        variant="outline"
                        className="btn-outline-animated h-12 border-[color:var(--board-line-strong)] bg-transparent px-6 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-muted)]"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      onClick={handleSignOut}
                      className="btn-outline-animated h-12 border-[color:var(--board-line-strong)] bg-transparent px-6 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-muted)] hover:border-[color:rgba(219,84,97,0.4)] hover:text-[var(--board-accent)]"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/auth">
                      <Button className="btn-glow h-12 border-0 bg-[var(--board-accent)] px-6 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-[var(--color-accent-hover)]">
                        <LogIn className="h-4 w-4" />
                        Join the board
                      </Button>
                    </Link>
                    <Link to="/browse">
                      <Button
                        variant="outline"
                        className="btn-outline-animated h-12 border-[color:var(--board-line-strong)] bg-transparent px-6 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-muted)]"
                      >
                        Browse live work
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link to="/leaderboard">
                      <Button
                        variant="outline"
                        className="btn-outline-animated h-12 border-[color:var(--board-line-strong)] bg-transparent px-6 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-muted)]"
                      >
                        <Trophy className="h-4 w-4" />
                        Leaderboard
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ========================= FOOTER ========================= */}
      <footer className="border-t border-[color:var(--board-line)]">
        <div className="board-container flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="board-eyebrow">Problem Hunt</p>
            <p className="mt-2 text-sm text-[var(--board-muted)]">
              A decentralized marketplace for technical work, scoped tasks, and bounty-backed problem solving.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link to="/browse">
              <Button variant="ghost" className="h-9 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[var(--board-muted)] hover:text-[var(--board-ink)]">
                Browse
              </Button>
            </Link>
            <Link to="/leaderboard">
              <Button variant="ghost" className="h-9 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[var(--board-muted)] hover:text-[var(--board-ink)]">
                Leaderboard
              </Button>
            </Link>
            {user && (
              <Link to="/dashboard">
                <Button variant="ghost" className="h-9 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[var(--board-muted)] hover:text-[var(--board-ink)]">
                  Dashboard
                </Button>
              </Link>
            )}
            <Link to="/post">
              <Button variant="ghost" className="h-9 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[var(--board-muted)] hover:text-[var(--board-ink)]">
                Post
              </Button>
            </Link>

            <div className="mx-2 h-4 w-px bg-[color:var(--board-line)]" />

            {user ? (
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="btn-outline-animated h-9 border-[color:var(--board-line-strong)] bg-transparent px-4 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[var(--board-muted)] hover:border-[color:rgba(219,84,97,0.4)] hover:text-[var(--board-accent)]"
              >
                <LogOut className="mr-1.5 h-3.5 w-3.5" />
                Sign out
              </Button>
            ) : (
              <Link to="/auth">
                <Button
                  variant="outline"
                  className="btn-outline-animated h-9 border-[color:var(--board-line-strong)] bg-transparent px-4 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[var(--board-muted)]"
                >
                  <LogIn className="mr-1.5 h-3.5 w-3.5" />
                  Sign in
                </Button>
              </Link>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
