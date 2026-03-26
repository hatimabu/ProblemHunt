import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { Navbar } from "./navbar";

const TYPEWRITER_PHRASES = ["solve it.", "ship it.", "scope it.", "finish it."];
const CITY_TOWERS = [
  { width: "9%", height: "34%", glow: "cyan", offset: "0%" },
  { width: "10%", height: "48%", glow: "pink", offset: "9%" },
  { width: "7%", height: "26%", glow: "cyan", offset: "20%" },
  { width: "11%", height: "58%", glow: "lime", offset: "28%" },
  { width: "9%", height: "40%", glow: "cyan", offset: "42%" },
  { width: "13%", height: "72%", glow: "pink", offset: "52%" },
  { width: "8%", height: "52%", glow: "cyan", offset: "67%" },
  { width: "12%", height: "44%", glow: "lime", offset: "76%" },
  { width: "8%", height: "30%", glow: "pink", offset: "90%" },
];

const ENTRY_POINTS = [
  {
    label: "Problem Hunters",
    description: "Bring the pain point, the blocker, or the backlog item that keeps surviving every sprint review.",
  },
  {
    label: "Solution Seekers",
    description: "Builders can hunt for briefs with budget, signal, and enough context to move fast without guessing.",
  },
  {
    label: "People Who Need It Done",
    description: "Not every post is a startup idea. Sometimes it is a task, a tool, or a technical rescue mission with a bounty attached.",
  },
];

const FLOW_STEPS = [
  {
    step: "01",
    title: "Post the brief",
    description: "Describe the problem, task, or request. Set the bounty and define what done actually means.",
  },
  {
    step: "02",
    title: "Let builders hunt",
    description: "Solution seekers respond with approach, timing, and proof that they can clear the work.",
  },
  {
    step: "03",
    title: "Fund the finish",
    description: "Choose the right response, track progress, and release the reward when the work ships.",
  },
];

function useTypewriter(phrases: string[], speed = 95, pause = 1800) {
  const [display, setDisplay] = useState("");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = phrases[phraseIdx];
    if (!deleting && charIdx <= current.length) {
      const timeout = setTimeout(() => setCharIdx((count) => count + 1), speed);
      return () => clearTimeout(timeout);
    }

    if (!deleting && charIdx > current.length) {
      const timeout = setTimeout(() => setDeleting(true), pause);
      return () => clearTimeout(timeout);
    }

    if (deleting && charIdx > 0) {
      const timeout = setTimeout(() => setCharIdx((count) => count - 1), speed / 2);
      return () => clearTimeout(timeout);
    }

    if (deleting && charIdx === 0) {
      setDeleting(false);
      setPhraseIdx((index) => (index + 1) % phrases.length);
    }
  }, [charIdx, deleting, pause, phraseIdx, phrases, speed]);

  useEffect(() => {
    setDisplay(phrases[phraseIdx].slice(0, charIdx));
  }, [charIdx, phraseIdx, phrases]);

  return display;
}

