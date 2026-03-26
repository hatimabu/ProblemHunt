import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Bell, Briefcase, CheckCircle, Coins, Edit2, Loader2, Save, User, Wallet } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../../../lib/supabaseClient";
import { API_ENDPOINTS } from "../../lib/api-config";
import { LinkWallet } from "./LinkWallet";
import { Navbar } from "./navbar";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { formatBudget, formatJobStatus, formatSol, shortWallet, type NotificationRow, type ProblemPost, type ProposalRecord } from "../../lib/marketplace";

interface ProfileData {
  username: string;
  full_name: string | null;
  bio: string | null;
  reputation_score: number;
  user_type: string;
  created_at: string;
  wallet_address?: string | null;
}

function SignalTag({
  children,
  tone = "cyan",
}: {
  children: ReactNode;
  tone?: "cyan" | "pink" | "lime" | "neutral";
}) {
  const tones = {
    cyan: "border-[color:rgba(89,243,255,0.18)] bg-[rgba(89,243,255,0.06)] text-[var(--neon-cyan)]",
    pink: "border-[color:rgba(255,79,216,0.18)] bg-[rgba(255,79,216,0.06)] text-[var(--neon-text)]",
    lime: "border-[color:rgba(217,255,87,0.18)] bg-[rgba(217,255,87,0.06)] text-[var(--neon-lime)]",
    neutral: "border-[color:rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] text-[var(--neon-muted)]",
  };

  return (
    <span className={`rounded-none border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${tones[tone]}`}>
      {children}
    </span>
  );
}

function EmptyTabState({
  title,
  description,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  description: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="neon-panel rounded-[1.5rem] px-6 py-14 text-center">
      <h3 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--neon-text)]">
        {title}
      </h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--neon-muted)] md:text-base">
        {description}
      </p>
      {ctaHref && ctaLabel ? (
        <Link to={ctaHref} className="inline-flex">
          <Button className="mt-7 rounded-none border border-[color:rgba(89,243,255,0.34)] bg-[rgba(9,14,31,0.88)] text-[var(--neon-cyan)] hover:bg-[rgba(89,243,255,0.1)]">
            {ctaLabel}
          </Button>
        </Link>
      ) : null}
    </div>
  );
}

