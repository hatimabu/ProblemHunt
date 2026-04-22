import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Briefcase, Calendar, Coins, FileText, Rocket, Tag } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../../../lib/supabaseClient";
import { API_ENDPOINTS } from "../../lib/api-config";
import { Navbar } from "./navbar";
import { splitListInput } from "../../lib/marketplace";

const CATEGORIES = ["AI/ML", "Web3", "Finance", "Governance", "Trading", "Infrastructure"];
const JOB_TYPES = [
  { value: "one-time", label: "One-time" },
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isLoading || !user) { setError("Please wait for authentication to complete before posting."); return; }
    if (isJob && (!formData.budgetSol || !formData.deadline || !formData.jobType)) { setError("Jobs require a budget in SOL, deadline, and job type."); return; }
    if (!isJob && !formData.budget) { setError("Problem posts still require a bounty."); return; }

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
          ? { budget: `${formData.budgetSol} SOL`, budgetSol: Number(formData.budgetSol), jobType: formData.jobType, skillsRequired: splitListInput(formData.skillsRequired) }
          : { budget: formData.budget }),
      };
      const response = await fetch(API_ENDPOINTS.PROBLEMS, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`API Error ${response.status}: ${await response.text()}`);
      const problem = await response.json();
      navigate(`/problem/${problem.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="board-app">
      <Navbar />

      <main className="board-container py-8 md:py-10">
        <section className="grid gap-8 border-b border-[color:var(--board-line)] pb-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div className="flex items-center gap-2">
              <Rocket className="h-4 w-4 text-[var(--board-metal-steel)]" />
              <p className="board-kicker">New Listing</p>
            </div>
            <h1 className="board-title mt-3">Post a brief, a scoped task, or a bounty.</h1>
            <p className="board-copy mt-5">
              Keep the title sharp, write the scope like someone will price it, and make the payout path obvious before builders respond.
            </p>
          </div>

          <aside className="space-y-5">
            <div className="board-stat">
              <div className="board-stat__value">{isJob ? "Job" : "Brief"}</div>
              <div className="board-stat__label">Current listing type</div>
            </div>
            <div className="board-stat">
              <div className="board-stat__value">{isJob ? "SOL" : "Flexible"}</div>
              <div className="board-stat__label">Primary payout mode</div>
            </div>
            <div className="board-stat">
              <div className="board-stat__value">Clear</div>
              <div className="board-stat__label">Scope beats hype here</div>
            </div>
          </aside>
        </section>

        <form onSubmit={handleSubmit} className="board-section px-0">
          {error ? (
            <div className="mb-6 rounded-lg border border-[color:rgba(201,84,94,0.34)] bg-[rgba(201,84,94,0.12)] px-4 py-3 text-sm text-[var(--board-accent)]">
              {error}
            </div>
          ) : null}

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-8">
              <section className="board-panel p-6 md:p-8">
                <p className="board-kicker">Type</p>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {[
                    { value: "problem", title: "Problem brief", copy: "Use this when you want ideas, approaches, or broad technical help around a blocker." },
                    { value: "job", title: "Paid task", copy: "Use this when the work is scoped enough to accept one builder and pay them directly." },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData((current) => ({ ...current, type: option.value }))}
                      className={`border px-5 py-5 text-left transition-all ${
                        formData.type === option.value
                          ? "border-[color:rgba(201,84,94,0.34)] bg-[rgba(201,84,94,0.14)]"
                          : "border-[color:var(--board-line)] bg-[var(--board-panel)] hover:bg-[var(--board-panel-strong)]"
                      }`}
                    >
                      <p className="font-display text-2xl font-semibold tracking-[-0.04em] text-[var(--board-ink)]">{option.title}</p>
                      <p className="mt-2 text-sm leading-7 text-[var(--board-muted)]">{option.copy}</p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="board-panel p-6 md:p-8">
                <div className="grid gap-6">
                  <div>
                    <Label htmlFor="title" className="mb-2 block text-sm text-[var(--board-ink)]">
                      <FileText className="mr-2 inline h-4 w-4 text-[var(--board-accent)]" />
                      {isJob ? "Task title" : "Brief title"}
                    </Label>
                    <Input id="title" placeholder={isJob ? "Harden our CI deployment workflow" : "Need a better Terraform drift workflow"} value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="board-field" required />
                  </div>
                  <div>
                    <Label htmlFor="description" className="mb-2 block text-sm text-[var(--board-ink)]">Scope</Label>
                    <Textarea id="description" placeholder={isJob ? "Describe the deliverable, constraints, handoff, and what done means." : "Describe the problem, why it matters, and what kind of help you want."} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="board-field min-h-[170px]" required />
                  </div>
                  <div>
                    <Label htmlFor="requirements" className="mb-2 block text-sm text-[var(--board-ink)]">Requirements</Label>
                    <Textarea id="requirements" placeholder="List the must-haves, one per line." value={formData.requirements} onChange={(e) => setFormData({ ...formData, requirements: e.target.value })} className="board-field min-h-[130px]" />
                  </div>
                </div>
              </section>

              <section className="board-panel p-6 md:p-8">
                <div className={`grid gap-6 ${isJob ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
                  <div>
                    <Label htmlFor="category" className="mb-2 block text-sm text-[var(--board-ink)]">
                      <Tag className="mr-2 inline h-4 w-4 text-[var(--board-accent)]" />
                      Category
                    </Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger className="board-field text-[var(--board-ink)]"><SelectValue placeholder="Select a category" /></SelectTrigger>
                      <SelectContent className="border-[color:var(--board-line-strong)] bg-[var(--board-panel-strong)] text-[var(--board-ink)]">
                        {CATEGORIES.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor={isJob ? "budgetSol" : "budget"} className="mb-2 block text-sm text-[var(--board-ink)]">
                      <Coins className="mr-2 inline h-4 w-4 text-[var(--board-accent)]" />
                      {isJob ? "Budget (SOL)" : "Bounty"}
                    </Label>
                    <Input id={isJob ? "budgetSol" : "budget"} type={isJob ? "number" : "text"} step={isJob ? "0.000001" : undefined} placeholder={isJob ? "3.5" : "$900 / 1.25 SOL / fixed fee"} value={isJob ? formData.budgetSol : formData.budget} onChange={(e) => setFormData({ ...formData, [isJob ? "budgetSol" : "budget"]: e.target.value })} className="board-field" required />
                  </div>
                  <div>
                    <Label htmlFor="deadline" className="mb-2 block text-sm text-[var(--board-ink)]">
                      <Calendar className="mr-2 inline h-4 w-4 text-[var(--board-accent)]" />
                      Deadline
                    </Label>
                    <Input id="deadline" type="date" value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} className="board-field" required={isJob} />
                  </div>
                </div>
                {isJob ? (
                  <div className="mt-6 grid gap-6 md:grid-cols-2">
                    <div>
                      <Label htmlFor="jobType" className="mb-2 block text-sm text-[var(--board-ink)]">
                        <Briefcase className="mr-2 inline h-4 w-4 text-[var(--board-accent)]" />
                        Job type
                      </Label>
                      <Select value={formData.jobType} onValueChange={(value) => setFormData({ ...formData, jobType: value })}>
                        <SelectTrigger className="board-field text-[var(--board-ink)]"><SelectValue placeholder="Select engagement type" /></SelectTrigger>
                        <SelectContent className="border-[color:var(--board-line-strong)] bg-[var(--board-panel-strong)] text-[var(--board-ink)]">
                          {JOB_TYPES.map((jobType) => <SelectItem key={jobType.value} value={jobType.value}>{jobType.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="skillsRequired" className="mb-2 block text-sm text-[var(--board-ink)]">Skills required</Label>
                      <Input id="skillsRequired" placeholder="Terraform, Kubernetes, GitHub Actions" value={formData.skillsRequired} onChange={(e) => setFormData({ ...formData, skillsRequired: e.target.value })} className="board-field" />
                    </div>
                  </div>
                ) : null}
              </section>
            </div>

            <aside className="space-y-6">
              <section className="board-panel p-6">
                <p className="board-kicker">Preview</p>
                <div className="mt-5 border-t border-[color:var(--board-line)] pt-5">
                  <p className="board-eyebrow">{formData.category || "Category"}</p>
                  <h2 className="board-subtitle mt-3 text-[1.8rem]">{formData.title || "Your listing title will show here"}</h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--board-muted)]">{formData.description || "A strong scope reads like someone can estimate the work after one pass."}</p>
                </div>
              </section>

              <section className="board-panel p-6">
                <p className="board-kicker">Checklist</p>
                <div className="mt-5 space-y-4 text-sm leading-7 text-[var(--board-muted)]">
                  <p>State the deliverable, not just the mood of the project.</p>
                  <p>Use the requirements section for constraints and non-negotiables.</p>
                  <p>For jobs, include a real deadline and a payout in SOL.</p>
                </div>
              </section>

              <div className="flex flex-col gap-3">
                <Link to="/browse">
                  <Button variant="outline" className="board-btn-secondary h-11 w-full border-[color:var(--board-line-strong)] bg-transparent text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-muted)] hover:bg-[var(--board-panel-strong)] hover:text-[var(--board-ink)]">Cancel</Button>
                </Link>
                <Button type="submit" disabled={isSubmitting || isLoading || !user} className="board-btn-primary h-11 border-0 bg-[var(--board-accent)] text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50">
                  {isSubmitting ? "Posting..." : isJob ? "Post job" : "Post brief"}
                </Button>
              </div>
            </aside>
          </div>
        </form>
      </main>
    </div>
  );
}