export function LandingPage() {
  const typewriter = useTypewriter(TYPEWRITER_PHRASES);

  return (
    <div className="neon-page landing-page min-h-screen text-[var(--neon-text)]">
      <Navbar />

      <main>
        <section className="neon-landing-hero relative isolate overflow-hidden border-b border-[color:var(--neon-line)]">
          <div className="neon-grid absolute inset-0" aria-hidden="true" />

          <div className="landing-cityscape" aria-hidden="true">
            <div className="landing-cityscape__rain" />
            <div className="landing-cityscape__glow landing-cityscape__glow--cyan" />
            <div className="landing-cityscape__glow landing-cityscape__glow--pink" />
            <div className="landing-cityscape__haze" />
            <div className="landing-cityscape__billboard">
              <span>REQUEST</span>
              <span>BUILD</span>
              <span>BOUNTY</span>
            </div>
            <div className="landing-cityscape__skyline">
              {CITY_TOWERS.map((tower) => (
                <div
                  key={`${tower.offset}-${tower.height}`}
                  className={`landing-cityscape__tower landing-cityscape__tower--${tower.glow}`}
                  style={{
                    left: tower.offset,
                    width: tower.width,
                    height: tower.height,
                  }}
                >
                  <span className="landing-cityscape__windows" />
                </div>
              ))}
            </div>
            <div className="landing-cityscape__street" />
            <div className="landing-cityscape__street-glow" />
          </div>

          <div className="relative z-10 mx-auto flex min-h-[calc(100svh-73px)] max-w-7xl items-center px-5 py-16 sm:px-8 lg:px-10">
            <div className="max-w-3xl">
              <p className="landing-wordmark font-cyber fade-in">Problem Hunt</p>

              <h1 className="max-w-2xl text-4xl font-semibold leading-[0.92] tracking-[-0.05em] md:text-6xl fade-in stagger-1">
                For people who need something done and builders who want the bounty.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--neon-muted)] fade-in stagger-2 md:text-xl">
                Post a stubborn problem, a scoped dev task, or a straight-up request. Problem hunters and solution seekers meet on one neon board to{" "}
                <span className="font-cyber text-[var(--neon-cyan)] typewriter-cursor">{typewriter}</span>
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row fade-in stagger-3">
                <Link to="/browse">
                  <Button
                    size="lg"
                    className="h-14 rounded-none border border-[color:rgba(89,243,255,0.4)] bg-[rgba(7,14,32,0.92)] px-8 text-[0.88rem] font-semibold uppercase tracking-[0.22em] text-[var(--neon-cyan)] shadow-[0_0_24px_rgba(89,243,255,0.12)] hover:bg-[rgba(89,243,255,0.12)]"
                  >
                    Enter The Board
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>

                <Link to="/post">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 rounded-none border-[color:rgba(255,79,216,0.34)] bg-[rgba(10,15,38,0.72)] px-8 text-[0.88rem] font-semibold uppercase tracking-[0.22em] text-[var(--neon-text)] hover:bg-[rgba(255,79,216,0.1)]"
                  >
                    Post A Bounty
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[color:var(--neon-line)]">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:px-10">
            <div className="max-w-2xl">
              <p className="neon-kicker">Who Shows Up</p>
              <h2 className="text-3xl font-semibold leading-none tracking-[-0.05em] md:text-5xl">
                One board, three reasons to use it.
              </h2>
              <p className="mt-4 text-base leading-7 text-[var(--neon-muted)] md:text-lg">
                Problem Hunt is not just for startup wishlists. It is also for teams, founders, and operators who need real work cleared by someone who can ship.
              </p>
            </div>

            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {ENTRY_POINTS.map((entry) => (
                <div key={entry.label} className="border-t border-[color:var(--neon-line)] pt-6">
                  <p className="font-cyber text-sm uppercase tracking-[0.28em] text-[var(--neon-pink)]">
                    {entry.label}
                  </p>
                  <p className="mt-4 text-base leading-8 text-[var(--neon-muted)]">
                    {entry.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-[color:var(--neon-line)]">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:px-10">
            <div className="max-w-2xl">
              <p className="neon-kicker">How It Works</p>
              <h2 className="text-3xl font-semibold leading-none tracking-[-0.05em] md:text-5xl">
                Problems, tasks, and requests all move through the same bounty loop.
              </h2>
            </div>

            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {FLOW_STEPS.map((item) => (
                <div key={item.step} className="neon-panel p-6">
                  <p className="font-cyber text-sm uppercase tracking-[0.28em] text-[var(--neon-cyan)]">
                    {item.step}
                  </p>
                  <h3 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-[var(--neon-text)]">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--neon-muted)] md:text-base">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:px-10">
            <div className="neon-panel overflow-hidden p-8 md:p-10">
              <p className="neon-kicker">Ready To Hunt</p>
              <h2 className="max-w-2xl text-3xl font-semibold leading-none tracking-[-0.05em] md:text-5xl">
                Put the work on the board and let the right builder lock on.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--neon-muted)] md:text-lg">
                Start with a hard problem, a one-off dev task, or the thing your team keeps delaying. The board is built for bounty-backed work that needs an owner.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link to="/post">
                  <Button
                    size="lg"
                    className="h-14 rounded-none border border-[color:rgba(255,79,216,0.38)] bg-[rgba(255,79,216,0.12)] px-8 text-[0.88rem] font-semibold uppercase tracking-[0.22em] text-[var(--neon-text)] hover:bg-[rgba(255,79,216,0.18)]"
                  >
                    Post The Brief
                  </Button>
                </Link>
                <Link to="/browse">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 rounded-none border-[color:rgba(89,243,255,0.34)] bg-transparent px-8 text-[0.88rem] font-semibold uppercase tracking-[0.22em] text-[var(--neon-cyan)] hover:bg-[rgba(89,243,255,0.1)]"
                  >
                    Browse The Market
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[color:var(--neon-line)]">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-cyber text-2xl tracking-[0.2em] uppercase text-[var(--neon-text)]">
                Problem Hunt
              </p>
              <p className="mt-2 max-w-md text-sm leading-6 text-[var(--neon-muted)]">
                A cyberpunk bounty board for problems, tasks, and technical requests that need a real owner.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-5 text-sm text-[var(--neon-muted)]">
              <Link to="/browse" className="transition-colors hover:text-[var(--neon-cyan)]">
                Browse
              </Link>
              <Link to="/leaderboard" className="transition-colors hover:text-[var(--neon-cyan)]">
                Leaderboard
              </Link>
              <Link to="/post" className="transition-colors hover:text-[var(--neon-cyan)]">
                Post Brief
              </Link>
            </div>
          </div>

          <p className="mt-8 text-xs uppercase tracking-[0.24em] text-[var(--neon-dim)]">
            Built with Supabase and Azure. © 2026 Problem Hunt.
          </p>
        </div>
      </footer>
    </div>
  );
}
