import { supabase } from "../../lib/supabaseClient";
import type { NotificationRow, ProblemPost, ProposalRecord } from "./marketplace";

export type WalletChain = "ethereum" | "polygon" | "arbitrum" | "solana";

export interface WalletRow {
  id: string;
  user_id: string;
  chain: WalletChain;
  address: string;
  is_primary: boolean;
  created_at: string;
}

export interface DashboardProfile {
  username: string;
  full_name: string | null;
  bio: string | null;
  reputation_score: number;
  user_type: string;
  created_at: string;
  wallet_address?: string | null;
  avatar_url?: string | null;
}

type DbProblem = Record<string, any>;
type DbProposal = Record<string, any>;

function throwIfError(error: { message?: string } | null) {
  if (error) throw new Error(error.message || "Supabase request failed");
}

function mapProblem(row: DbProblem): ProblemPost {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    category: row.category,
    requirements: row.requirements || [],
    budget: row.budget,
    budgetValue: Number(row.budget_value || 0),
    budgetSol: row.budget_sol == null ? null : Number(row.budget_sol),
    deadline: row.deadline,
    jobType: row.job_type,
    jobStatus: row.job_status,
    skillsRequired: row.skills_required || [],
    acceptedProposalId: row.accepted_proposal_id,
    acceptedBuilderId: row.accepted_builder_id,
    acceptedBuilderName: row.accepted_builder_name,
    acceptedBuilderWalletAddress: row.accepted_builder_wallet_address,
    author: row.author,
    authorId: row.author_id,
    upvotes: Number(row.upvotes || 0),
    proposals: Number(row.proposals || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    paymentTxHash: row.payment_tx_hash,
  };
}

