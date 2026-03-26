import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, Briefcase, Clock3, Flame, Search, TrendingUp, User2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Navbar } from "./navbar";
import { supabase } from "../../../lib/supabaseClient";
import { API_ENDPOINTS } from "../../lib/api-config";
import { formatBudget, formatJobStatus, formatTimeAgo, isJobPost, type ProblemPost } from "../../lib/marketplace";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

const CATEGORIES = ["All", "AI/ML", "Web3", "Finance", "Governance", "Trading", "Infrastructure"];
const TYPE_FILTERS = [
  { value: "all", label: "All briefs" },
  { value: "problem", label: "Problems" },
  { value: "job", label: "Paid tasks" },
];
const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "upvotes", label: "Most upvoted" },
  { value: "proposals", label: "Most proposals" },
  { value: "budget", label: "Highest budget" },
];

function LoadingRow() {
  return (
    <div className="border-b border-[color:var(--board-line)] py-7">
      <div className="skeleton h-3 w-28" />
      <div className="skeleton mt-4 h-9 w-3/5" />
      <div className="skeleton mt-3 h-4 w-full" />
      <div className="skeleton mt-2 h-4 w-5/6" />
      <div className="skeleton mt-5 h-4 w-44" />
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
      return post.title.toLowerCase().includes(query) || post.description.toLowerCase().includes(query);
    });
  }, [posts, deferredSearchQuery]);

  return (
    <div className="board-app">
      <Navbar />

      <main className="board-container py-8 md:py-10">
        <section className="grid gap-8 border-b border-[color:var(--board-line)] pb-10 lg:grid-cols-[minmax(0,1.05fr)_280px]">
          <div>
            <p className="board-kicker">Marketplace</p>
            <h1 className="board-title mt-3">Scan live briefs, open tasks, and technical requests.</h1>
            <p className="board-copy mt-5">
              This is the working board: search by signal, narrow by category, and open the brief when something looks worth taking.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <div className="board-stat">
              <div className="board-stat__value">{loading ? "..." : String(posts.length)}</div>
              <div className="board-stat__label">Live listings</div>
            </div>
            <div className="board-stat">
              <div className="board-stat__value">{selectedType === "all" ? "All" : selectedType === "job" ? "Jobs" : "Briefs"}</div>
              <div className="board-stat__label">Active filter</div>
            </div>
            <div className="board-stat">
              <div className="board-stat__value">{selectedCategory}</div>
              <div className="board-stat__label">Current category</div>
            </div>
          </div>
        </section>

        <section className="board-section px-0">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="grid gap-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--board-soft)]" />
                <Input
                  placeholder="Search by title or description"
                  value={searchQuery}
                  onChange={(event) => {
                    startTransition(() => {
                      setSearchQuery(event.target.value);
                    });
                  }}
                  className="board-field h-12 rounded-none pl-10"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                <div className="board-segment grid grid-cols-3">
                  {TYPE_FILTERS.map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => {
                        startTransition(() => {
                          setSelectedType(filter.value);
                        });
                      }}
                      className={selectedType === filter.value ? "bg-[rgba(15,118,110,0.08)] text-[var(--board-accent)]" : "text-[var(--board-soft)] hover:text-[var(--board-ink)]"}
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
                  <SelectTrigger className="board-field h-12 rounded-none border-[color:var(--board-line)] bg-white/58 text-[var(--board-ink)]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-[color:var(--board-line-strong)] bg-[var(--board-paper)] text-[var(--board-ink)]">
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
              <SelectTrigger className="board-field h-12 rounded-none border-[color:var(--board-line)] bg-white/58 text-[var(--board-ink)] lg:self-end">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="rounded-none border-[color:var(--board-line-strong)] bg-[var(--board-paper)] text-[var(--board-ink)]">
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--board-line)] pt-5">
            <p className="text-sm text-[var(--board-muted)]">
              {loading ? "Loading the board..." : `${filteredPosts.length} listing${filteredPosts.length === 1 ? "" : "s"}`}
              {deferredSearchQuery ? ` matching "${deferredSearchQuery}"` : ""}
            </p>
            <Link
              to="/post"
              className="inline-flex items-center gap-2 font-mono-alt text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-accent)]"
            >
              Post a brief
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-4 border-t border-[color:var(--board-line)]">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => <LoadingRow key={index} />)
            ) : filteredPosts.length === 0 ? (
              <div className="board-empty">
                <h2 className="board-subtitle">Nothing matches this slice of the board.</h2>
                <p>Try another category, loosen the search, or post the first brief for this niche yourself.</p>
                <Link to="/post" className="inline-flex">
                  <Button className="mt-6 h-11 rounded-none border border-[color:rgba(15,118,110,0.24)] bg-[var(--board-accent)] px-5 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-[color:#0d625c]">
                    Post a brief
                  </Button>
                </Link>
              </div>
            ) : (
              filteredPosts.map((post) => {
                const hot = post.upvotes >= 5;
                const job = isJobPost(post);

                return (
                  <Link key={post.id} to={`/problem/${post.id}`} className="board-row">
                    <article className="grid gap-5 lg:grid-cols-[150px_minmax(0,1fr)_160px] lg:items-start">
                      <div className="space-y-2">
                        <p className="board-eyebrow">{post.category}</p>
                        <div className="flex flex-wrap gap-2">
                          <span className={`board-pill ${job ? "board-pill--accent" : ""}`}>{job ? "Paid task" : "Problem brief"}</span>
                          {hot ? (
                            <span className="board-pill board-pill--rust">
                              <Flame className="h-3 w-3" />
                              Hot
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div>
                        <h2 className="board-subtitle text-[1.8rem]">{post.title}</h2>
                        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--board-muted)] line-clamp-2 md:text-base">
                          {post.description}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--board-soft)]">
                          <span className="inline-flex items-center gap-1.5">
                            <User2 className="h-3.5 w-3.5" />
                            {post.author || "Anonymous"}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5" />
                            {post.upvotes || 0} upvotes
                          </span>
                          <span>{post.proposals || 0} proposals</span>
                          <span className="inline-flex items-center gap-1.5">
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatTimeAgo(post.createdAt)}
                          </span>
                          {job && post.jobStatus ? (
                            <span className="inline-flex items-center gap-1.5 text-[var(--board-accent)]">
                              <Briefcase className="h-3.5 w-3.5" />
                              {formatJobStatus(post.jobStatus)}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="lg:text-right">
                        <p className="board-eyebrow">{job ? "Budget" : "Bounty"}</p>
                        <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.06em] text-[var(--board-ink)]">
                          {formatBudget(post)}
                        </p>
                        <p className="mt-4 inline-flex items-center gap-2 font-mono-alt text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-accent)]">
                          Open brief
                          <ArrowRight className="h-4 w-4" />
                        </p>
                      </div>
                    </article>
                  </Link>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
