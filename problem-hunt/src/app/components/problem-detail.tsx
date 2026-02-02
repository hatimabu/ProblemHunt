import { useState, useEffect } from "react";
import { Link, useParams } from "react-router";
import { Code, Clock, DollarSign, TrendingUp, User, Calendar, Send, Heart } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Progress } from "../components/ui/progress";

interface Update {
  id: string;
  content: string;
  timestamp: string;
  tips: number;
}

interface Builder {
  id: string;
  name: string;
  avatar: string;
  reputation: number;
  completedProjects: number;
  progress: number;
  lastUpdate: string;
  totalTips: number;
  updates: Update[];
}

interface Problem {
  id: string;
  title: string;
  description: string;
  requirements?: string[];
  budget: string;
  budgetValue: number;
  category: string;
  author: string;
  authorId: string;
  upvotes: number;
  proposals: number;
  createdAt: string;
  updatedAt: string;
}

export function ProblemDetail() {
  const { id } = useParams();
  const [tipAmount, setTipAmount] = useState("");
  const [problem, setProblem] = useState<Problem | null>(null);
  const [builders] = useState<Builder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/problems/${id}`);
        if (response.ok) {
          const data = await response.json();
          setProblem(data);
        } else {
          setProblem(null);
        }
      } catch (error) {
        console.error('Error fetching problem:', error);
        setProblem(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProblem();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
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
          </div>
        </header>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="text-xl text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
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
                <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800">
                  Browse
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800">
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
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="text-xl text-gray-400">Problem not found</div>
        </div>
      </div>
    );
  }

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
              <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800">
                Browse
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800">
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
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Problem Details */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 rounded-2xl blur-xl" />
              <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8">
                <div className="flex items-start justify-between mb-4">
                  <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                    {problem.category}
                  </Badge>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>
                </div>

                <h1 className="text-4xl font-bold mb-4 text-white">{problem.title}</h1>

                <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-6">
                  <div className="flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    <span>Posted by {problem.author}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(problem.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" />
                    <span>{problem.upvotes} upvotes</span>
                  </div>
                </div>

                <div className="prose prose-invert max-w-none">
                  <h3 className="text-xl font-bold mb-3 text-white">Problem Description</h3>
                  <p className="text-gray-300 leading-relaxed mb-6">{problem.description}</p>

                  {problem.requirements && problem.requirements.length > 0 && (
                    <>
                      <h3 className="text-xl font-bold mb-3 text-white">Requirements</h3>
                      <ul className="space-y-2">
                        {problem.requirements.map((req, index) => (
                          <li key={index} className="text-gray-300 flex items-start gap-2">
                            <span className="text-cyan-400 mt-1">→</span>
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Builders & Progress */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-2xl blur-xl" />
              <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8">
                <h2 className="text-2xl font-bold mb-6 text-white">
                  Active Builders ({builders.length})
                </h2>

                <div className="space-y-6">
                  {builders.map((builder) => (
                    <div
                      key={builder.id}
                      className="border border-gray-800 rounded-xl p-6 hover:border-cyan-500/30 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-12 h-12 border-2 border-cyan-500/30">
                            <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-bold">
                              {builder.avatar}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-bold text-white">{builder.name}</div>
                            <div className="text-sm text-gray-400">
                              {builder.completedProjects} completed • ⭐ {builder.reputation}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-400 mb-1">Total Tips</div>
                          <div className="text-lg font-bold text-cyan-400">
                            ${builder.totalTips}
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-400">Progress</span>
                          <span className="text-white font-medium">{builder.progress}%</span>
                        </div>
                        <Progress value={builder.progress} className="h-2 bg-gray-800">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full transition-all"
                            style={{ width: `${builder.progress}%` }}
                          />
                        </Progress>
                      </div>

                      {/* Updates */}
                      <div className="space-y-3">
                        {builder.updates.map((update) => (
                          <div
                            key={update.id}
                            className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50"
                          >
                            <p className="text-gray-300 mb-2">{update.content}</p>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">{update.timestamp}</span>
                              <div className="flex items-center gap-1 text-cyan-400">
                                <Heart className="w-4 h-4" />
                                <span>${update.tips} tipped</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-700/50">
                        <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 w-full">
                          <Heart className="w-4 h-4 mr-2" />
                          Tip This Builder
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Bounty Card */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-2xl blur-xl" />
              <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
                <div className="text-center mb-4">
                  <div className="text-sm text-gray-400 mb-2">Bounty</div>
                  <div className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                    {problem.budget}
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Upvotes</span>
                    <span className="text-white font-medium">{problem.upvotes}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Proposals</span>
                    <span className="text-white font-medium">{problem.proposals}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Active Builders</span>
                    <span className="text-white font-medium">{builders.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Total Tips Given</span>
                    <span className="text-cyan-400 font-medium">
                      ${builders.reduce((sum, b) => sum + b.totalTips, 0)}
                    </span>
                  </div>
                </div>

                <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 w-full">
                  Apply as Builder
                </Button>
              </div>
            </div>

            {/* Quick Tip */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-2xl blur-xl" />
              <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4 text-white">Quick Tip</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Support builders making progress on this problem
                </p>
                <div className="flex gap-2 mb-3">
                  {[10, 25, 50, 100].map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => setTipAmount(String(amount))}
                      className="flex-1 border-gray-800 hover:bg-gray-800 text-gray-300"
                    >
                      ${amount}
                    </Button>
                  ))}
                </div>
                <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 w-full">
                  <Send className="w-4 h-4 mr-2" />
                  Send Tip
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
