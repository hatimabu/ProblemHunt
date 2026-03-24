export type PostType = "problem" | "job";
export type JobStatus = "open" | "in_progress" | "completed" | "paid";
export type ProposalStatus = "pending" | "accepted" | "rejected";

export interface ProblemPost {
  id: string;
  type?: PostType;
  title: string;
  description: string;
  category: string;
  requirements?: string[];
  budget?: string;
  budgetValue?: number;
  budgetSol?: number | null;
  deadline?: string | null;
  jobType?: string | null;
  jobStatus?: JobStatus | null;
  skillsRequired?: string[];
  acceptedProposalId?: string | null;
  author?: string;
  authorId: string;
  upvotes: number;
  proposals: number;
  createdAt: string;
  updatedAt: string;
  paymentTxHash?: string | null;
}

export interface ProposalRecord {
  id: string;
  problemId: string;
  title: string;
  description: string;
  briefSolution?: string;
  builderId: string;
  builderName: string;
  projectUrl?: string | null;
  timeline?: string | null;
  cost?: string | null;
  expertise?: string[];
  status?: ProposalStatus;
  proposedPriceSol?: number | null;
  estimatedDelivery?: string | null;
  builderWalletAddress?: string | null;
  builderWallets?: Record<string, string>;
  tipTotal?: number;
  problemTitle?: string;
  problemType?: PostType;
  jobStatus?: JobStatus | null;
  isAcceptedBuilder?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationRow {
  id: string;
  message: string;
  link?: string | null;
  is_read: boolean;
  created_at: string;
}

export function isJobPost(post?: ProblemPost | null): boolean {
  return (post?.type || "problem") === "job";
}

export function formatBudget(post: ProblemPost): string {
  if (isJobPost(post) && post.budgetSol) {
    return `${formatSol(post.budgetSol)} SOL`;
  }
  return post.budget || String(post.budgetValue || 0);
}

export function formatSol(value?: number | null): string {
  if (value == null || Number.isNaN(value)) {
    return "0";
  }

  return value
    .toFixed(6)
    .replace(/\.?0+$/, "");
}

export function formatTimeAgo(dateString?: string | null): string {
  if (!dateString) {
    return "Unknown";
  }

  const date = new Date(dateString);
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function formatJobStatus(status?: string | null): string {
  if (!status) return "Open";
  switch (status) {
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
    case "paid":
      return "Paid";
    default:
      return "Open";
  }
}

export function shortWallet(address?: string | null): string {
  if (!address) {
    return "No wallet linked";
  }
  if (address.length <= 10) {
    return address;
  }
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function splitListInput(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function explorerUrlForChain(chain: string, txHash: string): string {
  switch ((chain || "").toLowerCase()) {
    case "solana":
      return `https://solscan.io/tx/${txHash}`;
    case "polygon":
      return `https://polygonscan.com/tx/${txHash}`;
    case "arbitrum":
      return `https://arbiscan.io/tx/${txHash}`;
    default:
      return `https://etherscan.io/tx/${txHash}`;
  }
}