export function BuilderDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<ProblemPost[]>([]);
  const [proposals, setProposals] = useState<ProposalRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [walletCount, setWalletCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: "", bio: "" });

  const activeJobs = useMemo(
    () => proposals.filter((proposal) => proposal.problemType === "job" && proposal.isAcceptedBuilder),
    [proposals]
  );

  const unreadSignals = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications]
  );

  const dashboardStats = useMemo(
    () => [
      { label: "Reputation", value: String(profile?.reputation_score || 0) },
      { label: "Open Briefs", value: String(posts.length) },
      { label: "Live Bids", value: String(proposals.length) },
      { label: "Accepted Bounties", value: String(activeJobs.length) },
    ],
    [activeJobs.length, posts.length, profile?.reputation_score, proposals.length]
  );

  useEffect(() => {
    const load = async () => {
      if (!user) {
        return;
      }

      setLoading(true);
      try {
        const [profileResult, walletCountResult, notificationsResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("username, full_name, bio, reputation_score, user_type, created_at, wallet_address")
            .eq("user_id", user.id)
            .single(),
          supabase.from("wallets").select("*", { count: "exact", head: true }).eq("user_id", user.id),
          supabase
            .from("notifications")
            .select("id, message, link, is_read, created_at")
            .order("created_at", { ascending: false })
            .limit(20),
        ]);

        if (profileResult.data) {
          setProfile(profileResult.data);
          setProfileForm({
            full_name: profileResult.data.full_name || "",
            bio: profileResult.data.bio || "",
          });
        }

        setWalletCount(walletCountResult.count || 0);
        setNotifications(notificationsResult.data || []);

        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const [postsResponse, proposalsResponse] = await Promise.all([
          fetch(`${API_ENDPOINTS.USER_PROBLEMS}?sortBy=newest`, { headers }),
          fetch(API_ENDPOINTS.USER_PROPOSALS, { headers }),
        ]);

        if (postsResponse.ok) {
          const postsData = await postsResponse.json();
          setPosts(Array.isArray(postsData.problems) ? postsData.problems : []);
        }

        if (proposalsResponse.ok) {
          const proposalsData = await proposalsResponse.json();
          setProposals(Array.isArray(proposalsData.proposals) ? proposalsData.proposals : []);
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) {
      return;
    }

    try {
      setSavingProfile(true);
      const { data } = await supabase
        .from("profiles")
        .update({
          full_name: profileForm.full_name,
          bio: profileForm.bio,
        })
        .eq("user_id", user.id)
        .select("username, full_name, bio, reputation_score, user_type, created_at, wallet_address")
        .single();

      if (data) {
        setProfile(data);
      }

      setEditingProfile(false);
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="neon-page min-h-screen text-[var(--neon-text)]">
        <Navbar />
        <div className="mx-auto flex max-w-7xl justify-center px-4 py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--neon-cyan)]" />
        </div>
      </div>
    );
  }

  const displayName = profile?.full_name || profile?.username || user?.username || "Builder";
  const identityLabel = profile?.user_type === "builder" ? "Solution Seeker" : "Requester";
  const identityCopy = profile?.user_type === "builder"
    ? "Track the briefs you are chasing, the bounties you have locked, and the wallets that should get paid."
    : "Track the work you have posted, the builders responding, and the signals coming back from the board.";

  return (
    <div className="neon-page min-h-screen text-[var(--neon-text)]">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-12">
        <section className="neon-panel neon-command-hero relative overflow-hidden rounded-[1.75rem] p-8 md:p-10 mb-8">
          <div className="neon-command-hero__scene" aria-hidden="true">
            <div className="neon-command-hero__scan" />
            <div className="neon-command-hero__frame neon-command-hero__frame--one" />
            <div className="neon-command-hero__frame neon-command-hero__frame--two" />
            <div className="neon-command-hero__beam" />
          </div>
          <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
            <div className="max-w-3xl">
              <p className="neon-kicker">Command Deck</p>
              <p className="font-cyber text-sm uppercase tracking-[0.24em] text-[var(--neon-pink)]">
                Problem Hunt
              </p>
              <h1 className="mt-3 font-cyber text-4xl uppercase tracking-[0.12em] text-[var(--neon-text)] md:text-5xl">
                Command Deck
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--neon-muted)] md:text-lg">
                {identityCopy}
              </p>
              <p className="mt-4 text-sm uppercase tracking-[0.2em] text-[var(--neon-dim)]">
                Operator: {displayName}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                <SignalTag tone="cyan">{identityLabel}</SignalTag>
                <SignalTag tone="neutral">{walletCount} wallet{walletCount === 1 ? "" : "s"} linked</SignalTag>
                <SignalTag tone="pink">{unreadSignals} unread signal{unreadSignals === 1 ? "" : "s"}</SignalTag>
                {profile?.wallet_address ? <SignalTag tone="lime">Primary {shortWallet(profile.wallet_address)}</SignalTag> : null}
              </div>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Button
                  onClick={() => setWalletModalOpen(true)}
                  className="rounded-none border border-[color:rgba(89,243,255,0.34)] bg-[rgba(9,14,31,0.88)] text-[var(--neon-cyan)] hover:bg-[rgba(89,243,255,0.1)]"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Manage Wallets
                </Button>
                <Link to="/post">
                  <Button
                    variant="outline"
                    className="rounded-none border-[color:rgba(255,79,216,0.32)] bg-[rgba(255,79,216,0.08)] text-[var(--neon-text)] hover:bg-[rgba(255,79,216,0.14)]"
                  >
                    Post A Brief
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {dashboardStats.map((stat) => (
                <div key={stat.label} className="border border-[color:var(--neon-line)] bg-[rgba(6,10,24,0.7)] px-4 py-5">
                  <p className="font-mono-alt text-[0.68rem] uppercase tracking-[0.26em] text-[var(--neon-dim)]">
                    {stat.label}
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--neon-cyan)]">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Tabs defaultValue="identity" className="space-y-6">
          <TabsList className="neon-panel grid h-auto w-full gap-2 rounded-[1.5rem] border border-[color:var(--neon-line)] p-2 md:grid-cols-5">
            <TabsTrigger value="identity" className="rounded-none border border-transparent font-cyber text-[0.7rem] uppercase tracking-[0.16em] text-[var(--neon-dim)] data-[state=active]:border-[color:rgba(89,243,255,0.24)] data-[state=active]:bg-[rgba(89,243,255,0.08)] data-[state=active]:text-[var(--neon-cyan)]">
              <User className="w-4 h-4 mr-2" />
              Identity
            </TabsTrigger>
            <TabsTrigger value="briefs" className="rounded-none border border-transparent font-cyber text-[0.7rem] uppercase tracking-[0.16em] text-[var(--neon-dim)] data-[state=active]:border-[color:rgba(89,243,255,0.24)] data-[state=active]:bg-[rgba(89,243,255,0.08)] data-[state=active]:text-[var(--neon-cyan)]">
              <Briefcase className="w-4 h-4 mr-2" />
              My Briefs
            </TabsTrigger>
            <TabsTrigger value="bids" className="rounded-none border border-transparent font-cyber text-[0.7rem] uppercase tracking-[0.16em] text-[var(--neon-dim)] data-[state=active]:border-[color:rgba(89,243,255,0.24)] data-[state=active]:bg-[rgba(89,243,255,0.08)] data-[state=active]:text-[var(--neon-cyan)]">
              <Coins className="w-4 h-4 mr-2" />
              My Bids
            </TabsTrigger>
            <TabsTrigger value="bounties" className="rounded-none border border-transparent font-cyber text-[0.7rem] uppercase tracking-[0.16em] text-[var(--neon-dim)] data-[state=active]:border-[color:rgba(89,243,255,0.24)] data-[state=active]:bg-[rgba(89,243,255,0.08)] data-[state=active]:text-[var(--neon-cyan)]">
              <CheckCircle className="w-4 h-4 mr-2" />
              Live Bounties
            </TabsTrigger>
            <TabsTrigger value="signals" className="rounded-none border border-transparent font-cyber text-[0.7rem] uppercase tracking-[0.16em] text-[var(--neon-dim)] data-[state=active]:border-[color:rgba(89,243,255,0.24)] data-[state=active]:bg-[rgba(89,243,255,0.08)] data-[state=active]:text-[var(--neon-cyan)]">
              <Bell className="w-4 h-4 mr-2" />
              Signals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="identity">
            <div className="neon-panel rounded-[1.5rem] p-6 md:p-8">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-5">
                  {editingProfile ? (
                    <>
                      <div>
                        <Label className="mb-2 block text-[var(--neon-text)]">Full Name</Label>
                        <Input
                          value={profileForm.full_name}
                          onChange={(event) => setProfileForm({ ...profileForm, full_name: event.target.value })}
                          className="rounded-none border-[color:var(--neon-line)] bg-[rgba(6,10,24,0.78)] text-[var(--neon-text)]"
                        />
                      </div>
                      <div>
                        <Label className="mb-2 block text-[var(--neon-text)]">Bio</Label>
                        <Textarea
                          value={profileForm.bio}
                          onChange={(event) => setProfileForm({ ...profileForm, bio: event.target.value })}
                          className="min-h-[140px] rounded-none border-[color:var(--neon-line)] bg-[rgba(6,10,24,0.78)] text-[var(--neon-text)]"
                        />
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Button
                          onClick={handleSaveProfile}
                          disabled={savingProfile}
                          className="rounded-none border border-[color:rgba(89,243,255,0.34)] bg-[rgba(9,14,31,0.88)] text-[var(--neon-cyan)] hover:bg-[rgba(89,243,255,0.1)]"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {savingProfile ? "Saving..." : "Save Identity"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setEditingProfile(false)}
                          className="rounded-none border-[color:rgba(255,255,255,0.14)] bg-transparent text-[var(--neon-text)] hover:bg-[rgba(255,255,255,0.05)]"
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="neon-kicker">Identity</p>
                          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--neon-text)]">
                            Keep your operator profile current
                          </h2>
                          <p className="mt-2 text-sm leading-7 text-[var(--neon-muted)] md:text-base">
                            Builders and requesters both look sharper with a clear bio and a payout path that is ready when the work lands.
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => setEditingProfile(true)}
                          className="rounded-none border-[color:rgba(255,255,255,0.14)] bg-transparent text-[var(--neon-text)] hover:bg-[rgba(255,255,255,0.05)]"
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      </div>

                      <div className="grid gap-5 md:grid-cols-2">
                        <div>
                          <p className="font-mono-alt text-[0.68rem] uppercase tracking-[0.24em] text-[var(--neon-dim)]">Username</p>
                          <p className="mt-2 text-base text-[var(--neon-text)]">{profile?.username}</p>
                        </div>
                        <div>
                          <p className="font-mono-alt text-[0.68rem] uppercase tracking-[0.24em] text-[var(--neon-dim)]">Full Name</p>
                          <p className="mt-2 text-base text-[var(--neon-text)]">{profile?.full_name || "Not set"}</p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="font-mono-alt text-[0.68rem] uppercase tracking-[0.24em] text-[var(--neon-dim)]">Bio</p>
                          <p className="mt-2 text-base leading-8 text-[var(--neon-muted)]">{profile?.bio || "No bio yet"}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <aside className="border-t border-[color:var(--neon-line)] pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                  <p className="neon-kicker">Payout Path</p>
                  <div className="space-y-4 text-sm leading-7 text-[var(--neon-muted)]">
                    <div>
                      <p className="font-mono-alt text-[0.68rem] uppercase tracking-[0.24em] text-[var(--neon-dim)]">Primary Wallet</p>
                      <p className="mt-2 text-[var(--neon-text)]">
                        {profile?.wallet_address ? shortWallet(profile.wallet_address) : "No wallet linked yet"}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono-alt text-[0.68rem] uppercase tracking-[0.24em] text-[var(--neon-dim)]">Linked Wallets</p>
                      <p className="mt-2 text-[var(--neon-text)]">{walletCount}</p>
                    </div>
                    <div>
                      <p className="font-mono-alt text-[0.68rem] uppercase tracking-[0.24em] text-[var(--neon-dim)]">Unread Signals</p>
                      <p className="mt-2 text-[var(--neon-text)]">{unreadSignals}</p>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="briefs">
            <div className="space-y-4">
              {posts.length === 0 ? (
                <EmptyTabState
                  title="No briefs on your board yet"
                  description="Post a problem, task, or request and the command deck will start tracking bids, budget, and movement."
                  ctaHref="/post"
                  ctaLabel="Post A Brief"
                />
              ) : (
                posts.map((post) => (
                  <article key={post.id} className="neon-panel rounded-[1.5rem] p-5 md:p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-2">
                          <SignalTag tone="neutral">{post.type === "job" ? "Paid Task" : "Problem Brief"}</SignalTag>
                          {post.type === "job" && post.jobStatus ? <SignalTag tone="cyan">{formatJobStatus(post.jobStatus)}</SignalTag> : null}
                        </div>
                        <Link to={`/problem/${post.id}`} className="mt-4 block text-xl font-semibold tracking-[-0.03em] text-[var(--neon-text)] transition-colors hover:text-[var(--neon-cyan)]">
                          {post.title}
                        </Link>
                        <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--neon-muted)] md:text-base">
                          {post.description}
                        </p>
                      </div>

                      <div className="text-left md:min-w-[180px] md:text-right">
                        <p className="font-mono-alt text-[0.68rem] uppercase tracking-[0.24em] text-[var(--neon-dim)]">
                          {post.type === "job" ? "Budget" : "Bounty"}
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-[var(--neon-cyan)]">
                          {formatBudget(post)}
                        </p>
                        <p className="mt-2 text-sm text-[var(--neon-dim)]">
                          {post.proposals} bid{post.proposals === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="bids">
            <div className="space-y-4">
              {proposals.length === 0 ? (
                <EmptyTabState
                  title="No bids submitted yet"
                  description="Browse the board, find a brief worth chasing, and your active bids will appear here."
                  ctaHref="/browse"
                  ctaLabel="Browse The Board"
                />
              ) : (
                proposals.map((proposal) => (
                  <article key={proposal.id} className="neon-panel rounded-[1.5rem] p-5 md:p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-2">
                          <SignalTag tone="neutral">{proposal.problemType === "job" ? "Paid Task" : "Problem Brief"}</SignalTag>
                          <SignalTag tone="pink">{proposal.status || "pending"}</SignalTag>
                          {proposal.jobStatus ? <SignalTag tone="cyan">{formatJobStatus(proposal.jobStatus)}</SignalTag> : null}
                        </div>
                        <Link to={`/problem/${proposal.problemId}`} className="mt-4 block text-xl font-semibold tracking-[-0.03em] text-[var(--neon-text)] transition-colors hover:text-[var(--neon-cyan)]">
                          {proposal.problemTitle || "Untitled Brief"}
                        </Link>
                        <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--neon-muted)] md:text-base">
                          {proposal.briefSolution || proposal.description}
                        </p>
                      </div>

                      <div className="text-left md:min-w-[180px] md:text-right">
                        {proposal.proposedPriceSol ? (
                          <p className="text-2xl font-semibold text-[var(--neon-cyan)]">
                            {formatSol(proposal.proposedPriceSol)} SOL
                          </p>
                        ) : proposal.cost ? (
                          <p className="text-base text-[var(--neon-text)]">{proposal.cost}</p>
                        ) : null}
                        {proposal.tipTotal ? (
                          <p className="mt-2 text-sm text-[var(--neon-lime)]">
                            {formatSol(proposal.tipTotal)} tipped
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="bounties">
            <div className="space-y-4">
              {activeJobs.length === 0 ? (
                <EmptyTabState
                  title="No accepted bounty work yet"
                  description="When one of your bids gets selected, the active payout path will appear here so you can track it to completion."
                />
              ) : (
                activeJobs.map((job) => (
                  <article key={job.id} className="neon-panel rounded-[1.5rem] p-5 md:p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <SignalTag tone="cyan">{formatJobStatus(job.jobStatus)}</SignalTag>
                        <Link to={`/problem/${job.problemId}`} className="mt-4 block text-xl font-semibold tracking-[-0.03em] text-[var(--neon-text)] transition-colors hover:text-[var(--neon-cyan)]">
                          {job.problemTitle || "Untitled Task"}
                        </Link>
                        <p className="mt-2 text-sm leading-7 text-[var(--neon-muted)] md:text-base">
                          {job.estimatedDelivery || job.timeline || "Timeline pending"}
                        </p>
                      </div>

                      <div className="text-left md:min-w-[180px] md:text-right">
                        {job.proposedPriceSol ? (
                          <p className="text-2xl font-semibold text-[var(--neon-cyan)]">
                            {formatSol(job.proposedPriceSol)} SOL
                          </p>
                        ) : null}
                        <Link to={`/problem/${job.problemId}`} className="mt-4 inline-flex text-sm font-semibold uppercase tracking-[0.16em] text-[var(--neon-cyan)] hover:text-[var(--neon-text)]">
                          Open Brief
                        </Link>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="signals">
            <div className="space-y-4">
              {notifications.length === 0 ? (
                <EmptyTabState
                  title="No signals yet"
                  description="Replies, activity, and updates from the board will collect here once your briefs or bids start moving."
                />
              ) : (
                notifications.map((notification) => (
                  <article key={notification.id} className="neon-panel rounded-[1.5rem] p-5 md:p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <SignalTag tone={notification.is_read ? "neutral" : "pink"}>
                            {notification.is_read ? "Read" : "Unread"}
                          </SignalTag>
                        </div>
                        <p className="mt-4 text-base leading-8 text-[var(--neon-text)]">
                          {notification.message}
                        </p>
                        <p className="mt-2 text-sm text-[var(--neon-dim)]">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                      {notification.link ? (
                        <Link
                          to={notification.link}
                          className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--neon-cyan)] hover:text-[var(--neon-text)]"
                        >
                          Open
                        </Link>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={walletModalOpen} onOpenChange={setWalletModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-none border-[color:var(--neon-line)] bg-[rgba(8,12,28,0.98)] text-[var(--neon-text)]">
          <DialogHeader>
            <DialogTitle className="font-cyber text-xl uppercase tracking-[0.14em] text-[var(--neon-text)] flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[var(--neon-cyan)]" />
              Manage Wallets
            </DialogTitle>
          </DialogHeader>
          <LinkWallet onWalletsChange={setWalletCount} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
