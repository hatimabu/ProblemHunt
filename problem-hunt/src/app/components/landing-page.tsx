import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import { Rocket, Zap, TrendingUp, ArrowRight, Star, Users, DollarSign, CheckCircle, Github, Twitter } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Navbar } from "./navbar";
import { authenticatedFetch, handleResponse } from "../../lib/auth-helper";

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

const CATEGORY_COLORS: Record<string, string> = {
  "AI/ML": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "Web3": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Finance": "bg-green-500/20 text-green-300 border-green-500/30",
  "Governance": "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "Trading": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "Infrastructure": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
};

const TYPEWRITER_PHRASES = ["fund it.", "build it.", "launch it.", "solve it."];

function useTypewriter(phrases: string[], speed = 90, pause = 1800) {
  const [display, setDisplay] = useState("");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = phrases[phraseIdx];
    if (!deleting && charIdx <= current.length) {
      const t = setTimeout(() => setCharIdx((c) => c + 1), speed);
      return () => clearTimeout(t);
    }
    if (!deleting && charIdx > current.length) {
      const t = setTimeout(() => setDeleting(true), pause);
      return () => clearTimeout(t);
    }
    if (deleting && charIdx > 0) {
      const t = setTimeout(() => setCharIdx((c) => c - 1), speed / 2);
      return () => clearTimeout(t);
    }
    if (deleting && charIdx === 0) {
      setDeleting(false);
      setPhraseIdx((i) => (i + 1) % phrases.length);
    }
  }, [charIdx, deleting, phraseIdx, phrases, speed, pause]);

  useEffect(() => {
    setDisplay(phrases[phraseIdx].slice(0, charIdx));
  }, [charIdx, phraseIdx, phrases]);

  return display;
}

function useCountUp(target: number, duration = 1500) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = Date.now();
          const tick = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            setCount(Math.floor(progress * target));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

function StatCounter({ value, label }: { value: number; label: string }) {
  const { count, ref } = useCountUp(value);
  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent count-animate">
        {count.toLocaleString()}+
      </div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
    </div>
  );
}

