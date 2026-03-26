import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Briefcase, Clock, Flame, Search, TrendingUp, User } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Navbar } from "./navbar";
import { supabase } from "../../../lib/supabaseClient";
import { API_ENDPOINTS } from "../../lib/api-config";
import { formatBudget, formatJobStatus, formatTimeAgo, isJobPost, type ProblemPost } from "../../lib/marketplace";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

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

function SkeletonSignal() {
  return (
    <div className="market-row px-1 py-6">
      <div className="skeleton h-4 w-28 rounded-full mb-4" />
      <div className="skeleton h-9 w-3/4 mb-3 rounded" />
      <div className="skeleton h-4 w-full mb-2 rounded" />
      <div className="skeleton h-4 w-5/6 mb-5 rounded" />
      <div className="skeleton h-4 w-56 rounded" />
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

  const deferredSearchQuery = useDeferredValue(searchQuery);
  const filteredPosts = useMemo(() => {
    if (!deferredSearchQuery) {
      return posts;
    }

    const query = deferredSearchQuery.toLowerCase();
    return posts.filter((post) => {
      return (
        post.title.toLowerCase().includes(query) ||
        post.description.toLowerCase().includes(query)
      );
    });
  }, [posts, deferredSearchQuery]);

  return (
    <div className="neon-page min-h-screen text-[var(--neon-text)]">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-10">
        <section className="browse-stage relative isolate overflow-hidden border border-[color:var(--neon-line)]">
          <div className="browse-stage__scene" aria-hidden="true">
            <div className="browse-stage__scan" />
            <div className="browse-stage__haze browse-stage__haze--cyan" />
            <div className="browse-stage__haze browse-stage__haze--pink" />
            <div className="browse-stage__wires" />
            <div className="browse-stage__street" />
            <div className="browse-stage__billboard">OPEN SIGNALS</div>
          </div>

          <div className="relative z-10 px-5 py-10 sm:px-8 md:py-14 lg:px-10">
            <div className="max-w-3xl">
              <p className="neon-kicker">Marketplace Board</p>
              <h1 className="font-cyber text-4xl uppercase tracking-[0.12em] text-[var(--neon-text)] md:text-6xl">
                Hunt Live Briefs
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--neon-muted)] md:text-lg">
                Browse open problems, paid tasks, and technical requests from people who need something solved, shipped, or taken off their plate.
              </p>
            </div>

            <div className="mt-10 grid gap-4 border-t border-[color:rgba(89,243,255,0.16)] pt-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(240px,0.8fr)]">
              <div className="grid gap-4">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--neon-dim)]" />
                  <Input
                    placeholder="Search briefs, tasks, bounties..."
                    value={searchQuery}
                    onChange={(event) => {
                      startTransition(() => {
                        setSearchQuery(event.target.value);
                      });
                    }}
                    className="h-12 rounded-none border-[color:var(--neon-line)] bg-[rgba(6,10,24,0.78)] pl-10 text-[var(--neon-text)] placeholder:text-[var(--neon-dim)] focus:border-[color:var(--neon-line-strong)]"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                  <div className="grid grid-cols-3 border border-[color:var(--neon-line)] bg-[rgba(6,10,24,0.74)]">
                    {TYPE_FILTERS.map((filter) => (
                      <button
                        key={filter.value}
                        onClick={() => {
                          startTransition(() => {
                            setSelectedType(filter.value);
                          });
                        }}
                        className={`min-h-12 px-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] transition-colors ${
                          selectedType === filter.value
                            ? "bg-[rgba(89,243,255,0.1)] text-[var(--neon-cyan)]"
                            : "text-[var(--neon-dim)] hover:text-[var(--neon-text)]"
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>

                  <Select
                    value={selectedCategory}
                    onValueChange={(value) => {
                      startTransition(() => {
                        setSelectedCategory(value);
                      });
                    }}
                  >
                    <SelectTrigger className="h-12 rounded-none border-[color:var(--neon-line)] bg-[rgba(6,10,24,0.74)] text-[var(--neon-text)]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-[color:var(--neon-line)] bg-[rgba(7,11,26,0.96)] text-[var(--neon-text)]">
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Select
                value={sortBy}
                onValueChange={(value) => {
                  startTransition(() => {
                    setSortBy(value);
                  });
                }}
              >
                <SelectTrigger className="h-12 rounded-none border-[color:var(--neon-line)] bg-[rgba(6,10,24,0.74)] text-[var(--neon-text)] lg:self-end">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-[color:var(--neon-line)] bg-[rgba(7,11,26,0.96)] text-[var(--neon-text)]">
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {!loading && (
          <p className="mt-6 text-sm text-[var(--neon-dim)]">
            {filteredPosts.length} live signal{filteredPosts.length !== 1 ? "s" : ""}
            {deferredSearchQuery && ` matching "${deferredSearchQuery}"`}
          </p>
        )}

        <div className="mt-6 border-t border-[color:var(--neon-line)]">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => <SkeletonSignal key={index} />)
          ) : filteredPosts.length === 0 ? (
            <div className="py-20 text-center">
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--neon-text)]">
                No live briefs in this slice of the city
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--neon-muted)] md:text-base">
                Try another category or post the first bounty-backed request for this market.
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
                  <article className="market-row group py-8">
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_176px] lg:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                          <span
                            className={`font-mono-alt text-[0.68rem] font-semibold uppercase tracking-[0.28em] ${
                              CATEGORY_ACCENTS[post.category] || "text-[var(--neon-cyan)]"
                            }`}
                          >
                            {post.category}
                          </span>
                          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[var(--neon-dim)]">
                            {job ? "Paid Task" : "Problem Brief"}
                          </span>
                          {job && post.jobStatus ? (
                            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[var(--neon-dim)]">
                              {formatJobStatus(post.jobStatus)}
                            </span>
                          ) : null}
                          {hot ? (
                            <span className="inline-flex items-center gap-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[var(--neon-pink)]">
                              <Flame className="w-3 h-3" />
                              Hot Signal
                            </span>
                          ) : null}
                        </div>

                        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--neon-text)] transition-colors group-hover:text-[var(--neon-cyan)] md:text-3xl">
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
                          {job && post.deadline ? (
                            <div className="flex items-center gap-1.5 text-[var(--neon-lime)]">
                              <Briefcase className="w-3.5 h-3.5" />
                              <span>Deadline {new Date(post.deadline).toLocaleDateString()}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="lg:text-right">
                        <p className="font-mono-alt text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[var(--neon-dim)]">
                          {job ? "Budget" : "Bounty"}
                        </p>
                        <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--neon-cyan)]">
                          {formatBudget(post)}
                        </p>
                        <div className="mt-6 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--neon-cyan)] transition-all group-hover:gap-2">
                          Open Brief
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
