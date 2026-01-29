import { useState } from "react";
import { Link } from "react-router";
import {
  Code,
  TrendingUp,
  DollarSign,
  Target,
  Clock,
  Send,
  Heart,
  Award,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Mock data
const BUILDER_STATS = {
  name: "solidity_sage",
  avatar: "SS",
  reputation: 4.9,
  totalEarned: 24500,
  activeProjects: 3,
  completedProjects: 31,
  totalTips: 3420,
  rank: "#12",
};

const ACTIVE_PROJECTS = [
  {
    id: "1",
    title: "AI-Powered Code Review Tool",
    bounty: 5000,
    progress: 60,
    deadline: "12 days",
    tips: 680,
    lastUpdate: "1 hour ago",
  },
  {
    id: "2",
    title: "Cross-Chain NFT Marketplace",
    bounty: 12000,
    progress: 35,
    deadline: "28 days",
    tips: 420,
    lastUpdate: "1 day ago",
  },
  {
    id: "3",
    title: "DeFi Yield Aggregator",
    bounty: 7500,
    progress: 75,
    deadline: "5 days",
    tips: 920,
    lastUpdate: "3 hours ago",
  },
];

const COMPLETED_PROJECTS = [
  {
    id: "1",
    title: "DAO Governance Platform",
    bounty: 8000,
    earned: 8450,
    completedDate: "Jan 20, 2026",
  },
  {
    id: "2",
    title: "NFT Minting Tool",
    bounty: 4500,
    earned: 4890,
    completedDate: "Jan 15, 2026",
  },
];

export function BuilderDashboard() {
  const [updateText, setUpdateText] = useState("");
  const { user, logout } = useAuth();

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
              <Button variant="ghost" className="text-white hover:text-cyan-400 hover:bg-gray-800">
                Dashboard
              </Button>
            </Link>
            {user ? (
              <Button 
                onClick={logout}
                variant="outline" 
                className="border-gray-700 hover:bg-gray-800 text-gray-300 hover:text-white"
              >
                Sign Out
              </Button>
            ) : (
              <Link to="/auth">
                <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0">
                  Sign In
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        {/* Profile Header */}
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 rounded-2xl blur-xl" />
          <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <Avatar className="w-20 h-20 border-4 border-cyan-500/30">
                <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-bold text-2xl">
                  {BUILDER_STATS.avatar}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-white">{BUILDER_STATS.name}</h1>
                  <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                    Rank {BUILDER_STATS.rank}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <Award className="w-4 h-4" />
                    <span>⭐ {BUILDER_STATS.reputation} reputation</span>
                  </div>
                  <div>•</div>
                  <div>{BUILDER_STATS.completedProjects} projects completed</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    ${BUILDER_STATS.totalEarned.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400">Total Earned</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-400">{BUILDER_STATS.activeProjects}</div>
                  <div className="text-xs text-gray-400">Active</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    ${BUILDER_STATS.totalTips.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400">Tips</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList className="bg-gray-900/50 border border-gray-800 p-1">
            <TabsTrigger
              value="active"
              className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-gray-400"
            >
              Active Projects ({ACTIVE_PROJECTS.length})
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-gray-400"
            >
              Completed ({COMPLETED_PROJECTS.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-6">
            {ACTIVE_PROJECTS.map((project) => (
              <div key={project.id} className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-2xl blur-xl" />
                <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 hover:border-cyan-500/30 transition-colors">
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-2xl font-bold text-white mb-2">{project.title}</h3>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{project.deadline} left</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Heart className="w-4 h-4" />
                              <span>${project.tips} in tips</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-400 mb-1">Bounty</div>
                          <div className="text-2xl font-bold text-cyan-400">
                            ${project.bounty.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-400">Your Progress</span>
                          <span className="text-white font-medium">{project.progress}%</span>
                        </div>
                        <Progress value={project.progress} className="h-2 bg-gray-800">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full transition-all"
                            style={{ width: `${project.progress}%` }}
                          />
                        </Progress>
                      </div>

                      {/* Post Update */}
                      <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                        <div className="text-sm font-medium text-white mb-2">
                          Post Progress Update
                        </div>
                        <Textarea
                          placeholder="Share your progress to earn tips..."
                          value={updateText}
                          onChange={(e) => setUpdateText(e.target.value)}
                          className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white placeholder:text-gray-500 mb-2 min-h-[80px]"
                        />
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">
                            Last updated: {project.lastUpdate}
                          </span>
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Post Update
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 lg:min-w-[180px]">
                      <Link to={`/problem/${project.id}`}>
                        <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 w-full">
                          View Problem
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        className="border-gray-700 hover:bg-gray-800 text-white w-full"
                      >
                        Submit Solution
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="completed" className="space-y-6">
            {COMPLETED_PROJECTS.map((project) => (
              <div key={project.id} className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-emerald-500/5 rounded-2xl blur-xl" />
                <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">{project.title}</h3>
                      <div className="text-sm text-gray-400">
                        Completed on {project.completedDate}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400 mb-1">Total Earned</div>
                      <div className="text-2xl font-bold text-green-400">
                        ${project.earned.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        Bounty: ${project.bounty.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
