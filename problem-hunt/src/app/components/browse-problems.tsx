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
import { Badge } from "../components/ui/badge";
import { Navbar } from "./navbar";
import { supabase } from "../../../lib/supabaseClient";
import { API_ENDPOINTS } from "../../lib/api-config";
import { formatBudget, formatJobStatus, formatTimeAgo, isJobPost, type ProblemPost } from "../../lib/marketplace";

const CATEGORIES = ["All", "AI/ML", "Web3", "Finance", "Governance", "Trading", "Infrastructure"];
const TYPE_FILTERS = [
  { value: "all", label: "All" },
  { value: "problem", label: "Problems" },
  { value: "job", label: "Jobs" },
];
const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "upvotes", label: "Most Upvoted" },
  { value: "proposals", label: "Most Proposals" },
  { value: "budget", label: "Highest Budget" },
];

const CATEGORY_COLORS: Record<string, string> = {
  "AI/ML": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "Web3": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Finance": "bg-green-500/20 text-green-300 border-green-500/30",
  "Governance": "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "Trading": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "Infrastructure": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
};

function SkeletonCard() {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
      <div className="skeleton h-6 w-24 rounded-full mb-4" />
      <div className="skeleton h-7 w-3/4 mb-2 rounded" />
      <div className="skeleton h-4 w-full mb-1 rounded" />
      <div className="skeleton h-4 w-5/6 mb-4 rounded" />
      <div className="skeleton h-4 w-40 rounded" />
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
    const fetchProblems = async () => {
      try {
        setLoading(true);
        const category = selectedCategory === "All" ? "all" : selectedCategory;
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const response = await fetch(
          `${API_ENDPOINTS.PROBLEMS}?category=${encodeURIComponent(category)}&sortBy=${sortBy}&type=${selectedType}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
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

    fetchProblems();
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
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      <Navbar />

      <div className="container mx-auto px-4 py-10">
        <div className="mb-10 fade-in">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Browse Problems and Jobs
          </h1>
          <p className="text-gray-400">
            Explore community problem-solving threads and paid DevOps jobs side by side.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 mb-6 fade-in">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-gray-900/60 border-gray-700/60 focus:border-cyan-500/60 text-white placeholder:text-gray-500 rounded-xl"
            />
          </div>

          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setFilterOpen((open) => !open)}
              className="flex items-center gap-2 h-11 px-4 bg-gray-900/60 border border-gray-700/60 hover:border-gray-600 rounded-xl text-sm text-gray-300 hover:text-white transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Sort: {SORT_OPTIONS.find((option) => option.value === sortBy)?.label}
            </button>

            {filterOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700/60 rounded-xl shadow-xl z-20 overflow-hidden">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSortBy(option.value);
                      setFilterOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      sortBy === option.value
                        ? "text-cyan-400 bg-cyan-500/10"
                        : "text-gray-300 hover:text-white hover:bg-gray-800/60"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4 fade-in">
          {TYPE_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setSelectedType(filter.value)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                selectedType === filter.value
                  ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300"
                  : "border-gray-700/60 text-gray-400 hover:border-gray-600 hover:text-gray-200 bg-gray-900/40"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-8 fade-in">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                selectedCategory === category
                  ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300"
                  : "border-gray-700/60 text-gray-400 hover:border-gray-600 hover:text-gray-200 bg-gray-900/40"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {!loading && (
          <p className="text-sm text-gray-500 mb-6">
            {filteredPosts.length} post{filteredPosts.length !== 1 ? "s" : ""} found
            {searchQuery && ` for "${searchQuery}"`}
          </p>
        )}

        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={index} />)
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-20 fade-in">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold text-white mb-2">No posts found</h3>
              <p className="text-gray-400 mb-6">
                Try a different filter, or create the first post in this slice of the marketplace.
              </p>
              <Link to="/post">
                <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0">
                  Create a Post
                </Button>
              </Link>
            </div>
          ) : (
            filteredPosts.map((post) => {
              const hot = post.upvotes >= 5;
              const job = isJobPost(post);
              return (
                <Link key={post.id} to={`/problem/${post.id}`} className="block">
                  <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 hover:border-cyan-500/40 rounded-2xl p-6 group">
                    {hot && (
                      <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Flame className="w-2.5 h-2.5" />
                        HOT
                      </div>
                    )}

                    <div className="flex flex-col lg:flex-row gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge
                            className={`text-xs ${
                              CATEGORY_COLORS[post.category] ||
                              "bg-gray-500/20 text-gray-300 border-gray-500/30"
                            }`}
                          >
                            {post.category}
                          </Badge>
                          {job && (
                            <Badge className="text-xs bg-amber-500/20 text-amber-300 border-amber-500/30">
                              <Briefcase className="w-3 h-3 mr-1" />
                              JOB
                            </Badge>
                          )}
                          {job && post.jobStatus && (
                            <Badge className="text-xs bg-gray-800 text-gray-300 border-gray-700">
                              {formatJobStatus(post.jobStatus)}
                            </Badge>
                          )}
                        </div>

                        <h3 className="text-xl font-bold text-white mb-1.5 group-hover:text-cyan-400 transition-colors line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                          {post.description}
                        </p>

                        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" />
                            <span>{post.author || "Anonymous"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>{post.upvotes || 0} upvotes</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span>{post.proposals || 0} proposals</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{formatTimeAgo(post.createdAt)}</span>
                          </div>
                          {job && post.deadline && (
                            <div className="flex items-center gap-1.5 text-amber-300">
                              <span>Deadline {new Date(post.deadline).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex lg:flex-col items-center lg:items-end justify-between gap-3 lg:min-w-[160px]">
                        <div className="text-right">
                          <div className="text-xs text-gray-500 mb-0.5">
                            {job ? "Budget" : "Bounty"}
                          </div>
                          <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                            {formatBudget(post)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-cyan-400 group-hover:gap-2 transition-all font-medium">
                          View <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
