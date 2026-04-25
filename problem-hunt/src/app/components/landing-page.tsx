import { Link } from "react-router";
import { ArrowRight, Globe, Shield, Zap, Wallet } from "lucide-react";
import { Button } from "./ui/button";
import { Navbar } from "./navbar";
import { SpaceVideoBackground } from "./space-video-background";
import { NetworkGraph } from "./network-graph";
import { LandingBackground } from "./landing-background";

const DECENTRALIZED_FEATURES = [
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

export function LandingPage() {
  return (
    <div className="board-app">
      <LandingBackground />
      <Navbar />

      <main>
        <section className="board-hero board-hero--video">
          <SpaceVideoBackground />
          <NetworkGraph />

          <div className="board-container board-hero__grid board-hero__grid--video">
            <div className="max-w-3xl">
              <div className="board-hero__eyebrow fade-in stagger-1">
                <span className="board-hero__status-pip" />
                SYSTEM OPERATIONAL
              </div>
              <h1 className="board-display board-display--metal fade-in stagger-1">
                Put the work on the board.
              </h1>
              <h2 className="board-title board-title--metal mt-5 fade-in stagger-2">
                Find a builder who can actually close it.
              </h2>
              <p className="board-copy board-copy--metal mt-6 fade-in stagger-3">
                Problem Hunt is a bounty marketplace for technical work that keeps getting delayed. Post a brief, price the ask, review serious responses, and move from backlog to shipped without losing the thread.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row fade-in stagger-4">
                <Link to="/browse">
                  <Button className="board-btn-primary board-btn-primary--metal h-12 border-0 bg-[var(--board-metal-accent)] px-6 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-metal-dark)] transition-all hover:bg-[var(--board-metal-light)] hover:shadow-[0_0_20px_rgba(200,205,208,0.35)] hover:scale-[1.02]">
                    Browse live work
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/post">
                  <Button
                    variant="outline"
                    className="board-btn-secondary board-btn-secondary--metal h-12 border-[color:var(--board-metal-line)] bg-transparent/60 px-6 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-metal-muted)] backdrop-blur-sm transition-all hover:bg-[var(--board-metal-panel)] hover:text-[var(--board-metal-ink)] hover:shadow-[0_0_20px_rgba(200,205,208,0.2)] hover:scale-[1.02]"
                  >
                    Post a brief
                  </Button>
                </Link>
              </div>

              <div className="mt-10 grid gap-5 border-t border-[color:var(--board-metal-line)] pt-6 sm:grid-cols-3 fade-in stagger-5">
                <div className="board-stat board-stat--metal">
                  <div className="board-stat__value board-stat__value--metal">One</div>
                  <div className="board-stat__label board-stat__label--metal">Place for briefs, tasks, and bounties</div>
                </div>
                <div className="board-stat board-stat--metal">
                  <div className="board-stat__value board-stat__value--metal">Direct</div>
                  <div className="board-stat__label board-stat__label--metal">Wallet-aware payout flow</div>
                </div>
                <div className="board-stat board-stat--metal">
                  <div className="board-stat__value board-stat__value--metal">Clear</div>
                  <div className="board-stat__label board-stat__label--metal">Signals, bids, and ownership</div>
                </div>
              </div>
            </div>

            <div className="board-hero__poster board-hero__poster--metal fade-in stagger-2">
              <div className="board-hero__status">
                <span className="board-hero__status-dot" />
                telemetry active
              </div>

              {/* 9 imploding/exploding orbits around a central dot */}
              <div className="absolute left-1/2 top-4 aspect-square h-[280px] w-[280px] -translate-x-1/2 z-[5] md:h-[380px] md:w-[380px] xl:h-[460px] xl:w-[460px]">
                {/* Center dot (planet) */}
                <div className="absolute left-1/2 top-1/2 z-10 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_28px_rgba(255,255,255,0.95)] md:h-8 md:w-8 md:shadow-[0_0_44px_rgba(255,255,255,0.95)] xl:h-9 xl:w-9 xl:shadow-[0_0_52px_rgba(255,255,255,0.95)]" />
                {/* 9 orbital rings */}
                {Array.from({ length: 9 }).map((_, i) => {
                  const pct = [22, 30, 38, 46, 54, 62, 70, 80, 90][i];
                  return (
                    <div
                      key={i}
                      className="orbit-ring absolute left-1/2 top-1/2 rounded-full"
                      style={{
                        width: `${pct}%`,
                        height: `${pct}%`,
                        marginLeft: `-${pct / 2}%`,
                        marginTop: `-${pct / 2}%`,
                        border: '4px solid rgba(255, 255, 255, 0.28)',
                        animation: 'orbitImplodeExplode 3s ease-in-out infinite',
                        animationDelay: `${i * 0.12}s`,
                      }}
                    />
                  );
                })}
              </div>

              <div className="board-hero__panel z-[10]">
                <p className="board-ticket__label board-ticket__label--metal">Mission Control</p>
                <p className="board-ticket__title board-ticket__title--metal">Map the blocker. Route the fix.</p>
                <p className="board-ticket__meta board-ticket__meta--metal">live network / payout ready / orbital sync</p>
              </div>
            </div>
          </div>
        </section>

        <section className="board-section">
          <div className="board-container">
            <div className="max-w-2xl">
              <p className="board-kicker">Decentralized</p>
              <h2 className="board-title mt-3">No gatekeepers. Just work and wallets.</h2>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {DECENTRALIZED_FEATURES.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className={`feature-box-navy rounded-2xl border p-6 fade-in stagger-${Math.min(index + 1, 5)}`}
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

        <section className="board-section">
          <div className="board-container board-panel p-8 md:p-10">
            <p className="board-kicker">Ready</p>
            <h2 className="board-title mt-3 max-w-3xl">If the task keeps surviving the sprint, it probably belongs on the board.</h2>
            <p className="board-copy mt-5">
              Start with the thing your team keeps pushing forward, the workflow nobody owns, or the scoped implementation that needs a real builder behind it.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link to="/post">
                <Button className="board-btn-primary h-12 border-0 bg-[var(--board-accent)] px-6 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-[var(--color-accent-hover)]">
                  Post a brief
                </Button>
              </Link>
              <Link to="/leaderboard">
                <Button
                  variant="outline"
                  className="board-btn-secondary h-12 border-[color:var(--board-line-strong)] bg-transparent px-6 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-muted)] hover:bg-[var(--board-panel-strong)] hover:text-[var(--board-ink)]"
                >
                  Browse builders
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[color:var(--board-line)]">
        <div className="board-container flex flex-col gap-5 py-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="board-eyebrow">Problem Hunt</p>
            <p className="mt-2 text-sm text-[var(--board-muted)]">
              A decentralized marketplace for technical work, scoped tasks, and bounty-backed problem solving.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-[var(--board-muted)]">
            <Link to="/browse" className="hover:text-[var(--board-accent)]">Browse</Link>
            <Link to="/leaderboard" className="hover:text-[var(--board-accent)]">Leaderboard</Link>
            <Link to="/dashboard" className="hover:text-[var(--board-accent)]">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
