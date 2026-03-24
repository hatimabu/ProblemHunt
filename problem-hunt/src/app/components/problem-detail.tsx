import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowUp, Briefcase, Calendar, ExternalLink, Loader2, Send, Wallet } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Navbar } from "./navbar";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../../../lib/supabaseClient";
import { API_ENDPOINTS } from "../../lib/api-config";
import {
  explorerUrlForChain,
  formatBudget,
  formatJobStatus,
  formatSol,
  formatTimeAgo,
  isJobPost,
  shortWallet,
  splitListInput,
  type ProblemPost,
  type ProposalRecord,
} from "../../lib/marketplace";
import { connectSolanaWallet, sendSolTransfer } from "../../lib/solana-payments";
import { getUserSolanaWallet, syncUserSolanaWallet } from "../../lib/wallets";

const EMPTY_PROPOSAL_FORM = {
  title: "",
  description: "",
  briefSolution: "",
  timeline: "",
  estimatedDelivery: "",
  cost: "",
  proposedPriceSol: "",
  projectUrl: "",
  expertise: "",
};

const EMPTY_TIP_FORM = {
  amount: "",
  chain: "solana",
  txHash: "",
  message: "",
};

export function ProblemDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [problem, setProblem] = useState<ProblemPost | null>(null);
  const [proposals, setProposals] = useState<ProposalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upvotePending, setUpvotePending] = useState(false);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [selectedTipProposal, setSelectedTipProposal] = useState<ProposalRecord | null>(null);
  const [proposalForm, setProposalForm] = useState(EMPTY_PROPOSAL_FORM);
  const [tipForm, setTipForm] = useState(EMPTY_TIP_FORM);
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [actionPending, setActionPending] = useState<"accept" | "complete" | "pay" | null>(null);
  const [mySolanaWallet, setMySolanaWallet] = useState<string | null>(null);

  const isJob = isJobPost(problem);
  const isOwner = !!user && !!problem && user.id === problem.authorId;
  const acceptedProposal = useMemo(
    () => proposals.find((proposal) => proposal.id === problem?.acceptedProposalId) || null,
    [problem, proposals]
  );
  const isAcceptedBuilder = !!user && !!acceptedProposal && acceptedProposal.builderId === user.id;

  const getToken = async () => (await supabase.auth.getSession()).data.session?.access_token;

  const fetchData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const token = await getToken();
      const [problemResponse, proposalsResponse] = await Promise.all([
        fetch(API_ENDPOINTS.PROBLEM_BY_ID(id), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(API_ENDPOINTS.PROPOSALS(id), { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!problemResponse.ok || !proposalsResponse.ok) {
        throw new Error("Failed to load post details");
      }
      const problemData = await problemResponse.json();
      const proposalData = await proposalsResponse.json();
      setProblem(problemData);
      setProposals(Array.isArray(proposalData.proposals) ? proposalData.proposals : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load post");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    const loadWallet = async () => {
      setMySolanaWallet(user ? await getUserSolanaWallet(user.id) : null);
    };
    loadWallet();
  }, [user]);

  const handleProposalSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id) return;
    try {
      setSubmittingProposal(true);
      const token = await getToken();
      const response = await fetch(API_ENDPOINTS.PROPOSALS(id), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: proposalForm.title,
          description: proposalForm.description,
          briefSolution: proposalForm.briefSolution,
          timeline: proposalForm.timeline || proposalForm.estimatedDelivery,
          estimatedDelivery: proposalForm.estimatedDelivery,
          cost: proposalForm.cost,
          proposedPriceSol: proposalForm.proposedPriceSol ? Number(proposalForm.proposedPriceSol) : undefined,
          projectUrl: proposalForm.projectUrl || undefined,
          expertise: splitListInput(proposalForm.expertise),
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      setProposalForm(EMPTY_PROPOSAL_FORM);
      setShowProposalForm(false);
      setStatusMessage("Proposal submitted successfully.");
      await fetchData();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to submit proposal");
    } finally {
      setSubmittingProposal(false);
    }
  };

  const handleTipSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTipProposal) return;
    try {
      const token = await getToken();
      const response = await fetch(API_ENDPOINTS.TIP_PROPOSAL(selectedTipProposal.id), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          amount: Number(tipForm.amount),
          currency: tipForm.chain === "solana" ? "SOL" : tipForm.chain.toUpperCase(),
          txHash: tipForm.txHash,
          chain: tipForm.chain,
          message: tipForm.message,
          toWallet: selectedTipProposal.builderWallets?.[tipForm.chain] || selectedTipProposal.builderWalletAddress,
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      setStatusMessage(`Tip recorded: ${explorerUrlForChain(tipForm.chain, tipForm.txHash)}`);
      setSelectedTipProposal(null);
      setTipForm(EMPTY_TIP_FORM);
      await fetchData();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to record tip");
    }
  };

  const runAction = async (kind: "accept" | "complete" | "pay", fn: () => Promise<void>) => {
    try {
      setActionPending(kind);
      await fn();
      await fetchData();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionPending(null);
    }
  };

  const handleUpvote = async () => {
    if (!id) return;
    try {
      setUpvotePending(true);
      const token = await getToken();
      let response = await fetch(API_ENDPOINTS.UPVOTE_PROBLEM(id), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 409) {
        response = await fetch(API_ENDPOINTS.REMOVE_UPVOTE(id), {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      if (!response.ok) throw new Error(await response.text());
      await fetchData();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to update upvote");
    } finally {
      setUpvotePending(false);
    }
  };

  const handlePayBuilder = async () => {
    if (!id || !user || !acceptedProposal || !problem) return;
    const amountSol = acceptedProposal.proposedPriceSol || problem.budgetSol;
    if (!amountSol || !acceptedProposal.builderWalletAddress) throw new Error("Missing payout amount or builder wallet.");
    const wallet = await connectSolanaWallet();
    await syncUserSolanaWallet(user.id, wallet.address);
    setMySolanaWallet(wallet.address);
    const transfer = await sendSolTransfer({ provider: wallet.provider, toAddress: acceptedProposal.builderWalletAddress, amountSol });
    const token = await getToken();
    const response = await fetch(API_ENDPOINTS.RECORD_PAYMENT(id), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ txHash: transfer.signature, amountSol, fromWalletAddress: transfer.fromAddress }),
    });
    if (!response.ok) throw new Error(await response.text());
    setStatusMessage(`Payment recorded: ${transfer.signature}`);
  };

  if (loading) {
    return <div className="min-h-screen bg-[#0a0a0f] text-gray-100"><Navbar /><div className="container mx-auto px-4 py-16 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div></div>;
  }
  if (error || !problem) {
    return <div className="min-h-screen bg-[#0a0a0f] text-gray-100"><Navbar /><div className="container mx-auto px-4 py-16"><div className="max-w-2xl mx-auto bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-red-300">{error || "Post not found"}</div></div></div>;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.8fr_1fr] gap-8">
          <div className="space-y-6">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge className="bg-gray-800 text-gray-300 border-gray-700">{problem.category}</Badge>
                {isJob && <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30"><Briefcase className="w-3 h-3 mr-1" />JOB</Badge>}
                {isJob && problem.jobStatus && <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">{formatJobStatus(problem.jobStatus)}</Badge>}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{problem.title}</h1>
              <p className="text-gray-300 leading-7 whitespace-pre-wrap">{problem.description}</p>
              <div className="flex flex-wrap gap-4 text-sm text-gray-400 mt-5">
                <span>Posted by {problem.author || "Anonymous"}</span>
                <span>{formatTimeAgo(problem.createdAt)}</span>
                <span>{problem.proposals} proposals</span>
                <span>{problem.upvotes} upvotes</span>
              </div>
              {statusMessage && <div className="mt-6 bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3 text-sm text-cyan-200">{statusMessage}</div>}
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-white">Proposals</h2>
                {user && <Button onClick={() => setShowProposalForm((open) => !open)} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0"><Send className="w-4 h-4 mr-2" />{showProposalForm ? "Hide Form" : "Submit Proposal"}</Button>}
              </div>

              {showProposalForm && (
                <form onSubmit={handleProposalSubmit} className="space-y-4 rounded-2xl border border-gray-800 bg-gray-950/40 p-5 mb-5">
                  {isJob && !mySolanaWallet && <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-200">Add a Solana wallet in your dashboard before taking on jobs so the poster can pay you directly.</div>}
                  <div><Label className="mb-2 block">Title</Label><Input value={proposalForm.title} onChange={(e) => setProposalForm({ ...proposalForm, title: e.target.value })} className="bg-gray-800 border-gray-700 text-white" required /></div>
                  <div><Label className="mb-2 block">Proposal</Label><Textarea value={proposalForm.description} onChange={(e) => setProposalForm({ ...proposalForm, description: e.target.value })} className="bg-gray-800 border-gray-700 text-white min-h-[120px]" required /></div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div><Label className="mb-2 block">Brief Solution</Label><Input value={proposalForm.briefSolution} onChange={(e) => setProposalForm({ ...proposalForm, briefSolution: e.target.value })} className="bg-gray-800 border-gray-700 text-white" /></div>
                    <div><Label className="mb-2 block">{isJob ? "Estimated Delivery" : "Timeline"}</Label><Input value={isJob ? proposalForm.estimatedDelivery : proposalForm.timeline} onChange={(e) => setProposalForm({ ...proposalForm, [isJob ? "estimatedDelivery" : "timeline"]: e.target.value })} className="bg-gray-800 border-gray-700 text-white" required={isJob} /></div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div><Label className="mb-2 block">{isJob ? "Proposed Price (SOL)" : "Cost"}</Label><Input type={isJob ? "number" : "text"} step={isJob ? "0.000001" : undefined} value={isJob ? proposalForm.proposedPriceSol : proposalForm.cost} onChange={(e) => setProposalForm({ ...proposalForm, [isJob ? "proposedPriceSol" : "cost"]: e.target.value })} className="bg-gray-800 border-gray-700 text-white" required={isJob} /></div>
                    <div><Label className="mb-2 block">Project URL</Label><Input value={proposalForm.projectUrl} onChange={(e) => setProposalForm({ ...proposalForm, projectUrl: e.target.value })} className="bg-gray-800 border-gray-700 text-white" /></div>
                  </div>
                  <div><Label className="mb-2 block">Skills / Expertise</Label><Input value={proposalForm.expertise} onChange={(e) => setProposalForm({ ...proposalForm, expertise: e.target.value })} placeholder="Terraform, AWS, Kubernetes" className="bg-gray-800 border-gray-700 text-white" /></div>
                  <Button type="submit" disabled={submittingProposal} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0">{submittingProposal ? "Submitting..." : "Submit Proposal"}</Button>
                </form>
              )}

              <div className="space-y-4">
                {proposals.length === 0 ? <div className="text-gray-400 text-sm rounded-xl border border-dashed border-gray-700 p-6">No proposals yet. Be the first builder to respond.</div> : proposals.map((proposal) => (
                  <div key={proposal.id} className="rounded-2xl border border-gray-800 bg-gray-950/40 p-5">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-white">{proposal.builderName}</h3>
                          <Badge className={proposal.status === "accepted" ? "bg-green-500/20 text-green-300 border-green-500/30" : proposal.status === "rejected" ? "bg-red-500/20 text-red-300 border-red-500/30" : "bg-gray-800 text-gray-300 border-gray-700"}>{proposal.status || "pending"}</Badge>
                        </div>
                        <p className="text-gray-300 whitespace-pre-wrap">{proposal.briefSolution || proposal.description}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400 mt-3">
                          {proposal.proposedPriceSol ? <span className="text-cyan-300">{formatSol(proposal.proposedPriceSol)} SOL</span> : proposal.cost ? <span>{proposal.cost}</span> : null}
                          {proposal.estimatedDelivery && <span>{proposal.estimatedDelivery}</span>}
                          {proposal.tipTotal ? <span>{formatSol(proposal.tipTotal)} tipped</span> : null}
                          {proposal.builderWalletAddress && <span className="text-emerald-300">Wallet {shortWallet(proposal.builderWalletAddress)}</span>}
                        </div>
                        {proposal.projectUrl && <a href={proposal.projectUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-cyan-300 hover:text-cyan-200 mt-3">View project <ExternalLink className="w-3.5 h-3.5" /></a>}
                      </div>
                      <div className="flex flex-col items-start md:items-end gap-2">
                        <Button variant="outline" onClick={() => { setSelectedTipProposal(proposal); setTipForm(EMPTY_TIP_FORM); }} className="border-gray-700 text-white hover:bg-gray-800">Tip Builder</Button>
                        {isJob && isOwner && problem.jobStatus === "open" && <Button onClick={() => runAction("accept", async () => { const token = await getToken(); const response = await fetch(API_ENDPOINTS.ACCEPT_PROPOSAL(id!, proposal.id), { method: "POST", headers: { Authorization: `Bearer ${token}` } }); if (!response.ok) throw new Error(await response.text()); setStatusMessage("Proposal accepted."); })} disabled={actionPending === "accept"} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0">{actionPending === "accept" ? "Accepting..." : "Accept Proposal"}</Button>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Post Summary</h2>
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex items-center justify-between"><span>{isJob ? "Budget" : "Bounty"}</span><span className="font-semibold text-cyan-300">{formatBudget(problem)}</span></div>
                {problem.deadline && <div className="flex items-center justify-between"><span className="inline-flex items-center gap-2"><Calendar className="w-4 h-4" />Deadline</span><span>{new Date(problem.deadline).toLocaleDateString()}</span></div>}
                {isJob && problem.jobType && <div className="flex items-center justify-between"><span>Job type</span><span>{problem.jobType}</span></div>}
                {acceptedProposal?.builderWalletAddress && <div className="flex items-center justify-between"><span>Accepted wallet</span><span>{shortWallet(acceptedProposal.builderWalletAddress)}</span></div>}
              </div>
              <div className="mt-6 space-y-3">
                <Button variant="outline" onClick={handleUpvote} disabled={upvotePending} className="w-full border-gray-700 text-white hover:bg-gray-800"><ArrowUp className="w-4 h-4 mr-2" />{upvotePending ? "Updating..." : "Upvote"}</Button>
                {isJob && isAcceptedBuilder && problem.jobStatus === "in_progress" && <Button onClick={() => runAction("complete", async () => { const token = await getToken(); const response = await fetch(API_ENDPOINTS.MARK_JOB_COMPLETE(id!), { method: "POST", headers: { Authorization: `Bearer ${token}` } }); if (!response.ok) throw new Error(await response.text()); setStatusMessage("Job marked complete."); })} disabled={actionPending === "complete"} className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0">{actionPending === "complete" ? "Marking..." : "Mark as Complete"}</Button>}
                {isJob && isOwner && problem.jobStatus === "completed" && <Button onClick={() => runAction("pay", handlePayBuilder)} disabled={actionPending === "pay"} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0"><Wallet className="w-4 h-4 mr-2" />{actionPending === "pay" ? "Paying..." : "Pay Builder"}</Button>}
                <Link to="/browse" className="block"><Button variant="outline" className="w-full border-gray-700 text-white hover:bg-gray-800">Back to Browse</Button></Link>
              </div>
            </div>

            {selectedTipProposal && (
              <form onSubmit={handleTipSubmit} className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 space-y-4">
                <h2 className="text-xl font-semibold text-white">Tip {selectedTipProposal.builderName}</h2>
                <div><Label className="mb-2 block">Amount</Label><Input type="number" min="0" step="0.000001" value={tipForm.amount} onChange={(e) => setTipForm({ ...tipForm, amount: e.target.value })} className="bg-gray-800 border-gray-700 text-white" required /></div>
                <div><Label className="mb-2 block">Chain</Label><select value={tipForm.chain} onChange={(e) => setTipForm({ ...tipForm, chain: e.target.value as typeof tipForm.chain })} className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-white"><option value="solana">Solana</option><option value="ethereum">Ethereum</option><option value="polygon">Polygon</option><option value="arbitrum">Arbitrum</option></select></div>
                <div><Label className="mb-2 block">Transaction Hash</Label><Input value={tipForm.txHash} onChange={(e) => setTipForm({ ...tipForm, txHash: e.target.value })} className="bg-gray-800 border-gray-700 text-white" required /></div>
                <div><Label className="mb-2 block">Message</Label><Textarea value={tipForm.message} onChange={(e) => setTipForm({ ...tipForm, message: e.target.value })} className="bg-gray-800 border-gray-700 text-white" /></div>
                <div className="rounded-xl border border-gray-800 bg-gray-950/40 p-3 text-sm text-gray-400">Send the tip directly first, then paste the transaction hash here so it is stored with the proposal.</div>
                <div className="flex gap-3"><Button type="submit" className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0">Record Tip</Button><Button type="button" variant="outline" onClick={() => setSelectedTipProposal(null)} className="flex-1 border-gray-700 text-white hover:bg-gray-800">Cancel</Button></div>
              </form>
            )}

            {isJob && (
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
                <h2 className="text-xl font-semibold text-white mb-3">SOL Payment Flow</h2>
                <div className="space-y-2 text-sm text-gray-400">
                  <p>1. Owner accepts one proposal.</p>
                  <p>2. Builder marks the job complete.</p>
                  <p>3. Owner pays directly from Phantom or Solflare.</p>
                  <p>4. The tx hash is saved and the job is marked paid.</p>
                </div>
                {mySolanaWallet && <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">Your Solana wallet: {shortWallet(mySolanaWallet)}</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
