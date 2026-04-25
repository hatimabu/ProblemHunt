import { Link } from "react-router";
import { ArrowRight, CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { Navbar } from "./navbar";
import { SpaceVideoBackground } from "./space-video-background";
import { NetworkGraph } from "./network-graph";
import { LandingBackground } from "./landing-background";

const AUDIENCES = [
  {
    title: "For founders and operators",
    copy: "Put the real blocker on the board, set the reward, and stop carrying the task from sprint to sprint.",
  },
  {
    title: "For builders",
    copy: "Find briefs with enough context to price properly, reply with a plan, and get paid for doing the work.",
  },
  {
    title: "For teams in the middle",
    copy: "Use one marketplace for one-off technical rescues, scoped implementation, and open-ended problem solving.",
  },
];

const FLOW = [
  {
    step: "01",
    title: "Post what actually needs to move",
    copy: "Describe the problem, the scope, or the deliverable and attach a bounty that makes the work worth taking.",
  },
  {
    step: "02",
    title: "Review the builders who show up",
    copy: "Compare bids, timelines, experience, and links. Pick the person who sounds ready to ship instead of guess.",
  },
  {
    step: "03",
    title: "Track it through to payout",
    copy: "Accepted work, direct tips, and wallet-based payment all live in the same flow once the build starts moving.",
  },
];

const SIGNALS = [
  { type: "Paid task", title: "Refactor our Supabase auth recovery flow", budget: "2.4 SOL", detail: "Identity, session repair, rollout notes" },
  { type: "Problem brief", title: "Need a saner dashboard for proposal review", budget: "$650", detail: "Design system cleanup, better scanning" },
  { type: "Paid task", title: "Automate stale issue triage in GitHub", budget: "$900", detail: "Actions, labels, notification rules" },
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
                  <Button className="board-btn-primary board-btn-primary--metal h-12 border-0 bg-[var(--board-metal-accent)] px-6 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-metal-dark)] hover:bg-[var(--board-metal-light)]">
                    Browse live work
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/post">
                  <Button
                    variant="outline"
                    className="board-btn-secondary board-btn-secondary--metal h-12 border-[color:var(--board-metal-line)] bg-transparent/60 px-6 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-metal-muted)] backdrop-blur-sm hover:bg-[var(--board-metal-panel)] hover:text-[var(--board-metal-ink)]"
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
              <p className="board-kicker">Who It Serves</p>
              <h2 className="board-title mt-3">Built for people with work in front of them, not just ideas about work.</h2>
            </div>

            <div className="mt-12 grid gap-8 lg:grid-cols-3">
              {AUDIENCES.map((item, index) => (
                <div key={item.title} className={`border-t border-[color:var(--board-line)] pt-6 fade-in stagger-${Math.min(index + 1, 5)}`}>
                  <h3 className="board-subtitle text-[1.65rem]">{item.title}</h3>
                  <p className="board-copy mt-4 text-base">{item.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="board-section">
          <div className="board-container grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
            <div>
              <p className="board-kicker">How It Moves</p>
              <h2 className="board-title mt-3">One loop from post to payout.</h2>

              <div className="mt-10">
                {FLOW.map((item, index) => (
                  <div key={item.step} className={`board-row fade-in stagger-${Math.min(index + 1, 5)}`}>
                    <div className="grid gap-4 md:grid-cols-[100px_minmax(0,1fr)]">
                      <p className="board-eyebrow">{item.step}</p>
                      <div>
                        <h3 className="board-subtitle text-[1.8rem]">{item.title}</h3>
                        <p className="board-copy mt-3 text-base">{item.copy}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <aside className="board-panel board-panel--soft p-6 md:p-8">
              <p className="board-kicker">What Good Looks Like</p>
              <div className="mt-6 space-y-5">
                {[
                  "Enough context to price the work properly",
                  "A clear deadline or decision window",
                  "Builder responses that sound operational, not speculative",
                  "One place to track accepted work and payment",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-1 h-4 w-4 text-[var(--board-accent)]" />
                    <p className="text-sm leading-7 text-[var(--board-muted)]">{item}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="board-section">
          <div className="board-container">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <p className="board-kicker">Live Signal</p>
                <h2 className="board-title mt-3">The marketplace should scan like a board, not a dashboard mosaic.</h2>
              </div>
              <Link
                to="/browse"
                className="inline-flex items-center gap-2 font-mono-alt text-[0.74rem] font-semibold uppercase tracking-[0.18em] text-[var(--board-accent)]"
              >
                Open marketplace
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-10 border-t border-[color:var(--board-line)]">
              {SIGNALS.map((signal) => (
                <div key={signal.title} className="board-row">
                  <div className="grid gap-5 md:grid-cols-[160px_minmax(0,1fr)_140px] md:items-start">
                    <div className="board-eyebrow">{signal.type}</div>
                    <div>
                      <h3 className="board-subtitle text-[1.9rem]">{signal.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-[var(--board-muted)]">{signal.detail}</p>
                    </div>
                    <div className="md:text-right">
                      <p className="board-eyebrow">Budget</p>
                      <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em] text-[var(--board-ink)]">
                        {signal.budget}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
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
              <Link to="/browse">
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
              A clearer market for technical work, scoped tasks, and bounty-backed problem solving.
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
