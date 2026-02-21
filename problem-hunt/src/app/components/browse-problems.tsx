import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import {
  Search,
  Filter,
  Clock,
  TrendingUp,
  User,
  ArrowRight,
  ChevronDown,
  SlidersHorizontal,
  Flame,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Navbar } from "./navbar";
import { authenticatedFetch, handleResponse } from "../../lib/auth-helper";

const CATEGORIES = [
  "All",
  "AI/ML",
  "Web3",
  "Finance",
  "Governance",
  "Trading",
  "Infrastructure",
];

const CATEGORY_COLORS: Record<string, string> = {
  "AI/ML": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "Web3": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Finance": "bg-green-500/20 text-green-300 border-green-500/30",
  "Governance": "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "Trading": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "Infrastructure": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
};

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "upvotes", label: "Most Upvoted" },
  { value: "proposals", label: "Most Proposals" },
  { value: "budget", label: "Highest Budget" },
];

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
  authorId: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

function SkeletonCard() {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="skeleton h-6 w-20 rounded-full" />
        <div className="skeleton h-6 w-16 rounded-full" />
      </div>
      <div className="skeleton h-7 w-3/4 mb-2 rounded" />
      <div className="skeleton h-4 w-full mb-1 rounded" />
      <div className="skeleton h-4 w-5/6 mb-4 rounded" />
      <div className="flex gap-3 mb-4">
        <div className="skeleton h-5 w-12 rounded-full" />
        <div className="skeleton h-5 w-16 rounded-full" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <div className="skeleton h-4 w-20 rounded" />
          <div className="skeleton h-4 w-20 rounded" />
        </div>
        <div className="skeleton h-9 w-24 rounded-lg" />
      </div>
    </div>
  );
}

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function BrowseProblems() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        setLoading(true);
        const category = selectedCategory === "All" ? "all" : selectedCategory;
        const res = await authenticatedFetch(
          `/api/problems?category=${encodeURIComponent(category)}&sortBy=${sortBy}`,
          { method: "GET" }
        );
        const data = await handleResponse(res);
        setProblems(
          Array.isArray(data.problems)
            ? data.problems
            : Array.isArray(data)
            ? data
            : []
        );
      } catch (err) {
        console.error("Error fetching problems:", err);
        setProblems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProblems();
  }, [selectedCategory, sortBy]);

  const filteredProblems = problems.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  });

  const isHot = (p: Problem) => p.upvotes >= 5;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      <Navbar />

      <div className="container mx-auto px-4 py-10">
        {/* Page header */}
        <div className="mb-10 fade-in">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Browse Problems
          </h1>
          <p className="text-gray-400">
            Discover real problems posted by people willing to pay for solutions.
          </p>
        </div>

        {/* Search + Sort bar */}
        <div className="flex flex-col lg:flex-row gap-3 mb-6 fade-in stagger-1">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search problems… (⌘K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-gray-900/60 border-gray-700/60 focus:border-cyan-500/60 text-white placeholder:text-gray-500 rounded-xl"
            />
          </div>

          {/* Sort dropdown */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setFilterOpen((o) => !o)}
              className="flex items-center gap-2 h-11 px-4 bg-gray-900/60 border border-gray-700/60 hover:border-gray-600 rounded-xl text-sm text-gray-300 hover:text-white transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Sort: {SORT_OPTIONS.find((s) => s.value === sortBy)?.label}
              <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${filterOpen ? "rotate-180" : ""}`} />
            </button>

            {filterOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700/60 rounded-xl shadow-xl z-20 fade-in overflow-hidden">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setSortBy(opt.value); setFilterOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      sortBy === opt.value
                        ? "text-cyan-400 bg-cyan-500/10"
                        : "text-gray-300 hover:text-white hover:bg-gray-800/60"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2 mb-8 fade-in stagger-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                selectedCategory === cat
                  ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300"
                  : "border-gray-700/60 text-gray-400 hover:border-gray-600 hover:text-gray-200 bg-gray-900/40"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-sm text-gray-500 mb-6 fade-in">
            {filteredProblems.length} problem{filteredProblems.length !== 1 ? "s" : ""} found
            {searchQuery && ` for "${searchQuery}"`}
          </p>
        )}

        {/* Problems list */}
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : filteredProblems.length === 0 ? (
            /* Empty state */
            <div className="text-center py-20 fade-in">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold text-white mb-2">No problems found</h3>
              <p className="text-gray-400 mb-6">
                {searchQuery
                  ? `No results for "${searchQuery}". Try a different search.`
                  : "Be the first to post a problem in this category!"}
              </p>
              <Link to="/post">
                <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0">
                  Post a Problem
                </Button>
              </Link>
            </div>
          ) : (
            filteredProblems.map((problem, i) => (
              <Link
                key={problem.id}
                to={`/problem/${problem.id}`}
                className={`block fade-in stagger-${Math.min(i + 1, 5)}`}
              >
                <div className="card-hover relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 hover:border-cyan-500/40 rounded-2xl p-6 group">
                  {/* Hot badge */}
                  {isHot(problem) && (
                    <div className="absolute -top-2 -right-2 hot-badge bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Flame className="w-2.5 h-2.5" />
                      HOT
                    </div>
                  )}

                  <div className="flex flex-col lg:flex-row gap-4">
                    {/* Main */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3 mb-2">
                        <Badge
                          className={`shrink-0 text-xs ${
                            CATEGORY_COLORS[problem.category] ||
                            "bg-gray-500/20 text-gray-300 border-gray-500/30"
                          }`}
                        >
                          {problem.category}
                        </Badge>
                        {problem.proposals > 5 && (
                          <Badge className="shrink-0 text-xs bg-blue-500/20 text-blue-300 border-blue-500/30">
                            Competitive
                          </Badge>
                        )}
                      </div>

                      <h3 className="text-xl font-bold text-white mb-1.5 group-hover:text-cyan-400 transition-colors line-clamp-2">
                        {problem.title}
                      </h3>

                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                        {problem.description}
                      </p>

                      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />
                          <span>{problem.author || "Anonymous"}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>⬆ {problem.upvotes || 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span>💬 {problem.proposals || 0} proposals</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{timeAgo(problem.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Budget + CTA */}
                    <div className="flex lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-3 lg:min-w-[140px]">
                      <div className="text-right">
                        <div className="text-xs text-gray-500 mb-0.5">Bounty</div>
                        <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                          ${problem.budgetValue?.toLocaleString() || problem.budget}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-cyan-400 group-hover:gap-2 transition-all font-medium">
                        View <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
