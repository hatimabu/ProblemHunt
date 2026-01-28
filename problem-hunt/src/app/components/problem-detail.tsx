import { useState } from "react";
import { Link, useParams } from "react-router";
import { Code, Clock, DollarSign, TrendingUp, User, Calendar, Send, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

// Mock data
const MOCK_PROBLEM = {
  id: "1",
  title: "AI-Powered Code Review Tool for Web3 Projects",
  description:
    "Need a tool that can automatically review smart contract code and identify potential security vulnerabilities using AI/ML models. The tool should integrate with popular development environments and provide actionable feedback. It should support Solidity, Rust, and other smart contract languages.",
  requirements: [
    "Support for Solidity and Rust smart contracts",
    "Integration with VS Code and other IDEs",
    "Real-time vulnerability detection",
    "Detailed security reports with severity levels",
    "CI/CD pipeline integration",
  ],
  bounty: 5000,
  currency: "USD",
  deadline: "14 days",
  category: "AI/ML",
  postedBy: "crypto_dev_42",
  postedDate: "Jan 18, 2026",
  status: "active",
};

const MOCK_BUILDERS = [
  {
    id: "1",
    name: "alice_builds",
    avatar: "AB",
    reputation: 4.8,
    completedProjects: 23,
    progress: 45,
    lastUpdate: "2 hours ago",
    totalTips: 450,
    updates: [
      {
        id: "1",
        content: "Completed the Solidity parser module. Now working on the vulnerability detection engine using GPT-4.",
        timestamp: "2 hours ago",
        tips: 120,
      },
      {
        id: "2",
        content: "Initial prototype with basic syntax analysis is ready. Testing with sample contracts.",
        timestamp: "1 day ago",
        tips: 85,
      },
    ],
  },
  {
    id: "2",
    name: "web3_wizard",
    avatar: "WW",
    reputation: 4.6,
    completedProjects: 18,
    progress: 30,
    lastUpdate: "5 hours ago",
    totalTips: 320,
    updates: [
      {
        id: "1",
        content: "Built the core infrastructure using LangChain. Integrating with OpenAI's API for vulnerability detection.",
        timestamp: "5 hours ago",
        tips: 95,
      },
    ],
  },
  {
    id: "3",
    name: "solidity_sage",
    avatar: "SS",
    reputation: 4.9,
    completedProjects: 31,
    progress: 60,
    lastUpdate: "1 hour ago",
    totalTips: 680,
    updates: [
      {
        id: "1",
        content: "MVP is ready! Check out the demo: https://demo.example.com - Supports Solidity with 95% accuracy.",
        timestamp: "1 hour ago",
        tips: 250,
      },
      {
        id: "2",
        content: "Implemented the VS Code extension. Working on the CI/CD integration next.",
        timestamp: "8 hours ago",
        tips: 150,
      },
    ],
  },
];

export function ProblemDetail() {
  const { id } = useParams();
  const [tipAmount, setTipAmount] = useState("");

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
                    {MOCK_PROBLEM.category}
                  </Badge>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>
                </div>

                <h1 className="text-4xl font-bold mb-4 text-white">{MOCK_PROBLEM.title}</h1>

                <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-6">
                  <div className="flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    <span>Posted by {MOCK_PROBLEM.postedBy}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>{MOCK_PROBLEM.postedDate}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>{MOCK_PROBLEM.deadline} left</span>
                  </div>
                </div>

                <div className="prose prose-invert max-w-none">
                  <h3 className="text-xl font-bold mb-3 text-white">Problem Description</h3>
                  <p className="text-gray-300 leading-relaxed mb-6">{MOCK_PROBLEM.description}</p>

                  <h3 className="text-xl font-bold mb-3 text-white">Requirements</h3>
                  <ul className="space-y-2">
                    {MOCK_PROBLEM.requirements.map((req, index) => (
                      <li key={index} className="text-gray-300 flex items-start gap-2">
                        <span className="text-cyan-400 mt-1">→</span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Builders & Progress */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-2xl blur-xl" />
              <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8">
                <h2 className="text-2xl font-bold mb-6 text-white">
                  Active Builders ({MOCK_BUILDERS.length})
                </h2>

                <div className="space-y-6">
                  {MOCK_BUILDERS.map((builder) => (
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
                  <div className="text-sm text-gray-400 mb-2">Total Bounty</div>
                  <div className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                    ${MOCK_PROBLEM.bounty.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">{MOCK_PROBLEM.currency}</div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Time Remaining</span>
                    <span className="text-white font-medium">{MOCK_PROBLEM.deadline}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Active Builders</span>
                    <span className="text-white font-medium">{MOCK_BUILDERS.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Total Tips Given</span>
                    <span className="text-cyan-400 font-medium">
                      ${MOCK_BUILDERS.reduce((sum, b) => sum + b.totalTips, 0)}
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
