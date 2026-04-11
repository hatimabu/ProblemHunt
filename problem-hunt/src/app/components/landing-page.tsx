import { Link } from "react-router";
import { ArrowRight, CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { Navbar } from "./navbar";

const WEB_NODES = [
  { label: "Trace", left: "14%", top: "18%" },
  { label: "Patch", left: "72%", top: "17%" },
  { label: "Scope", left: "85%", top: "46%" },
  { label: "Deploy", left: "71%", top: "79%" },
  { label: "Resolve", left: "28%", top: "83%" },
  { label: "Signal", left: "11%", top: "55%" },
];

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
      <Navbar />

      <main>
        <section className="board-hero">
          <div className="board-container board-hero__grid">
            <div className="max-w-3xl">
              <p className="board-kicker fade-in">Problem Hunt</p>
              <h1 className="board-display fade-in stagger-1">
                Put the work on the board.
              </h1>
              <h2 className="board-title mt-5 fade-in stagger-2">
                Find a builder who can actually close it.
              </h2>
              <p className="board-copy mt-6 fade-in stagger-3">
                Problem Hunt is a bounty marketplace for technical work that keeps getting delayed. Post a brief, price the ask, review serious responses, and move from backlog to shipped without losing the thread.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row fade-in stagger-4">
                <Link to="/browse">
                  <Button className="board-btn-primary h-12 border-0 bg-[var(--board-accent)] px-6 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-[var(--color-accent-hover)]">
                    Browse live work
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/post">
                  <Button
                    variant="outline"
                    className="board-btn-secondary h-12 border-[color:var(--board-line-strong)] bg-transparent px-6 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-muted)] hover:bg-[var(--board-panel-strong)] hover:text-[var(--board-ink)]"
                  >
                    Post a brief
                  </Button>
                </Link>
              </div>

              <div className="mt-10 grid gap-5 border-t border-[color:var(--board-line)] pt-6 sm:grid-cols-3 fade-in stagger-5">
                <div className="board-stat">
                  <div className="board-stat__value">One</div>
                  <div className="board-stat__label">Place for briefs, tasks, and bounties</div>
                </div>
                <div className="board-stat">
                  <div className="board-stat__value">Direct</div>
                  <div className="board-stat__label">Wallet-aware payout flow</div>
                </div>
                <div className="board-stat">
                  <div className="board-stat__value">Clear</div>
                  <div className="board-stat__label">Signals, bids, and ownership</div>
                </div>
              </div>
            </div>

            <div className="board-hero__poster fade-in stagger-2">
              <div className="board-cyber-web" aria-hidden="true">
                <div className="board-cyber-web__halo" />
                <div className="board-cyber-web__status">
                  <span className="board-cyber-web__status-dot" />
                  system routing active
                </div>

                <svg viewBox="0 0 520 520" className="board-cyber-web__svg">
                  <defs>
                    <radialGradient id="webGlow" cx="50%" cy="50%" r="60%">
                      <stop offset="0%" stopColor="rgba(14,226,255,0.38)" />
                      <stop offset="45%" stopColor="rgba(242,139,148,0.18)" />
                      <stop offset="100%" stopColor="rgba(14,226,255,0)" />
                    </radialGradient>
                  </defs>
                  <circle cx="260" cy="260" r="160" className="board-cyber-web__ring board-cyber-web__ring--wide" />
                  <circle cx="260" cy="260" r="112" className="board-cyber-web__ring" />
                  <circle cx="260" cy="260" r="62" className="board-cyber-web__ring" />
                  <path d="M260 260 84 100" className="board-cyber-web__line" />
                  <path d="M260 260 356 86" className="board-cyber-web__line" />
                  <path d="M260 260 444 220" className="board-cyber-web__line" />
                  <path d="M260 260 394 422" className="board-cyber-web__line" />
                  <path d="M260 260 170 442" className="board-cyber-web__line" />
                  <path d="M260 260 70 300" className="board-cyber-web__line" />
                  <path d="M84 100 C170 138, 216 172, 260 260" className="board-cyber-web__arc" />
                  <path d="M356 86 C360 156, 316 206, 260 260" className="board-cyber-web__arc" />
                  <path d="M444 220 C382 226, 322 236, 260 260" className="board-cyber-web__arc" />
                  <path d="M394 422 C356 360, 316 306, 260 260" className="board-cyber-web__arc" />
                  <path d="M170 442 C196 370, 222 316, 260 260" className="board-cyber-web__arc" />
                  <path d="M70 300 C132 286, 198 274, 260 260" className="board-cyber-web__arc" />
                  <circle cx="260" cy="260" r="28" className="board-cyber-web__core" />
                  <circle cx="260" cy="260" r="82" fill="url(#webGlow)" />
                  <circle cx="84" cy="100" r="7" className="board-cyber-web__node" />
                  <circle cx="356" cy="86" r="7" className="board-cyber-web__node" />
                  <circle cx="444" cy="220" r="7" className="board-cyber-web__node" />
                  <circle cx="394" cy="422" r="7" className="board-cyber-web__node" />
                  <circle cx="170" cy="442" r="7" className="board-cyber-web__node" />
                  <circle cx="70" cy="300" r="7" className="board-cyber-web__node" />
                </svg>

                <div className="board-cyber-web__panel">
                  <p className="board-ticket__label">Future Repair Mesh</p>
                  <p className="board-ticket__title">Map the blocker. Route the fix.</p>
                  <p className="board-ticket__meta">cyber board / live network / payout ready</p>
                </div>

                {WEB_NODES.map((node) => (
                  <div
                    key={node.label}
                    className="board-cyber-web__tag"
                    style={{ left: node.left, top: node.top }}
                  >
                    {node.label}
                  </div>
                ))}
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
