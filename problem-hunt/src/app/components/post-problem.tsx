import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Briefcase, Calendar, Coins, FileText, Lightbulb, Tag } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../../../lib/supabaseClient";
import { API_ENDPOINTS } from "../../lib/api-config";
import { Navbar } from "./navbar";
import { splitListInput } from "../../lib/marketplace";

const CATEGORIES = ["AI/ML", "Web3", "Finance", "Governance", "Trading", "Infrastructure"];
const JOB_TYPES = [
  { value: "one-time", label: "One-Time" },
  { value: "contract", label: "Contract" },
  { value: "ongoing", label: "Ongoing" },
];

export function PostProblem() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    type: "problem",
    title: "",
    description: "",
    requirements: "",
    category: "",
    budget: "",
    budgetSol: "",
    deadline: "",
    jobType: "",
    skillsRequired: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isJob = formData.type === "job";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading || !user) {
      setError("Please wait for authentication to complete before posting.");
      return;
    }

    if (isJob && (!formData.budgetSol || !formData.deadline || !formData.jobType)) {
      setError("Jobs require a budget in SOL, deadline, and job type.");
      return;
    }

    if (!isJob && !formData.budget) {
      setError("Problem posts still require a bounty.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const payload = {
        type: formData.type,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        requirements: formData.requirements,
        deadline: formData.deadline || null,
        author: user?.username || user?.email || "Anonymous User",
        ...(isJob
          ? {
              budget: `${formData.budgetSol} SOL`,
              budgetSol: Number(formData.budgetSol),
              jobType: formData.jobType,
              skillsRequired: splitListInput(formData.skillsRequired),
            }
          : {
              budget: formData.budget,
            }),
      };

      const response = await fetch(API_ENDPOINTS.PROBLEMS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API Error ${response.status}: ${await response.text()}`);
      }

      const problem = await response.json();
      navigate(`/problem/${problem.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      <Navbar />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Post a Brief, Task, or Bounty
            </h1>
            <p className="text-gray-400 text-lg">
              Use problem posts for open-ended asks, or paid tasks when you already know the work and want a builder to take it over.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 rounded-2xl blur-xl" />
              <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
                <Label className="text-white mb-3 block">Post Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      value: "problem",
                      title: "Open Brief",
                      description: "A problem, request, or technical ask that needs a smart solution.",
                      icon: Lightbulb,
                    },
                    {
                      value: "job",
                      title: "Paid Task",
                      description: "Scoped builder work with proposal acceptance and direct SOL payout.",
                      icon: Briefcase,
                    },
                  ].map((option) => {
                    const Icon = option.icon;
                    const active = formData.type === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData((current) => ({ ...current, type: option.value }))}
                        className={`rounded-xl border p-4 text-left transition-colors ${
                          active
                            ? "border-cyan-500/60 bg-cyan-500/10"
                            : "border-gray-700 bg-gray-800/40 hover:border-gray-600"
                        }`}
                      >
                        <div className="flex items-center gap-2 text-white font-semibold mb-1">
                          <Icon className="w-4 h-4" />
                          {option.title}
                        </div>
                        <p className="text-sm text-gray-400">{option.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 rounded-2xl blur-xl" />
              <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
                <Label htmlFor="title" className="text-white mb-2 block">
                  {isJob ? "Task Title *" : "Brief Title *"}
                </Label>
                <Input
                  id="title"
                  placeholder={
                    isJob
                      ? "e.g., Harden our Kubernetes deployment pipeline"
                      : "e.g., Need a better Terraform drift detection workflow"
                  }
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white placeholder:text-gray-500"
                  required
                />
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-2xl blur-xl" />
              <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
                <Label htmlFor="description" className="text-white mb-2 block">
                  <FileText className="w-4 h-4 inline mr-2" />
                  {isJob ? "Task Scope *" : "Brief Description *"}
                </Label>
                <Textarea
                  id="description"
                  placeholder={
                    isJob
                      ? "Describe the deliverable, constraints, and what success looks like..."
                      : "Describe the problem, request, or blocker you want someone to solve..."
                  }
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white placeholder:text-gray-500 min-h-[150px]"
                  required
                />
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-2xl blur-xl" />
              <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
                <Label htmlFor="requirements" className="text-white mb-2 block">
                  Requirements
                </Label>
                <Textarea
                  id="requirements"
                  placeholder="List the key requirements, one per line"
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white placeholder:text-gray-500 min-h-[120px]"
                />
              </div>
            </div>

            <div className={`grid gap-6 ${isJob ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
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
                  <Label htmlFor={isJob ? "budgetSol" : "budget"} className="text-white mb-2 block">
                    <Coins className="w-4 h-4 inline mr-2" />
                    {isJob ? "Budget (SOL) *" : "Bounty *"}
                  </Label>
                  <Input
                    id={isJob ? "budgetSol" : "budget"}
                    type={isJob ? "number" : "text"}
                    step={isJob ? "0.000001" : undefined}
                    placeholder={isJob ? "3.5" : "$500 / 1 SOL / tip-friendly"}
                    value={isJob ? formData.budgetSol : formData.budget}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        [isJob ? "budgetSol" : "budget"]: e.target.value,
                      })
                    }
                    className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white placeholder:text-gray-500"
                    required
                  />
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-2xl blur-xl" />
                <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
                  <Label htmlFor="deadline" className="text-white mb-2 block">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Deadline {isJob ? "*" : ""}
                  </Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white"
                    required={isJob}
                  />
                </div>
              </div>
            </div>

            {isJob && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 rounded-2xl blur-xl" />
                  <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
                    <Label htmlFor="jobType" className="text-white mb-2 block">
                      <Briefcase className="w-4 h-4 inline mr-2" />
                      Job Type *
                    </Label>
                    <Select
                      value={formData.jobType}
                      onValueChange={(value) => setFormData({ ...formData, jobType: value })}
                    >
                      <SelectTrigger className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white">
                        <SelectValue placeholder="Select the engagement type" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700 text-white">
                        {JOB_TYPES.map((jobType) => (
                          <SelectItem key={jobType.value} value={jobType.value}>
                            {jobType.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-2xl blur-xl" />
                  <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
                    <Label htmlFor="skillsRequired" className="text-white mb-2 block">
                      Skills Required
                    </Label>
                    <Input
                      id="skillsRequired"
                      placeholder="Terraform, Kubernetes, GitHub Actions"
                      value={formData.skillsRequired}
                      onChange={(e) => setFormData({ ...formData, skillsRequired: e.target.value })}
                      className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white placeholder:text-gray-500"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-2xl blur-xl" />
              <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
                <div className="mb-4">
                  <h3 className="font-bold text-white mb-2">What happens next</h3>
                  <ul className="space-y-1 text-sm text-gray-400">
                    <li>Problem posts keep the current community proposal and tipping flow.</li>
                    <li>Job posts let you accept one builder, track completion, and pay them directly in SOL.</li>
                    <li>Tips stay available on both post types.</li>
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
                    disabled={isSubmitting || isLoading || !user}
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Posting..." : isJob ? "Post Job" : "Post Problem"}
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
