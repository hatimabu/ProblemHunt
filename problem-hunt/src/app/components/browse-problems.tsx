import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  Briefcase,
  Clock,
  Flame,
  Search,
  SlidersHorizontal,
  TrendingUp,
  User,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Navbar } from "./navbar";
import { supabase } from "../../../lib/supabaseClient";
import { API_ENDPOINTS } from "../../lib/api-config";
import { formatBudget, formatJobStatus, formatTimeAgo, isJobPost, type ProblemPost } from "../../lib/marketplace";

const CATEGORIES = ["All", "AI/ML", "Web3", "Finance", "Governance", "Trading", "Infrastructure"];
const TYPE_FILTERS = [
  { value: "all", label: "All Briefs" },
  { value: "problem", label: "Problems" },
  { value: "job", label: "Paid Tasks" },
];
const SORT_OPTIONS = [
  { value: "newest", label: "Newest Signal" },
  { value: "upvotes", label: "Most Attention" },
  { value: "proposals", label: "Most Builder Bids" },
  { value: "budget", label: "Highest Bounty" },
];

const CATEGORY_ACCENTS: Record<string, string> = {
  "AI/ML": "text-[var(--neon-cyan)]",
  "Web3": "text-[var(--neon-pink)]",
  "Finance": "text-[var(--neon-lime)]",
  "Governance": "text-[var(--neon-text)]",
  "Trading": "text-[var(--neon-pink)]",
  "Infrastructure": "text-[var(--neon-cyan)]",
};

function SkeletonRow() {
  return (
    <div className="neon-panel rounded-[1.25rem] p-6">
      <div className="skeleton h-4 w-28 rounded-full mb-5" />
      <div className="skeleton h-8 w-3/4 mb-3 rounded" />
      <div className="skeleton h-4 w-full mb-2 rounded" />
      <div className="skeleton h-4 w-5/6 mb-5 rounded" />
      <div className="skeleton h-4 w-48 rounded" />
    </div>
  );
}

