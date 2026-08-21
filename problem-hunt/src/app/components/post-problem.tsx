import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Briefcase, Calendar, CheckCircle2, Coins, FileText, ShieldCheck, Tag } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useAuth } from "../contexts/AuthContext";
import { Navbar } from "./navbar";
import { splitListInput } from "../../lib/marketplace";
import { createProblem } from "../../lib/supabase-marketplace";

const CATEGORIES = ["AI/ML", "Web3", "Finance", "Governance", "Trading", "Infrastructure", "Security", "Data Engineering", "DevOps", "Backend", "Frontend", "Mobile", "Automation"];
const JOB_TYPES = [
  { value: "one-time", label: "One-time" },
  { value: "contract", label: "Contract" },
  { value: "ongoing", label: "Ongoing" },
];

export function PostProblem() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requirements: "",
    category: "",
    budgetSol: "",
    deadline: "",
    jobType: "",
    skillsRequired: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isLoading || !user) { setError("Please wait for authentication to complete before posting."); return; }
    if (!formData.budgetSol || Number(formData.budgetSol) <= 0 || !formData.deadline || !formData.jobType || !formData.category) { setError("Jobs require a category, positive SOL payment, deadline, and job type."); return; }

    setIsSubmitting(true);
    setError(null);

    try {
      const problem = await createProblem({
        type: "job",
        title: formData.title,
        description: formData.description,
        category: formData.category,
        requirements: splitListInput(formData.requirements),
        deadline: formData.deadline || null,
        budget: `${formData.budgetSol} SOL`, budgetSol: Number(formData.budgetSol), jobType: formData.jobType, skillsRequired: splitListInput(formData.skillsRequired),
      });
      navigate(`/problem/${problem.id}`);
    } catch (err) {
      let msg = err instanceof Error ? err.message : "Failed to create post";
      setError(msg);
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
            <p className="board-kicker">Create paid job</p>
            <h1 className="board-title mt-3">Set a clear scope. Pay the builder directly.</h1>
            <p className="board-copy mt-5">
              Publish one paid task, accept one builder, and approve the final SOL transfer from Phantom or Solflare once the work is complete.
            </p>
          </div>

          <aside className="space-y-5">
            <div className="board-stat">
              <div className="board-stat__value">Paid job</div>
              <div className="board-stat__label">Listing type</div>
            </div>
            <div className="board-stat">
              <div className="board-stat__value">SOL</div>
              <div className="board-stat__label">Direct wallet payment</div>
            </div>
            <div className="board-stat">
              <div className="board-stat__value">On-chain</div>
              <div className="board-stat__label">Transaction hash recorded</div>
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
                <div className="grid gap-6">
                  <div>
                    <Label htmlFor="title" className="mb-2 flex items-center gap-2 text-sm text-[var(--board-ink)]">
                      <FileText className="h-4 w-4 text-white" />
                      Job title
                    </Label>
                    <Input id="title" placeholder="Harden our CI deployment workflow" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="board-field" required />
                  </div>
                  <div>
                    <Label htmlFor="description" className="mb-2 block text-sm text-[var(--board-ink)]">Deliverable and scope</Label>
                    <Textarea id="description" placeholder="Describe the deliverable, constraints, handoff, and what done means." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="board-field min-h-[170px]" required />
                  </div>
                  <div>
                    <Label htmlFor="requirements" className="mb-2 block text-sm text-[var(--board-ink)]">Requirements</Label>
                    <Textarea id="requirements" placeholder="List the must-haves, one per line." value={formData.requirements} onChange={(e) => setFormData({ ...formData, requirements: e.target.value })} className="board-field min-h-[130px]" />
                  </div>
                </div>
              </section>

              <section className="board-panel p-6 md:p-8">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <Label htmlFor="category" className="mb-2 flex items-center gap-2 text-sm text-[var(--board-ink)]">
                      <Tag className="h-4 w-4 text-white" />
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
                    <Label htmlFor="budgetSol" className="mb-2 flex items-center gap-2 text-sm text-[var(--board-ink)]">
                      <Coins className="h-4 w-4 text-white" />
                      Agreed payment (SOL)
                    </Label>
                    <Input id="budgetSol" type="number" min="0.000001" step="0.000001" placeholder="3.5" value={formData.budgetSol} onChange={(e) => setFormData({ ...formData, budgetSol: e.target.value })} className="board-field" required />
                  </div>
                  <div>
                    <Label htmlFor="deadline" className="mb-2 flex items-center gap-2 text-sm text-[var(--board-ink)]">
                      <Calendar className="h-4 w-4 text-white" />
                      Deadline
                    </Label>
                    <Input id="deadline" type="date" value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} className="board-field" required />
                  </div>
                </div>
                <div className="mt-6 grid gap-6 md:grid-cols-2">
                    <div>
                      <Label htmlFor="jobType" className="mb-2 flex items-center gap-2 text-sm text-[var(--board-ink)]">
                        <Briefcase className="h-4 w-4 text-white" />
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
                  <p>Include a real deadline and the exact SOL payment.</p>
                  <p className="flex gap-2 text-[var(--board-ink)]"><ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-emerald-400" />After completion, approve the transfer in Phantom or Solflare. The transaction hash is saved to this job.</p>
                </div>
              </section>

              <section className="board-panel p-6">
                <p className="board-kicker">Payment flow</p>
                <div className="mt-5 space-y-3 text-sm leading-6 text-[var(--board-muted)]">
                  <p className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-400" />Accept one proposal.</p>
                  <p className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-400" />Builder marks the work complete.</p>
                  <p className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-400" />Approve payment in Phantom or Solflare; the transaction hash marks the job paid.</p>
                </div>
              </section>

              <div className="flex flex-col gap-3">
                <Link to="/browse">
                  <Button variant="outline" className="h-11 w-full border-[color:var(--board-line-strong)] bg-transparent text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-muted)] transition-all hover:bg-[var(--board-panel-strong)] hover:text-[var(--board-ink)] hover:shadow-[0_0_20px_rgba(200,205,208,0.35)] hover:scale-[1.02]">Back to browse</Button>
                </Link>
                <Button type="submit" disabled={isSubmitting || isLoading || !user} className="h-11 border-0 bg-[var(--board-accent)] text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[#10140D] transition-all hover:bg-[var(--color-accent-hover)] hover:shadow-[0_0_20px_rgba(200,205,208,0.35)] hover:scale-[1.02] disabled:opacity-50">
                  {isSubmitting ? "Publishing..." : "Publish paid job"}
                </Button>
              </div>
            </aside>
          </div>
        </form>
      </main>
    </div>
  );
}
