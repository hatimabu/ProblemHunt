import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowUp, Calendar, ExternalLink, Loader2, Send, Trash2, Wallet } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
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

const EMPTY_PROPOSAL_FORM = { title: "", description: "", briefSolution: "", timeline: "", estimatedDelivery: "", cost: "", proposedPriceSol: "", projectUrl: "", expertise: "" };
const EMPTY_TIP_FORM = { amount: "", chain: "solana", txHash: "", message: "" };
const primaryBtn = "h-11 rounded-none border border-[color:rgba(15,118,110,0.24)] bg-[var(--board-accent)] px-5 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-[color:#0d625c]";
const secondaryBtn = "h-11 rounded-none border-[color:var(--board-line-strong)] bg-white/56 px-5 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-ink)] hover:bg-white";
const field = "board-field rounded-none";

function MetaPill({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "accent" | "rust" }) {
  return <span className={`board-pill ${tone === "accent" ? "board-pill--accent" : tone === "rust" ? "board-pill--rust" : ""}`}>{children}</span>;
}

export function ProblemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
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
  const [deletePending, setDeletePending] = useState(false);
  const [mySolanaWallet, setMySolanaWallet] = useState<string | null>(null);

  const isJob = isJobPost(problem);
  const isOwner = !!user && !!problem && user.id === problem.authorId;
  const acceptedProposal = useMemo(() => proposals.find((proposal) => proposal.id === problem?.acceptedProposalId) || null, [problem, proposals]);
  const isAcceptedBuilder = !!user && !!acceptedProposal && acceptedProposal.builderId === user.id;
  const getToken = async () => (await supabase.auth.getSession()).data.session?.access_token;

  const fetchData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const token = await getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [problemResponse, proposalsResponse] = await Promise.all([
        fetch(API_ENDPOINTS.PROBLEM_BY_ID(id), { headers }),
        fetch(API_ENDPOINTS.PROPOSALS(id), { headers }),
      ]);
      if (!problemResponse.ok || !proposalsResponse.ok) throw new Error("Failed to load post details");
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

  useEffect(() => { fetchData(); }, [id]);
  useEffect(() => { const loadWallet = async () => setMySolanaWallet(user ? await getUserSolanaWallet(user.id) : null); loadWallet(); }, [user]);

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
      let response = await fetch(API_ENDPOINTS.UPVOTE_PROBLEM(id), { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (response.status === 409) {
        response = await fetch(API_ENDPOINTS.REMOVE_UPVOTE(id), { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
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

  const handleDeleteProblem = async () => {
    if (!id || !user || !problem) return;

    const confirmed = window.confirm(
      `Delete "${problem.title}"? This will also remove its proposals, upvotes, and tips.`
    );
    if (!confirmed) {
      return;
    }

    try {
      setDeletePending(true);
      const token = await getToken();
      const response = await fetch(API_ENDPOINTS.DELETE_PROBLEM(id), {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to delete post");
      }

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Failed to delete post");
    } finally {
      setDeletePending(false);
    }
  };

  if (loading) return <div className="board-app"><Navbar /><div className="board-container flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[var(--board-accent)]" /></div></div>;
  if (error || !problem) return <div className="board-app"><Navbar /><div className="board-container py-16"><div className="border border-[color:rgba(178,103,55,0.2)] bg-[rgba(178,103,55,0.08)] px-6 py-5 text-[var(--board-rust)]">{error || "Post not found"}</div></div></div>;

  return (
    <div className="board-app">
      <Navbar />
      <main className="board-container py-8 md:py-10">
        <section className="grid gap-8 border-b border-[color:var(--board-line)] pb-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <div className="flex flex-wrap gap-2">
              <MetaPill>{problem.category}</MetaPill>
              {isJob ? <MetaPill tone="accent">Paid task</MetaPill> : <MetaPill>Problem brief</MetaPill>}
              {isJob && problem.jobStatus ? <MetaPill tone="rust">{formatJobStatus(problem.jobStatus)}</MetaPill> : null}
            </div>
            <h1 className="board-title mt-5">{problem.title}</h1>
            <p className="mt-5 max-w-4xl whitespace-pre-wrap text-base leading-8 text-[var(--board-muted)]">{problem.description}</p>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--board-soft)]">
              <span>Posted by {problem.author || "Anonymous"}</span>
              <span>{formatTimeAgo(problem.createdAt)}</span>
              <span>{problem.proposals} proposals</span>
              <span>{problem.upvotes} upvotes</span>
            </div>
            {statusMessage ? <div className="mt-6 border border-[color:rgba(15,118,110,0.18)] bg-[rgba(15,118,110,0.08)] px-4 py-3 text-sm text-[var(--board-accent)]">{statusMessage}</div> : null}
          </div>
          <aside className="space-y-5">
            <div className="board-stat board-stat--spotlight"><div className="board-stat__value">{formatBudget(problem)}</div><div className="board-stat__label">{isJob ? "Budget" : "Bounty"}</div></div>
            {problem.deadline ? <div className="board-stat"><div className="board-stat__value">{new Date(problem.deadline).toLocaleDateString()}</div><div className="board-stat__label">Deadline</div></div> : null}
            {isJob && problem.jobType ? <div className="board-stat"><div className="board-stat__value">{problem.jobType}</div><div className="board-stat__label">Job type</div></div> : null}
          </aside>
        </section>

        <section className="board-section px-0">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.55fr)_320px]">
            <div>
              <div className="flex flex-col gap-4 border-b border-[color:var(--board-line)] pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="board-kicker">Proposals</p>
                  <h2 className="board-subtitle mt-3">Builders responding to this brief.</h2>
                </div>
                {user ? <Button onClick={() => setShowProposalForm((open) => !open)} className={primaryBtn}><Send className="mr-2 h-4 w-4" />{showProposalForm ? "Hide form" : "Submit proposal"}</Button> : null}
              </div>

              {showProposalForm ? (
                <form onSubmit={handleProposalSubmit} className="board-panel mt-6 p-6 md:p-8">
                  {isJob && !mySolanaWallet ? <div className="mb-5 border border-[color:rgba(191,147,81,0.24)] bg-[rgba(191,147,81,0.08)] px-4 py-3 text-sm text-[#8c6229]">Add a Solana wallet in your dashboard before taking on jobs so the requester can pay you directly.</div> : null}
                  <div className="grid gap-5">
                    <div><Label className="mb-2 block text-sm text-[var(--board-ink)]">Title</Label><Input value={proposalForm.title} onChange={(event) => setProposalForm({ ...proposalForm, title: event.target.value })} className={field} required /></div>
                    <div><Label className="mb-2 block text-sm text-[var(--board-ink)]">Proposal</Label><Textarea value={proposalForm.description} onChange={(event) => setProposalForm({ ...proposalForm, description: event.target.value })} className="board-field min-h-[140px] rounded-none" required /></div>
                    <div className="grid gap-5 md:grid-cols-2">
                      <div><Label className="mb-2 block text-sm text-[var(--board-ink)]">Brief solution</Label><Input value={proposalForm.briefSolution} onChange={(event) => setProposalForm({ ...proposalForm, briefSolution: event.target.value })} className={field} /></div>
                      <div><Label className="mb-2 block text-sm text-[var(--board-ink)]">{isJob ? "Estimated delivery" : "Timeline"}</Label><Input value={isJob ? proposalForm.estimatedDelivery : proposalForm.timeline} onChange={(event) => setProposalForm({ ...proposalForm, [isJob ? "estimatedDelivery" : "timeline"]: event.target.value })} className={field} required={isJob} /></div>
                    </div>
                    <div className="grid gap-5 md:grid-cols-2">
                      <div><Label className="mb-2 block text-sm text-[var(--board-ink)]">{isJob ? "Proposed price (SOL)" : "Cost"}</Label><Input type={isJob ? "number" : "text"} step={isJob ? "0.000001" : undefined} value={isJob ? proposalForm.proposedPriceSol : proposalForm.cost} onChange={(event) => setProposalForm({ ...proposalForm, [isJob ? "proposedPriceSol" : "cost"]: event.target.value })} className={field} required={isJob} /></div>
                      <div><Label className="mb-2 block text-sm text-[var(--board-ink)]">Project URL</Label><Input value={proposalForm.projectUrl} onChange={(event) => setProposalForm({ ...proposalForm, projectUrl: event.target.value })} className={field} /></div>
                    </div>
                    <div><Label className="mb-2 block text-sm text-[var(--board-ink)]">Skills / expertise</Label><Input value={proposalForm.expertise} onChange={(event) => setProposalForm({ ...proposalForm, expertise: event.target.value })} placeholder="Terraform, AWS, Kubernetes" className={field} /></div>
                    <Button type="submit" disabled={submittingProposal} className={primaryBtn}>{submittingProposal ? "Submitting..." : "Submit proposal"}</Button>
                  </div>
                </form>
              ) : null}

              <div className="mt-6 border-t border-[color:var(--board-line)]">
                {proposals.length === 0 ? (
                  <div className="board-empty"><h3 className="board-subtitle">No proposals yet.</h3><p>Be the first builder to respond to this brief.</p></div>
                ) : (
                  proposals.map((proposal) => (
                    <article key={proposal.id} className="board-row">
                      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_180px] md:items-start">
                        <div>
                          <div className="flex flex-wrap gap-2">
                            <MetaPill>{proposal.builderName}</MetaPill>
                            <MetaPill tone={proposal.status === "accepted" ? "accent" : proposal.status === "rejected" ? "rust" : "default"}>{proposal.status || "pending"}</MetaPill>
                          </div>
                          <p className="mt-4 whitespace-pre-wrap text-base leading-8 text-[var(--board-ink)]">{proposal.briefSolution || proposal.description}</p>
                          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--board-muted)]">
                            {proposal.proposedPriceSol ? <span>{formatSol(proposal.proposedPriceSol)} SOL</span> : proposal.cost ? <span>{proposal.cost}</span> : null}
                            {proposal.estimatedDelivery ? <span>{proposal.estimatedDelivery}</span> : null}
                            {proposal.tipTotal ? <span>{formatSol(proposal.tipTotal)} tipped</span> : null}
                            {proposal.builderWalletAddress ? <span>Wallet {shortWallet(proposal.builderWalletAddress)}</span> : null}
                          </div>
                          {proposal.projectUrl ? <a href={proposal.projectUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm text-[var(--board-accent)]">View project<ExternalLink className="h-3.5 w-3.5" /></a> : null}
                        </div>
                        <div className="flex flex-col gap-3 md:items-end">
                          <Button variant="outline" onClick={() => { setSelectedTipProposal(proposal); setTipForm(EMPTY_TIP_FORM); }} className={secondaryBtn}>Tip builder</Button>
                          {isJob && isOwner && problem.jobStatus === "open" ? <Button onClick={() => runAction("accept", async () => {
                            const token = await getToken();
                            const response = await fetch(API_ENDPOINTS.ACCEPT_PROPOSAL(id!, proposal.id), { method: "POST", headers: { Authorization: `Bearer ${token}` } });
                            if (!response.ok) throw new Error(await response.text());
                            setStatusMessage("Proposal accepted.");
                          })} disabled={actionPending === "accept"} className={primaryBtn}>{actionPending === "accept" ? "Accepting..." : "Accept proposal"}</Button> : null}
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
            <aside className="space-y-6">
              <section className="board-panel board-panel--command p-6">
                <p className="board-kicker">Summary</p>
                <div className="mt-5 space-y-4 text-sm text-[var(--board-muted)]">
                  <div className="flex items-center justify-between gap-3 border-b border-[color:var(--board-line)] pb-3"><span>{isJob ? "Budget" : "Bounty"}</span><span className="font-semibold text-[var(--board-ink)]">{formatBudget(problem)}</span></div>
                  {problem.deadline ? <div className="flex items-center justify-between gap-3 border-b border-[color:var(--board-line)] pb-3"><span className="inline-flex items-center gap-2"><Calendar className="h-4 w-4" />Deadline</span><span className="text-[var(--board-ink)]">{new Date(problem.deadline).toLocaleDateString()}</span></div> : null}
                  {isJob && problem.jobType ? <div className="flex items-center justify-between gap-3 border-b border-[color:var(--board-line)] pb-3"><span>Job type</span><span className="text-[var(--board-ink)]">{problem.jobType}</span></div> : null}
                  {acceptedProposal?.builderWalletAddress ? <div className="flex items-center justify-between gap-3"><span>Accepted wallet</span><span className="text-[var(--board-ink)]">{shortWallet(acceptedProposal.builderWalletAddress)}</span></div> : null}
                </div>
              </section>

              <section className="board-panel board-panel--command p-6">
                <p className="board-kicker">Actions</p>
                <div className="board-action-cluster mt-5">
                <Button variant="outline" onClick={handleUpvote} disabled={upvotePending} className={`w-full ${secondaryBtn}`}><ArrowUp className="mr-2 h-4 w-4" />{upvotePending ? "Updating..." : "Upvote"}</Button>
                {isJob && isAcceptedBuilder && problem.jobStatus === "in_progress" ? <Button onClick={() => runAction("complete", async () => {
                  const token = await getToken();
                  const response = await fetch(API_ENDPOINTS.MARK_JOB_COMPLETE(id!), { method: "POST", headers: { Authorization: `Bearer ${token}` } });
                  if (!response.ok) throw new Error(await response.text());
                  setStatusMessage("Job marked complete.");
                })} disabled={actionPending === "complete"} className={`w-full ${primaryBtn}`}>{actionPending === "complete" ? "Marking..." : "Mark complete"}</Button> : null}
                {isJob && isOwner && problem.jobStatus === "completed" ? <Button onClick={() => runAction("pay", handlePayBuilder)} disabled={actionPending === "pay"} className={`w-full ${primaryBtn}`}><Wallet className="mr-2 h-4 w-4" />{actionPending === "pay" ? "Paying..." : "Pay builder"}</Button> : null}
                {isOwner ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDeleteProblem}
                    disabled={deletePending}
                    className="board-danger-btn w-full"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {deletePending ? "Deleting..." : "Delete post"}
                  </Button>
                ) : null}
                <Link to="/browse" className="block"><Button variant="outline" className={`w-full ${secondaryBtn}`}>Back to browse</Button></Link>
                </div>
              </section>

              {selectedTipProposal ? (
                <form onSubmit={handleTipSubmit} className="board-panel p-6">
                  <p className="board-kicker">Tip builder</p>
                  <h3 className="mt-3 font-display text-2xl font-semibold tracking-[-0.05em] text-[var(--board-ink)]">{selectedTipProposal.builderName}</h3>
                  <div className="mt-5 space-y-4">
                    <div><Label className="mb-2 block text-sm text-[var(--board-ink)]">Amount</Label><Input type="number" min="0" step="0.000001" value={tipForm.amount} onChange={(event) => setTipForm({ ...tipForm, amount: event.target.value })} className={field} required /></div>
                    <div><Label className="mb-2 block text-sm text-[var(--board-ink)]">Chain</Label><select value={tipForm.chain} onChange={(event) => setTipForm({ ...tipForm, chain: event.target.value as typeof tipForm.chain })} className="board-field h-12 w-full rounded-none px-3"><option value="solana">Solana</option><option value="ethereum">Ethereum</option><option value="polygon">Polygon</option><option value="arbitrum">Arbitrum</option></select></div>
                    <div><Label className="mb-2 block text-sm text-[var(--board-ink)]">Transaction hash</Label><Input value={tipForm.txHash} onChange={(event) => setTipForm({ ...tipForm, txHash: event.target.value })} className={field} required /></div>
                    <div><Label className="mb-2 block text-sm text-[var(--board-ink)]">Message</Label><Textarea value={tipForm.message} onChange={(event) => setTipForm({ ...tipForm, message: event.target.value })} className="board-field min-h-[110px] rounded-none" /></div>
                  </div>
                  <div className="mt-5 border border-[color:var(--board-line)] bg-white/42 px-4 py-3 text-sm text-[var(--board-muted)]">Send the tip directly first, then paste the transaction hash here so the payment is attached to the proposal.</div>
                  <div className="mt-5 flex gap-3"><Button type="submit" className={`flex-1 ${primaryBtn}`}>Record tip</Button><Button type="button" variant="outline" onClick={() => setSelectedTipProposal(null)} className={`flex-1 ${secondaryBtn}`}>Cancel</Button></div>
                </form>
              ) : null}

              {isJob ? (
                <section className="board-panel p-6">
                  <p className="board-kicker">Payment flow</p>
                  <div className="mt-5 space-y-3 text-sm leading-7 text-[var(--board-muted)]">
                    <p>1. Owner accepts one proposal.</p>
                    <p>2. Builder marks the job complete.</p>
                    <p>3. Owner pays directly from Phantom or Solflare.</p>
                    <p>4. The transaction hash is recorded and the job is marked paid.</p>
                  </div>
                  {mySolanaWallet ? <div className="mt-5 border border-[color:rgba(15,118,110,0.18)] bg-[rgba(15,118,110,0.08)] px-4 py-3 text-sm text-[var(--board-accent)]">Your Solana wallet: {shortWallet(mySolanaWallet)}</div> : null}
                </section>
              ) : null}
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}