export function BrowseProblems() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedType, setSelectedType] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [posts, setPosts] = useState<ProblemPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const category = selectedCategory === "All" ? "all" : selectedCategory;
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await fetch(
          `${API_ENDPOINTS.PROBLEMS}?category=${encodeURIComponent(category)}&sortBy=${sortBy}&type=${selectedType}`,
          { headers }
        );

        if (!response.ok) {
          throw new Error(`API Error ${response.status}: ${await response.text()}`);
        }

        const data = await response.json();
        setPosts(Array.isArray(data.problems) ? data.problems : []);
      } catch {
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [selectedCategory, selectedType, sortBy]);

  const filteredPosts = useMemo(() => {
    if (!searchQuery) {
      return posts;
    }

    const query = searchQuery.toLowerCase();
    return posts.filter((post) => {
      return (
        post.title.toLowerCase().includes(query) ||
        post.description.toLowerCase().includes(query)
      );
    });
  }, [posts, searchQuery]);

  return (
    <div className="neon-page min-h-screen text-[var(--neon-text)]">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-10">
        <section className="neon-panel relative overflow-hidden rounded-[1.75rem] p-8 md:p-10 mb-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,79,216,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(89,243,255,0.14),transparent_28%)]" />
          <div className="relative z-10 max-w-3xl">
            <p className="neon-kicker">Marketplace Board</p>
            <h1 className="font-cyber text-4xl uppercase tracking-[0.12em] text-[var(--neon-text)] md:text-6xl">
              Browse The Bounty Board
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--neon-muted)] md:text-lg">
              Hunt problems, paid tasks, and technical requests from people who want something solved, shipped, or taken off their plate.
            </p>
          </div>
        </section>

        <div className="neon-panel rounded-[1.5rem] p-4 md:p-5 mb-5">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--neon-dim)]" />
              <Input
                placeholder="Search briefs, tasks, bounties..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-10 h-12 rounded-none border-[color:var(--neon-line)] bg-[rgba(6,10,24,0.78)] text-[var(--neon-text)] placeholder:text-[var(--neon-dim)] focus:border-[color:var(--neon-line-strong)]"
              />
            </div>

            <div className="relative" ref={filterRef}>
              <button
                onClick={() => setFilterOpen((open) => !open)}
                className="flex h-12 items-center gap-2 rounded-none border border-[color:var(--neon-line)] bg-[rgba(6,10,24,0.82)] px-4 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--neon-muted)] transition-colors hover:text-[var(--neon-text)]"
              >
                <SlidersHorizontal className="w-4 h-4" />
                {SORT_OPTIONS.find((option) => option.value === sortBy)?.label}
              </button>

              {filterOpen && (
                <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-[1.1rem] border border-[color:var(--neon-line)] bg-[rgba(7,11,26,0.96)] shadow-[0_0_24px_rgba(89,243,255,0.12)]">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value);
                        setFilterOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                        sortBy === option.value
                          ? "bg-[rgba(89,243,255,0.08)] text-[var(--neon-cyan)]"
                          : "text-[var(--neon-muted)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--neon-text)]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {TYPE_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setSelectedType(filter.value)}
                className={`rounded-none border px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-all ${
                  selectedType === filter.value
                    ? "border-[color:rgba(89,243,255,0.38)] bg-[rgba(89,243,255,0.08)] text-[var(--neon-cyan)]"
                    : "border-[color:rgba(89,243,255,0.14)] bg-[rgba(6,10,24,0.58)] text-[var(--neon-dim)] hover:text-[var(--neon-text)]"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`rounded-none border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition-all ${
                  selectedCategory === category
                    ? "border-[color:rgba(255,79,216,0.34)] bg-[rgba(255,79,216,0.08)] text-[var(--neon-text)]"
                    : "border-[color:rgba(89,243,255,0.12)] bg-[rgba(6,10,24,0.48)] text-[var(--neon-dim)] hover:text-[var(--neon-text)]"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {!loading && (
          <p className="mb-6 text-sm text-[var(--neon-dim)]">
            {filteredPosts.length} signal{filteredPosts.length !== 1 ? "s" : ""} on the board
            {searchQuery && ` for "${searchQuery}"`}
          </p>
        )}

        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => <SkeletonRow key={index} />)
          ) : filteredPosts.length === 0 ? (
            <div className="neon-panel rounded-[1.75rem] px-6 py-18 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-[color:var(--neon-line)] bg-[rgba(89,243,255,0.08)] text-[var(--neon-cyan)]">
                <Search className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--neon-text)]">
                No briefs found
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--neon-muted)] md:text-base">
                Try a different filter, or post the first bounty-backed request in this slice of the market.
              </p>
              <Link to="/post" className="inline-flex">
                <Button className="mt-7 rounded-none border border-[color:rgba(89,243,255,0.34)] bg-[rgba(9,14,31,0.88)] text-[var(--neon-cyan)] hover:bg-[rgba(89,243,255,0.1)]">
                  Post A Brief
                </Button>
              </Link>
            </div>
          ) : (
            filteredPosts.map((post) => {
              const hot = post.upvotes >= 5;
              const job = isJobPost(post);

              return (
                <Link key={post.id} to={`/problem/${post.id}`} className="block">
                  <article className="neon-panel group relative overflow-hidden rounded-[1.5rem] p-6 transition-transform hover:-translate-y-0.5">
                    <div className="absolute inset-y-6 left-0 w-px bg-gradient-to-b from-transparent via-[var(--neon-cyan)] to-transparent opacity-75" />

                    {hot && (
                      <div className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-none border border-[color:rgba(255,79,216,0.32)] bg-[rgba(255,79,216,0.12)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--neon-text)]">
                        <Flame className="w-3 h-3" />
                        Hot
                      </div>
                    )}

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`font-mono-alt text-[0.68rem] font-semibold uppercase tracking-[0.26em] ${
                              CATEGORY_ACCENTS[post.category] || "text-[var(--neon-cyan)]"
                            }`}
                          >
                            {post.category}
                          </span>
                          <span className="rounded-none border border-[color:rgba(89,243,255,0.16)] bg-[rgba(89,243,255,0.06)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--neon-muted)]">
                            {job ? "Paid Task" : "Problem Brief"}
                          </span>
                          {job && post.jobStatus && (
                            <span className="rounded-none border border-[color:rgba(255,79,216,0.18)] bg-[rgba(255,79,216,0.06)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--neon-muted)]">
                              {formatJobStatus(post.jobStatus)}
                            </span>
                          )}
                        </div>

                        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[var(--neon-text)] transition-colors group-hover:text-[var(--neon-cyan)]">
                          {post.title}
                        </h2>
                        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--neon-muted)] line-clamp-2 md:text-base">
                          {post.description}
                        </p>

                        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--neon-dim)]">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" />
                            <span>{post.author || "Anonymous"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>{post.upvotes || 0} upvotes</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span>{post.proposals || 0} bids</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{formatTimeAgo(post.createdAt)}</span>
                          </div>
                          {job && post.deadline && (
                            <div className="flex items-center gap-1.5 text-[var(--neon-lime)]">
                              <Briefcase className="w-3.5 h-3.5" />
                              <span>Deadline {new Date(post.deadline).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="lg:min-w-[180px] lg:text-right">
                        <p className="font-mono-alt text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-[var(--neon-dim)]">
                          {job ? "Budget" : "Bounty"}
                        </p>
                        <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--neon-cyan)]">
                          {formatBudget(post)}
                        </p>
                        <div className="mt-6 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--neon-cyan)] transition-all group-hover:gap-2">
                          View Brief
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </article>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