export function LandingPage() {
  const typewriter = useTypewriter(TYPEWRITER_PHRASES);
  const [trending, setTrending] = useState<Problem[]>([]);
  const [stats, setStats] = useState({ problems: 0, builders: 0, bounties: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await authenticatedFetch("/api/problems?sortBy=upvotes&limit=6", { method: "GET" });
        const data = await handleResponse(res);
        const problems: Problem[] = Array.isArray(data.problems) ? data.problems : [];
        setTrending(problems.slice(0, 6));
        const total = problems.reduce((s, p) => s + (p.budgetValue || 0), 0);
        setStats({
          problems: data.total || problems.length,
          builders: Math.max(problems.length * 3, 12),
          bounties: total,
        });
      } catch {
        // silently fail
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Animated background orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="orb-float absolute top-1/4 left-1/5 w-[500px] h-[500px] bg-cyan-500/8 rounded-full blur-3xl" />
          <div className="orb-float-slow absolute bottom-1/3 right-1/5 w-[400px] h-[400px] bg-blue-500/8 rounded-full blur-3xl" />
          <div className="mesh-bg absolute top-0 left-0 right-0 h-full bg-gradient-to-b from-cyan-500/3 via-transparent to-transparent" />
        </div>

        <div className="container mx-auto px-4 pt-24 pb-16 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-full fade-in">
              <Star className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium text-cyan-400">
                Reverse Product Hunt — Real Problems, Real Builders
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight fade-in stagger-1">
              <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                Signal demand.
              </span>
              <br />
              <span className="text-gradient-animated">
                Get solutions built.
              </span>
            </h1>

            {/* Typewriter line */}
            <p className="text-2xl md:text-3xl font-semibold text-gray-300 mb-6 min-h-[2.5rem] fade-in stagger-2">
              Post a problem.{" "}
              <span className="text-cyan-400 typewriter-cursor">{typewriter}</span>
            </p>

            <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto fade-in stagger-3">
              The marketplace where people post problems they'd pay to solve — and builders compete to build the solution.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center fade-in stagger-4">
              <Link to="/browse">
                <Button
                  size="lg"
                  className="btn-shimmer btn-glow bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 text-lg px-8 font-semibold shadow-lg shadow-cyan-500/25"
                >
                  <Rocket className="w-5 h-5 mr-2" />
                  Browse Problems
                </Button>
              </Link>
              <Link to="/post">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-gray-600 hover:border-cyan-500/60 hover:bg-cyan-500/10 text-white text-lg px-8 font-semibold transition-all"
                >
                  Post a Problem
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Live stats bar */}
            {(stats.problems > 0 || stats.bounties > 0) && (
              <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-400 fade-in stagger-5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span><strong className="text-white">{stats.problems}</strong> Problems Posted</span>
                </div>
                <span className="hidden sm:block text-gray-700">·</span>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span><strong className="text-white">{stats.builders}</strong> Builders</span>
                </div>
                {stats.bounties > 0 && (
                  <>
                    <span className="hidden sm:block text-gray-700">·</span>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-400" />
                      <span><strong className="text-white">${stats.bounties.toLocaleString()}</strong> Total Bounties</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Trending Problems */}
      {trending.length > 0 && (
        <section className="py-20 border-t border-gray-800/50">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                🔥 Trending Right Now
              </h2>
              <Link to="/browse" className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors">
                View All
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none">
              {trending.map((problem, i) => (
                <Link
                  key={problem.id}
                  to={`/problem/${problem.id}`}
                  className={`snap-start shrink-0 w-72 fade-in stagger-${Math.min(i + 1, 5)}`}
                >
                  <div className="card-hover h-full bg-gray-900/60 border border-gray-800 hover:border-cyan-500/40 rounded-2xl p-5 backdrop-blur-sm group">
                    <div className="flex items-start justify-between mb-3">
                      <Badge className={`text-xs ${CATEGORY_COLORS[problem.category] || "bg-gray-500/20 text-gray-300 border-gray-500/30"}`}>
                        {problem.category}
                      </Badge>
                      <span className="text-cyan-400 font-bold text-sm">
                        ${problem.budgetValue?.toLocaleString() || problem.budget}
                      </span>
                    </div>
                    <h3 className="text-white font-semibold mb-2 line-clamp-2 group-hover:text-cyan-400 transition-colors">
                      {problem.title}
                    </h3>
                    <p className="text-gray-400 text-sm line-clamp-2 mb-4">
                      {problem.description}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-auto">
                      <span>⬆ {problem.upvotes}</span>
                      <span>💬 {problem.proposals}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="py-24 border-t border-gray-800/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              How It Works
            </h2>
            <p className="text-gray-400 text-lg">Simple, transparent, decentralized</p>
          </div>

          <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8 relative">
            {/* connector line */}
            <div className="hidden md:block absolute top-10 left-1/6 right-1/6 h-px bg-gradient-to-r from-cyan-500/30 via-blue-500/30 to-indigo-500/30" />

            {[
              {
                step: "1",
                icon: "🎯",
                title: "Post a Problem",
                desc: "Define your problem, set a bounty amount, and specify what success looks like.",
                color: "from-cyan-500/20 to-blue-500/20 border-cyan-500/20",
                num: "text-cyan-400",
              },
              {
                step: "2",
                icon: "⚡",
                title: "Builders Compete",
                desc: "Skilled builders submit proposals with timelines, approach, and cost estimates.",
                color: "from-blue-500/20 to-indigo-500/20 border-blue-500/20",
                num: "text-blue-400",
              },
              {
                step: "3",
                icon: "💰",
                title: "Get Paid",
                desc: "Accept the best proposal. Tip builders who make great progress. Pay on success.",
                color: "from-indigo-500/20 to-purple-500/20 border-indigo-500/20",
                num: "text-indigo-400",
              },
            ].map(({ step, icon, title, desc, color, num }) => (
              <div key={step} className="text-center group">
                <div className={`w-20 h-20 bg-gradient-to-br ${color} rounded-2xl flex flex-col items-center justify-center mx-auto mb-5 border card-hover`}>
                  <span className="text-2xl mb-1">{icon}</span>
                  <span className={`text-sm font-bold ${num}`}>Step {step}</span>
                </div>
                <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
                <p className="text-gray-400 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Builders CTA — split section with stat counters */}
      <section className="py-24 border-t border-gray-800/50">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            {/* Stats side */}
            <div>
              <h2 className="text-4xl font-bold mb-6 text-white">
                Find validated problems.<br />
                <span className="text-gradient-animated">Build what people want.</span>
              </h2>
              <p className="text-gray-400 mb-10">
                Stop guessing what to build. Every problem here has a real person willing to pay for a solution.
              </p>
              <div className="grid grid-cols-3 gap-6">
                <StatCounter value={stats.problems || 50} label="Problems Posted" />
                <StatCounter value={stats.builders || 120} label="Active Builders" />
                <StatCounter value={stats.bounties || 25000} label="$ in Bounties" />
              </div>
            </div>

            {/* CTA card */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-3xl blur-2xl" />
              <div className="relative bg-gray-900/60 backdrop-blur-sm border border-gray-700/50 rounded-3xl p-8">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center mb-6 border border-cyan-500/20">
                  <TrendingUp className="w-7 h-7 text-cyan-400" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white">For Builders</h3>
                <ul className="space-y-3 mb-8">
                  {[
                    "Browse problems with real market demand",
                    "Submit proposals and compete on merit",
                    "Receive crypto tips for progress updates",
                    "Earn bounties for accepted solutions",
                    "Build your on-chain reputation",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link to="/browse">
                  <Button className="btn-shimmer w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 font-semibold">
                    <Zap className="w-4 h-4 mr-2" />
                    Start Building
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center logo-glow">
                <span className="text-white font-bold text-xs">PH</span>
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                problemhunt.cc
              </span>
            </div>

            <div className="flex items-center gap-6 text-sm text-gray-400">
              <Link to="/browse" className="hover:text-white transition-colors">Browse</Link>
              <Link to="/leaderboard" className="hover:text-white transition-colors">Leaderboard</Link>
              <Link to="/post" className="hover:text-white transition-colors">Post Problem</Link>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-gray-500 px-3 py-1.5 bg-gray-800/50 rounded-full border border-gray-700/50">
                Built on
                <span className="text-cyan-400 font-semibold">Supabase</span>
                <span className="text-gray-600">+</span>
                <span className="text-blue-400 font-semibold">Azure</span>
              </div>
            </div>
          </div>
          <div className="mt-8 text-center text-xs text-gray-600">
            © 2026 Problem Hunt. Decentralized problem solving.
          </div>
        </div>
      </footer>
    </div>
  );
}
