import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  Code,
  Search,
  Filter,
  DollarSign,
  Clock,
  TrendingUp,
  User,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";

const CATEGORIES = [
  "All",
  "AI/ML",
  "Web3",
  "Finance",
  "Governance",
  "Trading",
  "Infrastructure",
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
  createdAt: string;
  updatedAt: string;
}

export function BrowseProblems() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState("All");
  const [sortBy, setSortBy] = useState("bounty");
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        setLoading(true);
        const category = selectedCategory === "All" ? "all" : selectedCategory;
        const response = await fetch(`/api/problems?category=${category}&sortBy=${sortBy}`);
        if (response.ok) {
          const data = await response.json();
          // API returns { problems: [...], total, limit, offset }
          setProblems(Array.isArray(data.problems) ? data.problems : Array.isArray(data) ? data : []);
        } else {
          setProblems([]);
        }
      } catch (error) {
        console.error('Error fetching problems:', error);
        setProblems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProblems();
  }, [selectedCategory, sortBy]);

  const filteredProblems = problems.filter((problem) => {
    const matchesSearch =
      problem.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      problem.description
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" ||
      problem.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800/50 backdrop-blur-sm sticky top-0 z-50 bg-[#0a0a0f]/80">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
              <Code className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              problemhunt.cc
            </span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link to="/browse">
              <Button
                variant="ghost"
                className="text-white hover:text-cyan-400 hover:bg-gray-800"
              >
                Browse
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button
                variant="ghost"
                className="text-gray-300 hover:text-white hover:bg-gray-800"
              >
                Dashboard
              </Button>
            </Link>
            <Link to="/post">
              <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0">
                Post Problem
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        {/* Search and Filters */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Browse Active Problems
          </h1>

          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search problems..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-900/50 border-gray-800 focus:border-cyan-500/50 text-white placeholder:text-gray-500"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-gray-700 hover:bg-gray-700/50 text-gray-200 hover:text-white hover:border-gray-600"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <Button
                key={category}
                variant="outline"
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={
                  selectedCategory === category
                    ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300 hover:bg-cyan-500/30 hover:border-cyan-500/70"
                    : "border-gray-700 hover:bg-gray-700/50 text-gray-200 hover:text-white hover:border-gray-600"
                }
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Problems Grid */}
        <div className="grid gap-6">
          {loading ? (
            <div className="text-center text-gray-400 py-12">Loading problems...</div>
          ) : filteredProblems.length === 0 ? (
            <div className="text-center text-gray-400 py-12">No problems found</div>
          ) : (
            filteredProblems.map((problem) => (
              <Link
                key={problem.id}
                to={`/problem/${problem.id}`}
              >
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
                  <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 hover:border-cyan-500/30 transition-all">
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Main Content */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-2xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                            {problem.title}
                          </h3>
                          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                            {problem.category}
                          </Badge>
                        </div>
                        <p className="text-gray-400 mb-4 line-clamp-2">
                          {problem.description}
                        </p>

                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-1.5 text-gray-400">
                            <User className="w-4 h-4" />
                            <span>
                              {problem.proposals || 0} proposals
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-400">
                            <TrendingUp className="w-4 h-4" />
                            <span>{problem.upvotes || 0} upvotes</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-400">
                            <Clock className="w-4 h-4" />
                            <span>{new Date(problem.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Bounty */}
                      <div className="flex flex-col items-end justify-between lg:min-w-[200px]">
                        <div className="text-right">
                          <div className="text-sm text-gray-400 mb-1">
                            Total Bounty
                          </div>
                          <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                            ${problem.budgetValue?.toLocaleString() || problem.budget}
                          </div>
                        </div>

                        <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 w-full">
                          View Details
                        </Button>
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