import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { Navbar } from "./navbar";
import { supabase } from "../../../lib/supabaseClient";
import { API_ENDPOINTS } from "../../lib/api-config";

interface Problem {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: string;
  budgetValue: number;
  upvotes: number;
  proposals: number;
  author: string;
  createdAt: string;
}

const CATEGORY_ACCENTS: Record<string, string> = {
  "AI/ML": "text-[var(--ph-teal)]",
  "Web3": "text-[var(--ph-sky)]",
  "Finance": "text-[var(--ph-amber)]",
  "Governance": "text-[var(--ph-clay)]",
  "Trading": "text-[var(--ph-amber)]",
  "Infrastructure": "text-[var(--ph-ink)]",
};

const TYPEWRITER_PHRASES = ["solve it.", "ship it.", "launch it.", "prove it."];

const FALLBACK_PROBLEMS: Problem[] = [
  {
    id: "fallback-governance",
    title: "Create a lightweight voting tool for local DAO grant reviews",
    description: "Need a transparent workflow for shortlisting proposals, capturing reviewer comments, and publishing final vote records.",
    category: "Governance",
    budget: "$3,500",
    budgetValue: 3500,
    upvotes: 24,
    proposals: 6,
    author: "Problem Hunt",
    createdAt: "2026-03-20T00:00:00Z",
  },
  {
    id: "fallback-ai",
    title: "Turn customer calls into product-ready bug briefs with source clips",
    description: "Looking for a builder who can summarize recurring issues, attach the right timestamps, and draft an actionable bug packet.",
    category: "AI/ML",
    budget: "$5,200",
    budgetValue: 5200,
    upvotes: 31,
    proposals: 8,
    author: "Problem Hunt",
    createdAt: "2026-03-21T00:00:00Z",
  },
  {
    id: "fallback-infra",
    title: "Ship a dead-simple deploy preview system for a growing open source team",
    description: "We need ephemeral environments, reviewer links, and rollback notes without adding a full platform engineering sprint.",
    category: "Infrastructure",
    budget: "$6,000",
    budgetValue: 6000,
    upvotes: 19,
    proposals: 5,
    author: "Problem Hunt",
    createdAt: "2026-03-22T00:00:00Z",
  },
  {
    id: "fallback-finance",
    title: "Build a payout dashboard for freelance collectives with milestone releases",
    description: "Need milestone-based release flows, simple reporting, and a way to track what has cleared versus what is pending.",
    category: "Finance",
    budget: "$4,400",
    budgetValue: 4400,
    upvotes: 27,
    proposals: 7,
    author: "Problem Hunt",
    createdAt: "2026-03-23T00:00:00Z",
  },
  {
    id: "fallback-web3",
    title: "Prototype a wallet-first onboarding path that explains gas in plain English",
    description: "Want a clearer first-run experience for new users who understand the product but not the transaction mechanics.",
    category: "Web3",
    budget: "$2,800",
    budgetValue: 2800,
    upvotes: 17,
    proposals: 4,
    author: "Problem Hunt",
    createdAt: "2026-03-24T00:00:00Z",
  },
];

const FLOW_STEPS = [
  {
    number: "01",
    title: "Write the brief",
    description: "Describe the pain, define success, and set the budget before the solution exists.",
  },
  {
    number: "02",
    title: "Let builders respond",
    description: "Builders compete with approach, timing, and proof instead of waiting for a vague idea to mature.",
  },
  {
    number: "03",
    title: "Back what ships",
    description: "Choose the response that earns trust and move the bounty toward delivery.",
  },
];

