import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import {
  Clock,
  TrendingUp,
  User,
  Calendar,
  Send,
  Share2,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Loader2,
  X,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Navbar } from "./navbar";
import { authenticatedFetch, handleResponse } from "../../lib/auth-helper";
import { useAuth } from "../contexts/AuthContext";

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

interface Proposal {
  id: string;
  problemId: string;
  builderId: string;
  builderName: string;
  briefSolution: string;
  timeline?: string;
  cost?: string;
  expertise?: string[];
  upvotes?: number;
  tipTotal?: number;
  status?: string;
  createdAt: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  "AI/ML": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "Web3": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Finance": "bg-green-500/20 text-green-300 border-green-500/30",
  "Governance": "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "Trading": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "Infrastructure": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
};

const CHAINS = [
  { value: "ethereum", label: "Ethereum (ETH/USDC)" },
  { value: "polygon", label: "Polygon (MATIC/USDC)" },
  { value: "arbitrum", label: "Arbitrum (ETH/USDC)" },
  { value: "solana", label: "Solana (SOL/USDC)" },
];

function TipModal({
  proposal,
  onClose,
}: {
  proposal: Proposal;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [chain, setChain] = useState("ethereum");
  const [txHash, setTxHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    if (!amount || !txHash) {
      setError("Please fill in amount and transaction hash.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const res = await authenticatedFetch(`/api/proposals/${proposal.id}/tip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          currency: chain,
          txHash,
          chain,
          toWallet: proposal.builderId,
        }),
      });
      await handleResponse(res);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to record tip");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          <div className="text-center py-6">
            <CheckCircle className="w-14 h-14 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Tip Sent!</h3>
            <p className="text-gray-400 text-sm mb-4">
              Your tip to <strong className="text-white">{proposal.builderName}</strong> has been recorded.
            </p>
            {txHash && (
              <a
                href={`https://etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:underline"
              >
                View on Explorer <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <Button onClick={onClose} className="mt-4 w-full bg-cyan-500 hover:bg-cyan-600 text-white border-0">
              Close
            </Button>
          </div>
        ) : (
          <>
            <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-cyan-400" />
              Send Tip
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              Tip <strong className="text-white">{proposal.builderName}</strong> for their proposal
            </p>

            {error && (
              <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Quick amounts */}
              <div>
                <Label className="text-gray-300 mb-2 block text-sm">Quick Amount (USD)</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[10, 25, 50, 100].map((a) => (
                    <button
                      key={a}
                      onClick={() => setAmount(String(a))}
                      className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                        amount === String(a)
                          ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300"
                          : "border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white"
                      }`}
                    >
                      ${a}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="custom-amount" className="text-gray-300 mb-1.5 block text-sm">
                  Custom Amount ($)
                </Label>
                <Input
                  id="custom-amount"
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white"
                />
              </div>

              <div>
                <Label className="text-gray-300 mb-1.5 block text-sm">Network</Label>
                <Select value={chain} onValueChange={setChain}>
                  <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {CHAINS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tx-hash" className="text-gray-300 mb-1.5 block text-sm">
                  Transaction Hash
                </Label>
                <Input
                  id="tx-hash"
                  placeholder="0x... or signature"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Send the payment on-chain first, then paste the tx hash here.
                </p>
              </div>

              <Button
                onClick={handleSend}
                disabled={loading || !amount || !txHash}
                className="btn-shimmer w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Recording…
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Tip ${amount || "0"}
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ProposalCard({ proposal, onTip }: { proposal: Proposal; onTip: (p: Proposal) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card-hover bg-gray-800/40 border border-gray-700/60 hover:border-cyan-500/30 rounded-xl p-5 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border-2 border-gray-700">
            <AvatarFallback className="bg-gradient-to-br from-cyan-600 to-blue-700 text-white text-sm font-bold">
              {(proposal.builderName || "A").substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold text-white text-sm">{proposal.builderName || "Anonymous"}</div>
            {proposal.status && (
              <Badge
                className={`text-[10px] px-1.5 py-0 ${
                  proposal.status === "accepted"
                    ? "bg-green-500/20 text-green-300 border-green-500/30"
                    : proposal.status === "rejected"
                    ? "bg-red-500/20 text-red-300 border-red-500/30"
                    : "bg-gray-500/20 text-gray-300 border-gray-600/30"
                }`}
              >
                {proposal.status}
              </Badge>
            )}
          </div>
        </div>
        <div className="text-right">
          {proposal.tipTotal && proposal.tipTotal > 0 ? (
            <div className="text-xs text-cyan-400 font-medium">
              💰 ${proposal.tipTotal.toFixed(0)} tipped
            </div>
          ) : null}
        </div>
      </div>

      {/* Brief solution */}
      {proposal.briefSolution && (
        <div className="mb-3">
          <p className={`text-gray-300 text-sm ${!expanded ? "line-clamp-2" : ""}`}>
            {proposal.briefSolution}
          </p>
          {proposal.briefSolution.length > 120 && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 mt-1 transition-colors"
            >
              {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Read more</>}
            </button>
          )}
        </div>
      )}

      {/* Meta row */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-400 mb-4">
        {proposal.timeline && <span>⏱ {proposal.timeline}</span>}
        {proposal.cost && <span>💵 {proposal.cost}</span>}
        {proposal.expertise && proposal.expertise.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {proposal.expertise.slice(0, 4).map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 bg-gray-700/60 rounded text-gray-300 text-[10px]">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => onTip(proposal)}
          className="btn-shimmer bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 text-xs"
        >
          <DollarSign className="w-3.5 h-3.5 mr-1" />
          Send Tip
        </Button>
        <Button size="sm" variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800 text-xs">
          <TrendingUp className="w-3.5 h-3.5 mr-1" />
          {proposal.upvotes || 0}
        </Button>
      </div>
    </div>
  );
}

export function ProblemDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipTarget, setTipTarget] = useState<Proposal | null>(null);
  const [upvoted, setUpvoted] = useState(false);
  const [upvoteCount, setUpvoteCount] = useState(0);
  const [upvoteAnim, setUpvoteAnim] = useState(false);

  // Proposal form state
  const [proposalForm, setProposalForm] = useState({
    briefSolution: "",
    timeline: "",
    cost: "",
    expertise: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [problemRes, proposalsRes] = await Promise.all([
          authenticatedFetch(`/api/problems/${id}`, { method: "GET" }),
          authenticatedFetch(`/api/problems/${id}/proposals`, { method: "GET" }),
        ]);
        const problemData = await handleResponse(problemRes);
        const proposalsData = await handleResponse(proposalsRes);
        setProblem(problemData);
        setUpvoteCount(problemData.upvotes || 0);
        setProposals(
          Array.isArray(proposalsData.proposals)
            ? proposalsData.proposals
            : Array.isArray(proposalsData)
            ? proposalsData
            : []
        );
      } catch (err) {
        console.error("Error fetching problem:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  const handleUpvote = async () => {
    if (!id) return;
    setUpvoteAnim(true);
    setTimeout(() => setUpvoteAnim(false), 500);
    if (upvoted) {
      setUpvoted(false);
      setUpvoteCount((c) => c - 1);
      try {
        await authenticatedFetch(`/api/problems/${id}/upvote`, { method: "DELETE" });
      } catch {}
    } else {
      setUpvoted(true);
      setUpvoteCount((c) => c + 1);
      try {
        await authenticatedFetch(`/api/problems/${id}/upvote`, { method: "POST" });
      } catch {}
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  const handleSubmitProposal = async () => {
    if (!proposalForm.briefSolution.trim()) {
      setSubmitError("Please describe your solution approach.");
      return;
    }
    try {
      setSubmitting(true);
      setSubmitError("");
      const expertiseTags = proposalForm.expertise
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await authenticatedFetch(`/api/problems/${id}/proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Proposal for: ${problem?.title}`,
          description: proposalForm.briefSolution,
          briefSolution: proposalForm.briefSolution,
          timeline: proposalForm.timeline,
          cost: proposalForm.cost,
          expertise: expertiseTags,
          builderName: user?.username || user?.email || "Builder",
        }),
      });
      const data = await handleResponse(res);
      setProposals((prev) => [data, ...prev]);
      setSubmitSuccess(true);
      setProposalForm({ briefSolution: "", timeline: "", cost: "", expertise: "" });
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit proposal");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
          <p className="text-gray-400 mt-4">Loading problem…</p>
        </div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-white mb-2">Problem Not Found</h2>
          <p className="text-gray-400 mb-6">This problem may have been removed.</p>
          <Link to="/browse">
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Browse
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      <Navbar />

      {tipTarget && (
        <TipModal proposal={tipTarget} onClose={() => setTipTarget(null)} />
      )}

      <div className="container mx-auto px-4 py-10">
        {/* Breadcrumb */}
        <Link
          to="/browse"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Browse
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            {/* Problem header */}
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 fade-in">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge
                  className={`${
                    CATEGORY_COLORS[problem.category] ||
                    "bg-gray-500/20 text-gray-300 border-gray-500/30"
                  }`}
                >
                  {problem.category}
                </Badge>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  Active
                </Badge>
              </div>

              <h1 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                {problem.title}
              </h1>

              <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-6">
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  <span>Posted by {problem.author}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(problem.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Action row */}
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={handleUpvote}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                    upvoted
                      ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300"
                      : "border-gray-700 text-gray-300 hover:border-cyan-500/40 hover:text-cyan-400"
                  }`}
                >
                  <span className={`text-lg ${upvoteAnim ? "upvote-animate inline-block" : ""}`}>⬆</span>
                  <span className={`font-semibold ${upvoteAnim ? "number-flip" : ""}`}>{upvoteCount}</span>
                </button>
                <button
                  onClick={handleShare}
                  title="Copy link"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors text-sm"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-3 text-white">Problem Description</h3>
                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap mb-6">
                  {problem.description}
                </p>

                {problem.requirements && problem.requirements.length > 0 && (
                  <>
                    <h3 className="text-lg font-bold mb-3 text-white">Requirements</h3>
                    <ul className="space-y-2">
                      {problem.requirements.map((req, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                          <span className="text-cyan-400 mt-0.5 shrink-0">→</span>
                          {req}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>

            {/* Proposals section */}
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 fade-in stagger-1">
              <h2 className="text-2xl font-bold mb-6 text-white">
                {proposals.length} Proposal{proposals.length !== 1 ? "s" : ""} from Builders
              </h2>

              {proposals.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <div className="text-4xl mb-3">💡</div>
                  <p>No proposals yet. Be the first builder to submit!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {proposals.map((proposal) => (
                    <ProposalCard
                      key={proposal.id}
                      proposal={proposal}
                      onTip={setTipTarget}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Submit proposal form */}
            <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 fade-in stagger-2">
              <h2 className="text-xl font-bold mb-1 text-white">Submit Your Proposal</h2>
              <p className="text-gray-400 text-sm mb-5">
                Describe your approach to solving this problem.
              </p>

              {!user ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">Sign in to submit a proposal</p>
                  <Link to="/auth">
                    <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0">
                      Sign In
                    </Button>
                  </Link>
                </div>
              ) : submitSuccess ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-white font-semibold mb-1">Proposal Submitted!</p>
                  <p className="text-gray-400 text-sm">The problem poster will review it shortly.</p>
                  <button
                    onClick={() => setSubmitSuccess(false)}
                    className="mt-4 text-sm text-cyan-400 hover:text-cyan-300"
                  >
                    Submit another
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {submitError && (
                    <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                      {submitError}
                    </div>
                  )}
                  <div>
                    <Label className="text-gray-300 mb-1.5 block text-sm">
                      Your Solution Approach *
                    </Label>
                    <Textarea
                      value={proposalForm.briefSolution}
                      onChange={(e) => setProposalForm({ ...proposalForm, briefSolution: e.target.value })}
                      placeholder="Describe how you'd solve this problem…"
                      className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white min-h-[120px] resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300 mb-1.5 block text-sm">Timeline</Label>
                      <Input
                        value={proposalForm.timeline}
                        onChange={(e) => setProposalForm({ ...proposalForm, timeline: e.target.value })}
                        placeholder="e.g. 2 weeks"
                        className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300 mb-1.5 block text-sm">Cost Estimate</Label>
                      <Input
                        value={proposalForm.cost}
                        onChange={(e) => setProposalForm({ ...proposalForm, cost: e.target.value })}
                        placeholder="e.g. $500"
                        className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-300 mb-1.5 block text-sm">
                      Expertise Tags (comma-separated)
                    </Label>
                    <Input
                      value={proposalForm.expertise}
                      onChange={(e) => setProposalForm({ ...proposalForm, expertise: e.target.value })}
                      placeholder="e.g. React, Python, AI"
                      className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white"
                    />
                  </div>
                  <Button
                    onClick={handleSubmitProposal}
                    disabled={submitting}
                    className="btn-shimmer w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 font-semibold"
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</>
                    ) : (
                      <><Send className="w-4 h-4 mr-2" />Submit Proposal</>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Bounty card */}
            <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 fade-in">
              <div className="text-center mb-5">
                <div className="text-sm text-gray-400 mb-1">Bounty</div>
                <div className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  {problem.budget}
                </div>
              </div>

              <div className="space-y-3 mb-5 text-sm">
                {[
                  { label: "Upvotes", val: upvoteCount },
                  { label: "Proposals", val: proposals.length },
                ].map(({ label, val }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-gray-400">{label}</span>
                    <span className="text-white font-medium">{val}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => {
                  document
                    .getElementById("proposal-form")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="btn-glow btn-shimmer w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 font-semibold"
              >
                Submit Proposal
              </Button>
            </div>

            {/* Quick tip card */}
            {proposals.length > 0 && (
              <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-800 rounded-2xl p-5 fade-in stagger-1">
                <h3 className="text-base font-bold mb-2 text-white">Quick Tip</h3>
                <p className="text-xs text-gray-400 mb-3">
                  Support a builder making progress on this problem
                </p>
                <div className="space-y-2">
                  {proposals.slice(0, 3).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setTipTarget(p)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-gray-800/40 hover:bg-gray-800/70 border border-gray-700/50 hover:border-cyan-500/30 rounded-lg text-sm transition-all"
                    >
                      <span className="text-gray-300 truncate">{p.builderName}</span>
                      <span className="text-cyan-400 text-xs font-medium shrink-0 ml-2">Tip →</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