function mapProposal(row: DbProposal): ProposalRecord {
  return {
    id: row.id,
    problemId: row.problem_id,
    title: row.title,
    description: row.description,
    briefSolution: row.brief_solution,
    builderId: row.builder_id,
    builderName: row.builder_name || "Anonymous Builder",
    projectUrl: row.project_url,
    timeline: row.timeline,
    cost: row.cost,
    expertise: row.expertise || [],
    status: row.status,
    proposedPriceSol: row.proposed_price_sol == null ? null : Number(row.proposed_price_sol),
    estimatedDelivery: row.estimated_delivery,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listProblems(filters: { category?: string; type?: string; sortBy?: string } = {}) {
  let query = supabase.from("problems").select("*");
  if (filters.category && filters.category !== "all") query = query.eq("category", filters.category);
  if (filters.type && filters.type !== "all") query = query.eq("type", filters.type);
  const { data, error } = await query;
  throwIfError(error);
  const problems = (data || []).map(mapProblem);
  const sortBy = filters.sortBy || "newest";
  problems.sort((a, b) => {
    if (sortBy === "upvotes") return b.upvotes - a.upvotes;
    if (sortBy === "proposals") return b.proposals - a.proposals;
    if (sortBy === "budget") return (b.budgetValue || 0) - (a.budgetValue || 0);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return problems;
}

export async function getProblem(problemId: string) {
  const { data, error } = await supabase.from("problems").select("*").eq("id", problemId).maybeSingle();
  throwIfError(error);
  return data ? mapProblem(data) : null;
}

export async function listProposals(problemId: string, acceptedProposalId?: string | null, acceptedWallet?: string | null) {
  const { data, error } = await supabase.from("proposals").select("*").eq("problem_id", problemId).order("created_at", { ascending: false });
  throwIfError(error);
  return (data || []).map((row) => ({
    ...mapProposal(row),
    builderWalletAddress: row.id === acceptedProposalId ? acceptedWallet || null : null,
    builderWallets: {},
  }));
}

export async function createProblem(input: {
  type: string; title: string; description: string; category: string; budget: string;
  requirements: string[]; deadline?: string | null; budgetSol?: number | null; jobType?: string | null; skillsRequired?: string[];
}) {
  const { data, error } = await supabase.rpc("create_problem", {
    p_type: input.type, p_title: input.title, p_description: input.description,
    p_category: input.category, p_budget: input.budget, p_requirements: input.requirements,
    p_deadline: input.deadline || null, p_budget_sol: input.budgetSol || null,
    p_job_type: input.jobType || null, p_skills_required: input.skillsRequired || [],
  });
  throwIfError(error);
  return mapProblem(data);
}

export async function createProposal(problemId: string, input: {
  title: string; description: string; briefSolution?: string; projectUrl?: string; timeline?: string;
  cost?: string; expertise?: string[]; proposedPriceSol?: number; estimatedDelivery?: string;
}) {
  const { data, error } = await supabase.rpc("create_proposal", {
    p_problem_id: problemId, p_title: input.title, p_description: input.description,
    p_brief_solution: input.briefSolution || null, p_project_url: input.projectUrl || null,
    p_timeline: input.timeline || null, p_cost: input.cost || null, p_expertise: input.expertise || [],
    p_proposed_price_sol: input.proposedPriceSol || null, p_estimated_delivery: input.estimatedDelivery || null,
  });
  throwIfError(error);
  return mapProposal(data);
}

export async function toggleProblemUpvote(problemId: string) {
  const { data, error } = await supabase.rpc("toggle_problem_upvote", { p_problem_id: problemId });
  throwIfError(error);
  return mapProblem(data);
}

export async function acceptProposal(problemId: string, proposalId: string) {
  const { data, error } = await supabase.rpc("accept_proposal", { p_problem_id: problemId, p_proposal_id: proposalId });
  throwIfError(error);
  return mapProblem(data);
}

export async function markJobComplete(problemId: string) {
  const { data, error } = await supabase.rpc("mark_job_complete", { p_problem_id: problemId });
  throwIfError(error);
  return mapProblem(data);
}

export async function recordJobPayment(problemId: string, amountSol: number, txHash: string, fromWalletAddress?: string) {
  const { data, error } = await supabase.rpc("record_job_payment", {
    p_problem_id: problemId, p_amount_sol: amountSol, p_tx_hash: txHash,
    p_from_wallet_address: fromWalletAddress || null,
  });
  throwIfError(error);
  return mapProblem(data);
}

export async function recordTip(proposalId: string, input: { amount: number; chain: string; currency: string; txHash?: string; message?: string; toWallet?: string }) {
  const { data, error } = await supabase.rpc("record_tip", {
    p_proposal_id: proposalId, p_amount: input.amount, p_chain: input.chain, p_currency: input.currency,
    p_tx_hash: input.txHash || null, p_message: input.message || null, p_to_wallet: input.toWallet || null,
  });
  throwIfError(error);
  return data;
}

export async function deleteProblem(problemId: string) {
  const { error } = await supabase.from("problems").delete().eq("id", problemId);
  throwIfError(error);
}

export async function listWallets(): Promise<WalletRow[]> {
  const { data, error } = await supabase.from("wallets").select("id,user_id,chain,address,is_primary,created_at").order("created_at");
  throwIfError(error);
  return (data || []) as WalletRow[];
}

export async function upsertPrimaryWallet(chain: WalletChain, address: string): Promise<WalletRow> {
  const { data: current, error: currentError } = await supabase.from("wallets").select("id").eq("chain", chain).eq("is_primary", true).maybeSingle();
  throwIfError(currentError);
  const { data: userData, error: userError } = await supabase.auth.getUser();
  throwIfError(userError);
  if (!userData.user) throw new Error("Authentication required");
  const request = current
    ? supabase.from("wallets").update({ address: address.trim(), is_primary: true }).eq("id", current.id).select().single()
    : supabase.from("wallets").insert({ user_id: userData.user.id, chain, address: address.trim(), is_primary: true }).select().single();
  const { data, error } = await request;
  throwIfError(error);
  return data as WalletRow;
}

export async function deleteWallet(walletId: string) {
  const { error } = await supabase.from("wallets").delete().eq("id", walletId);
  throwIfError(error);
}

export async function getPrimaryWallet(chain: WalletChain) {
  const wallets = await listWallets();
  return wallets.find((wallet) => wallet.chain === chain && wallet.is_primary)?.address || wallets.find((wallet) => wallet.chain === chain)?.address || null;
}

export async function getDashboardSnapshot(): Promise<{ profile: DashboardProfile | null; walletCount: number; notifications: NotificationRow[]; posts: ProblemPost[]; proposals: ProposalRecord[] }> {
  const [profileResult, walletResult, notificationResult, postResult, proposalResult] = await Promise.all([
    supabase.from("profiles").select("username,full_name,bio,reputation_score,user_type,created_at,wallet_address,avatar_url").maybeSingle(),
    supabase.from("wallets").select("id", { count: "exact", head: true }),
    supabase.from("notifications").select("id,message,link,is_read,created_at").order("created_at", { ascending: false }),
    supabase.from("problems").select("*").order("created_at", { ascending: false }),
    supabase.from("proposals").select("*").order("created_at", { ascending: false }),
  ]);
  throwIfError(profileResult.error); throwIfError(walletResult.error); throwIfError(notificationResult.error); throwIfError(postResult.error); throwIfError(proposalResult.error);
  const posts: ProblemPost[] = (postResult.data || []).map(mapProblem);
  const postById = new Map<string, ProblemPost>(posts.map((post) => [post.id, post]));
  const proposals = (proposalResult.data || []).map((row) => {
    const proposal = mapProposal(row);
    const post = postById.get(proposal.problemId);
    return { ...proposal, problemTitle: post?.title || "Unknown Problem", problemType: post?.type, jobStatus: post?.jobStatus, isAcceptedBuilder: post?.acceptedProposalId === proposal.id, tipTotal: 0 };
  });
  return { profile: profileResult.data as DashboardProfile | null, walletCount: walletResult.count || 0, notifications: (notificationResult.data || []) as NotificationRow[], posts, proposals };
}

export async function updateProfile(input: { full_name: string; bio: string }) {
  const { data, error } = await supabase.from("profiles").update(input).select("username,full_name,bio,reputation_score,user_type,created_at,wallet_address,avatar_url").single();
  throwIfError(error);
  return data as DashboardProfile;
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId);
  throwIfError(error);
}

export async function uploadAvatar(userId: string, file: File) {
  const extension = file.name.split(".").pop() || "png";
  const path = `${userId}/avatar-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: false, contentType: file.type });
  throwIfError(uploadError);
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const { error: profileError } = await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("user_id", userId);
  throwIfError(profileError);
  return data.publicUrl;
}

export async function getLeaderboard(limit = 20): Promise<Array<{ rank: number; builderId: string; builderName: string; proposalsSubmitted: number; proposalsAccepted: number; tipsReceived: number; reputationScore: number; tier: string }>> {
  const { data, error } = await supabase.rpc("get_leaderboard", { p_limit: limit });
  throwIfError(error);
  return (data || []).map((row: any, index: number) => ({
    rank: Number(row.rank || index + 1), builderId: row.builder_id, builderName: row.builder_name,
    proposalsSubmitted: Number(row.proposals_submitted || 0), proposalsAccepted: Number(row.proposals_accepted || 0),
    tipsReceived: Number(row.tips_received || 0), reputationScore: Number(row.reputation_score || 0), tier: row.tier,
  }));
}