const BUILDER_POINTS = [
  {
    label: "Demand signal",
    copy: "Every brief starts with a person naming the friction and attaching real willingness to pay.",
  },
  {
    label: "Sharper scope",
    copy: "The work begins with constraints, acceptance criteria, and budget instead of a blank roadmap.",
  },
  {
    label: "Merit first",
    copy: "Builders stand out with the plan they can ship, not with who had the earliest distribution.",
  },
  {
    label: "Progress rewards",
    copy: "Tips and bounties create room for incremental trust while the final solution gets built.",
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

function formatBudget(problem: Problem) {
  if (problem.budgetValue) {
    return `$${problem.budgetValue.toLocaleString()}`;
  }

  return problem.budget || "$0";
}

function getProblemLink(problem: Problem) {
  return problem.id.startsWith("fallback-") ? "/browse" : `/problem/${problem.id}`;
}

export function LandingPage() {
  const typewriter = useTypewriter(TYPEWRITER_PHRASES);
  const [trending, setTrending] = useState<Problem[]>([]);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await fetch(`${API_ENDPOINTS.PROBLEMS}?sortBy=upvotes&limit=6`, {
          headers,
        });

        if (!response.ok) {
          throw new Error(`API Error ${response.status}: ${await response.text()}`);
        }

        const data = await response.json();
        if (cancelled) {
          return;
        }

        const problems = Array.isArray(data.problems) ? data.problems : [];
        setTrending(problems.slice(0, 6));
      } catch {
        // Keep the landing page resilient with fallback content.
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, []);

  const marketProblems = trending.length > 0 ? trending : FALLBACK_PROBLEMS;
  const heroProblems = marketProblems.slice(0, 4);

  return (
    <div className="landing-page min-h-screen bg-[var(--ph-sand)] text-[var(--ph-ink)]">
      <Navbar />

      <main>
        <section className="landing-hero relative isolate overflow-hidden border-b border-[color:var(--ph-line)]">
          <div className="landing-hero__atmosphere absolute inset-0" aria-hidden="true" />

          <div className="landing-hero__plane" aria-hidden="true">
            {[0, 1, 2].map((lane) => (
              <div
                key={lane}
                className={`landing-problem-lane ${lane % 2 === 1 ? "landing-problem-lane--reverse" : ""}`}
              >
                {[...heroProblems, ...heroProblems, ...heroProblems].map((problem, index) => (
                  <article key={`${lane}-${problem.id}-${index}`} className="landing-problem-strip">
                    <p className="landing-problem-strip__budget">{formatBudget(problem)}</p>
                    <div className="min-w-0">
                      <p className="landing-problem-strip__category">{problem.category}</p>
                      <p className="landing-problem-strip__title">{problem.title}</p>
                    </div>
                  </article>
                ))}
              </div>
            ))}
          </div>

          <div className="relative z-10 mx-auto flex min-h-[calc(100svh-73px)] max-w-7xl items-center px-5 pb-16 pt-16 sm:px-8 lg:px-10">
            <div className="max-w-3xl">
              <p className="landing-wordmark fade-in">Problem Hunt</p>

              <h1 className="font-display max-w-2xl text-4xl leading-[0.95] tracking-[-0.05em] md:text-6xl fade-in stagger-1">
                Post the demand before anyone writes the roadmap.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--ph-muted)] fade-in stagger-2 md:text-xl">
                The reverse Product Hunt where serious briefs arrive with context, budget, and room for builders to{" "}
                <span className="font-display font-semibold text-[var(--ph-sky)] typewriter-cursor">
                  {typewriter}
                </span>
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row fade-in stagger-3">
                <Link to="/browse">
                  <Button
                    size="lg"
                    className="h-14 rounded-none border-0 bg-[var(--ph-ink)] px-8 text-[0.88rem] font-semibold uppercase tracking-[0.18em] text-[var(--ph-cream)] hover:bg-[var(--ph-sky)]"
                  >
                    Browse Live Briefs
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>

                <Link to="/post">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 rounded-none border-[color:var(--ph-line)] bg-white/30 px-8 text-[0.88rem] font-semibold uppercase tracking-[0.18em] text-[var(--ph-ink)] hover:bg-white/65"
                  >
                    Post a Problem
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[color:var(--ph-line)] bg-white/40">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:px-10">
            <div className="max-w-2xl">
              <p className="section-label">Demand On The Board</p>
              <h2 className="font-display text-3xl leading-none tracking-[-0.05em] md:text-5xl">
                Problems with budget, not just curiosity.
              </h2>
              <p className="mt-4 text-base leading-7 text-[var(--ph-muted)] md:text-lg">
                Browse the briefs people are already using to signal what deserves to be built next.
              </p>
            </div>

            <div className="mt-12">
              {marketProblems.map((problem) => (
                <Link
                  key={problem.id}
                  to={getProblemLink(problem)}
                  className="group grid gap-4 border-b border-[color:var(--ph-line)] py-6 lg:grid-cols-[156px_minmax(0,1fr)_144px] lg:items-center"
                >
                  <p className="font-display text-3xl tracking-[-0.05em] text-[var(--ph-ink)]">
                    {formatBudget(problem)}
                  </p>

                  <div className="min-w-0">
                    <p
                      className={`font-mono-alt text-[0.72rem] font-semibold uppercase tracking-[0.3em] ${
                        CATEGORY_ACCENTS[problem.category] || "text-[var(--ph-sky)]"
                      }`}
                    >
                      {problem.category}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--ph-ink)] transition-colors group-hover:text-[var(--ph-sky)]">
                      {problem.title}
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ph-muted)] line-clamp-2">
                      {problem.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 text-sm text-[var(--ph-muted)] lg:justify-end lg:gap-6">
                    <span>{problem.upvotes} upvotes</span>
                    <span>{problem.proposals} proposals</span>
                    <ArrowRight className="w-4 h-4 text-[var(--ph-sky)] transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-[color:var(--ph-line)] bg-[var(--ph-cream)]">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:px-10">
            <div className="max-w-2xl">
              <p className="section-label">How It Works</p>
              <h2 className="font-display text-3xl leading-none tracking-[-0.05em] md:text-5xl">
                One clear flow from problem to payout.
              </h2>
              <p className="mt-4 text-base leading-7 text-[var(--ph-muted)] md:text-lg">
                Every section of the experience points back to one thing: helping a real problem find the builder who can ship it.
              </p>
            </div>

            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {FLOW_STEPS.map((step) => (
                <div key={step.number} className="border-t border-[color:var(--ph-line)] pt-6">
                  <p className="font-mono-alt text-sm font-semibold uppercase tracking-[0.3em] text-[var(--ph-sky)]">
                    {step.number}
                  </p>
                  <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[var(--ph-ink)]">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--ph-muted)] md:text-base">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[var(--ph-sand)]">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:px-10 lg:py-24">
            <div className="max-w-2xl">
              <p className="section-label">For Builders</p>
              <h2 className="font-display text-3xl leading-none tracking-[-0.05em] md:text-5xl">
                Spend more time shipping and less time guessing what matters.
              </h2>
              <p className="mt-5 text-base leading-8 text-[var(--ph-muted)] md:text-lg">
                Problem Hunt puts the brief, the budget, and the buying intent in the same place so builders can compete on clarity and execution.
              </p>

              <Link to="/browse" className="inline-flex">
                <Button
                  size="lg"
                  className="mt-10 h-14 rounded-none border-0 bg-[var(--ph-sky)] px-8 text-[0.88rem] font-semibold uppercase tracking-[0.18em] text-white hover:bg-[var(--ph-ink)]"
                >
                  See Open Problems
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            <ul className="border-t border-[color:var(--ph-line)]">
              {BUILDER_POINTS.map((point) => (
                <li key={point.label} className="border-b border-[color:var(--ph-line)] py-5">
                  <p className="font-mono-alt text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-[var(--ph-sky)]">
                    {point.label}
                  </p>
                  <p className="mt-3 text-base leading-8 text-[var(--ph-muted)]">{point.copy}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-[color:var(--ph-line)] bg-[var(--ph-cream)]">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-display text-2xl tracking-[-0.05em] text-[var(--ph-ink)]">
                Problem Hunt
              </p>
              <p className="mt-2 max-w-md text-sm leading-6 text-[var(--ph-muted)]">
                A reverse Product Hunt for problems worth funding and builders worth backing.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-5 text-sm text-[var(--ph-muted)]">
              <Link to="/browse" className="transition-colors hover:text-[var(--ph-ink)]">
                Browse
              </Link>
              <Link to="/leaderboard" className="transition-colors hover:text-[var(--ph-ink)]">
                Leaderboard
              </Link>
              <Link to="/post" className="transition-colors hover:text-[var(--ph-ink)]">
                Post Problem
              </Link>
            </div>
          </div>

          <p className="mt-8 text-xs uppercase tracking-[0.24em] text-[var(--ph-soft)]">
            Built with Supabase and Azure. © 2026 Problem Hunt.
          </p>
        </div>
      </footer>
    </div>
  );
}
