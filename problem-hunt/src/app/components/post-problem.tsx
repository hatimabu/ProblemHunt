import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Code, DollarSign, Calendar, FileText, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = ["AI/ML", "Web3", "Finance", "Governance", "Trading", "Infrastructure"];

export function PostProblem() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requirements: "",
    category: "",
    bounty: "",
    deadline: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/CreateProblem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          budget: formData.bounty,
          requirements: formData.requirements,
          deadline: formData.deadline,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create problem');
      }

      const problem = await response.json();
      // Navigate to the newly created problem
      navigate(`/problem/${problem.id}`);
    } catch (err) {
      console.error('Error posting problem:', err);
      setError(err instanceof Error ? err.message : 'Failed to post problem');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Post a Problem
            </h1>
            <p className="text-gray-400 text-lg">
              Define your problem, set a bounty, and let builders compete to solve it
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Title */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 rounded-2xl blur-xl" />
              <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
                <Label htmlFor="title" className="text-white mb-2 block">
                  Problem Title *
                </Label>
                <Input
                  id="title"
                  placeholder="e.g., AI-Powered Code Review Tool for Web3 Projects"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white placeholder:text-gray-500"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-2xl blur-xl" />
              <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
                <Label htmlFor="description" className="text-white mb-2 block">
                  <FileText className="w-4 h-4 inline mr-2" />
                  Problem Description *
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe the problem you need solved in detail..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white placeholder:text-gray-500 min-h-[150px]"
                  required
                />
              </div>
            </div>

            {/* Requirements */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-2xl blur-xl" />
              <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
                <Label htmlFor="requirements" className="text-white mb-2 block">
                  Requirements
                </Label>
                <Textarea
                  id="requirements"
                  placeholder="List the key requirements (one per line)"
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white placeholder:text-gray-500 min-h-[120px]"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Enter each requirement on a new line
                </p>
              </div>
            </div>

            {/* Category and Bounty */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 rounded-2xl blur-xl" />
                <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
                  <Label htmlFor="category" className="text-white mb-2 block">
                    <Tag className="w-4 h-4 inline mr-2" />
                    Category *
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                    required
                  >
                    <SelectTrigger className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category} className="hover:bg-gray-700">
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-2xl blur-xl" />
                <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
                  <Label htmlFor="bounty" className="text-white mb-2 block">
                    <DollarSign className="w-4 h-4 inline mr-2" />
                    Bounty (USD) *
                  </Label>
                  <Input
                    id="bounty"
                    type="number"
                    placeholder="5000"
                    value={formData.bounty}
                    onChange={(e) => setFormData({ ...formData, bounty: e.target.value })}
                    className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white placeholder:text-gray-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Deadline */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-2xl blur-xl" />
              <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
                <Label htmlFor="deadline" className="text-white mb-2 block">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Deadline *
                </Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white"
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-2xl blur-xl" />
              <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
                <div className="mb-4">
                  <h3 className="font-bold text-white mb-2">Important Notes</h3>
                  <ul className="space-y-1 text-sm text-gray-400">
                    <li>• Bounty will be held in escrow until solution is delivered</li>
                    <li>• Builders must create an account and post progress to receive tips</li>
                    <li>• If no solution is delivered by deadline, bounty is refunded</li>
                    <li>• Tips given to builders are non-refundable</li>
                  </ul>
                </div>

                <div className="flex gap-4">
                  <Link to="/browse" className="flex-1">
                    <Button variant="outline" className="w-full border-gray-700 hover:bg-gray-800 text-white">
                      Cancel
                    </Button>
                  </Link>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Posting...' : 'Post Problem'}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
