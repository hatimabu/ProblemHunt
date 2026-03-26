import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Bell, Briefcase, CheckCircle2, Edit2, Loader2, Save, User, Wallet } from "lucide-react";
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

function MetaPill({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "accent" | "rust";
}) {
  return (
    <span className={`board-pill ${tone === "accent" ? "board-pill--accent" : tone === "rust" ? "board-pill--rust" : ""}`}>
      {children}
    </span>
  );
}

function EmptyState({
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
    <div className="board-empty border-t border-[color:var(--board-line)]">
      <h2 className="board-subtitle">{title}</h2>
      <p>{description}</p>
      {ctaHref && ctaLabel ? (
        <Link to={ctaHref} className="inline-flex">
          <Button className="mt-6 h-11 rounded-none border border-[color:rgba(15,118,110,0.24)] bg-[var(--board-accent)] px-5 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-[color:#0d625c]">
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
      { label: "Open briefs", value: String(posts.length) },
      { label: "Live bids", value: String(proposals.length) },
      { label: "Accepted work", value: String(activeJobs.length) },
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
      <div className="board-app">
        <Navbar />
        <div className="board-container flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--board-accent)]" />
        </div>
      </div>
    );
  }

  const displayName = profile?.full_name || profile?.username || user?.username || "Builder";
  const identityLabel = profile?.user_type === "builder" ? "Builder" : "Requester";
  const identityCopy = profile?.user_type === "builder"
    ? "Track the briefs you are chasing, the work you have landed, and the wallets that should get paid."
    : "Track the work you posted, the builders replying, and the signals coming back from the board.";

  return (
    <div className="board-app">
      <Navbar />

      <main className="board-container py-8 md:py-10">
        <section className="grid gap-8 border-b border-[color:var(--board-line)] pb-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <p className="board-kicker">Dashboard</p>
            <h1 className="board-title mt-3">{displayName}</h1>
            <p className="board-copy mt-5">{identityCopy}</p>

            <div className="mt-6 flex flex-wrap gap-2">
              <MetaPill tone="accent">{identityLabel}</MetaPill>
              <MetaPill>{walletCount} wallet{walletCount === 1 ? "" : "s"} linked</MetaPill>
              <MetaPill tone="rust">{unreadSignals} unread signal{unreadSignals === 1 ? "" : "s"}</MetaPill>
              {profile?.wallet_address ? <MetaPill>Primary {shortWallet(profile.wallet_address)}</MetaPill> : null}
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button
                onClick={() => setWalletModalOpen(true)}
                className="h-11 rounded-none border border-[color:rgba(15,118,110,0.24)] bg-[var(--board-accent)] px-5 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-[color:#0d625c]"
              >
                <Wallet className="mr-2 h-4 w-4" />
                Manage wallets
              </Button>
              <Link to="/post">
                <Button
                  variant="outline"
                  className="h-11 rounded-none border-[color:var(--board-line-strong)] bg-white/56 px-5 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-ink)] hover:bg-white"
                >
                  Post a brief
                </Button>
              </Link>
            </div>
          </div>

          <div className="board-stat-grid">
            {dashboardStats.map((stat) => (
              <div key={stat.label} className="board-stat">
                <div className="board-stat__value">{stat.value}</div>
                <div className="board-stat__label">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        <Tabs defaultValue="identity" className="board-section px-0">
          <TabsList className="board-tabs grid h-auto w-full rounded-none p-1 md:grid-cols-5">
            <TabsTrigger value="identity">
              <User className="h-4 w-4" />
              Identity
            </TabsTrigger>
            <TabsTrigger value="briefs">
              <Briefcase className="h-4 w-4" />
              My briefs
            </TabsTrigger>
            <TabsTrigger value="bids">
              <Edit2 className="h-4 w-4" />
              My bids
            </TabsTrigger>
            <TabsTrigger value="bounties">
              <CheckCircle2 className="h-4 w-4" />
              Accepted work
            </TabsTrigger>
            <TabsTrigger value="signals">
              <Bell className="h-4 w-4" />
              Signals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="identity" className="mt-6">
            <div className="board-panel p-6 md:p-8">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-5">
                  {editingProfile ? (
                    <>
                      <div>
                        <Label className="mb-2 block text-sm text-[var(--board-ink)]">Full name</Label>
                        <Input
                          value={profileForm.full_name}
                          onChange={(event) => setProfileForm({ ...profileForm, full_name: event.target.value })}
                          className="board-field rounded-none"
                        />
                      </div>
                      <div>
                        <Label className="mb-2 block text-sm text-[var(--board-ink)]">Bio</Label>
                        <Textarea
                          value={profileForm.bio}
                          onChange={(event) => setProfileForm({ ...profileForm, bio: event.target.value })}
                          className="board-field min-h-[160px] rounded-none"
                        />
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Button
                          onClick={handleSaveProfile}
                          disabled={savingProfile}
                          className="h-11 rounded-none border border-[color:rgba(15,118,110,0.24)] bg-[var(--board-accent)] px-5 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-[color:#0d625c]"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {savingProfile ? "Saving..." : "Save profile"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setEditingProfile(false)}
                          className="h-11 rounded-none border-[color:var(--board-line-strong)] bg-white/56 px-5 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-ink)] hover:bg-white"
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="board-kicker">Identity</p>
                          <h2 className="board-subtitle mt-3">Keep your operator profile current.</h2>
                          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--board-muted)] md:text-base">
                            A clean bio and a ready payout path make your dashboard easier to trust from both sides of the marketplace.
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => setEditingProfile(true)}
                          className="h-11 rounded-none border-[color:var(--board-line-strong)] bg-white/56 px-5 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-ink)] hover:bg-white"
                        >
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                      </div>

                      <div className="grid gap-5 border-t border-[color:var(--board-line)] pt-5 md:grid-cols-2">
                        <div>
                          <p className="board-eyebrow">Username</p>
                          <p className="mt-2 text-base text-[var(--board-ink)]">{profile?.username}</p>
                        </div>
                        <div>
                          <p className="board-eyebrow">Full name</p>
                          <p className="mt-2 text-base text-[var(--board-ink)]">{profile?.full_name || "Not set"}</p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="board-eyebrow">Bio</p>
                          <p className="mt-2 text-base leading-8 text-[var(--board-muted)]">{profile?.bio || "No bio yet."}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <aside className="border-t border-[color:var(--board-line)] pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                  <p className="board-kicker">Payout path</p>
                  <div className="mt-5 space-y-4">
                    <div>
                      <p className="board-eyebrow">Primary wallet</p>
                      <p className="mt-2 text-sm text-[var(--board-ink)]">
                        {profile?.wallet_address ? shortWallet(profile.wallet_address) : "No wallet linked yet"}
                      </p>
                    </div>
                    <div>
                      <p className="board-eyebrow">Linked wallets</p>
                      <p className="mt-2 text-sm text-[var(--board-ink)]">{walletCount}</p>
                    </div>
                    <div>
                      <p className="board-eyebrow">Unread signals</p>
                      <p className="mt-2 text-sm text-[var(--board-ink)]">{unreadSignals}</p>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="briefs" className="mt-6">
            {posts.length === 0 ? (
              <EmptyState
                title="No briefs on your board yet."
                description="Post a problem, task, or request and your dashboard will start tracking bids, budget, and movement."
                ctaHref="/post"
                ctaLabel="Post a brief"
              />
            ) : (
              <div className="border-t border-[color:var(--board-line)]">
                {posts.map((post) => (
                  <article key={post.id} className="board-row">
                    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_180px] md:items-start">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <MetaPill>{post.type === "job" ? "Paid task" : "Problem brief"}</MetaPill>
                          {post.type === "job" && post.jobStatus ? <MetaPill tone="accent">{formatJobStatus(post.jobStatus)}</MetaPill> : null}
                        </div>
                        <Link to={`/problem/${post.id}`} className="mt-4 block font-display text-3xl font-semibold tracking-[-0.05em] text-[var(--board-ink)]">
                          {post.title}
                        </Link>
                        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--board-muted)] md:text-base">
                          {post.description}
                        </p>
                      </div>

                      <div className="md:text-right">
                        <p className="board-eyebrow">{post.type === "job" ? "Budget" : "Bounty"}</p>
                        <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.06em] text-[var(--board-ink)]">
                          {formatBudget(post)}
                        </p>
                        <p className="mt-3 text-sm text-[var(--board-muted)]">
                          {post.proposals} bid{post.proposals === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bids" className="mt-6">
            {proposals.length === 0 ? (
              <EmptyState
                title="No bids submitted yet."
                description="Browse the marketplace, reply to a strong brief, and your active bids will appear here."
                ctaHref="/browse"
                ctaLabel="Browse the board"
              />
            ) : (
              <div className="border-t border-[color:var(--board-line)]">
                {proposals.map((proposal) => (
                  <article key={proposal.id} className="board-row">
                    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_180px] md:items-start">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <MetaPill>{proposal.problemType === "job" ? "Paid task" : "Problem brief"}</MetaPill>
                          <MetaPill tone="rust">{proposal.status || "pending"}</MetaPill>
                          {proposal.jobStatus ? <MetaPill tone="accent">{formatJobStatus(proposal.jobStatus)}</MetaPill> : null}
                        </div>
                        <Link to={`/problem/${proposal.problemId}`} className="mt-4 block font-display text-3xl font-semibold tracking-[-0.05em] text-[var(--board-ink)]">
                          {proposal.problemTitle || "Untitled brief"}
                        </Link>
                        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--board-muted)] md:text-base">
                          {proposal.briefSolution || proposal.description}
                        </p>
                      </div>

                      <div className="md:text-right">
                        {proposal.proposedPriceSol ? (
                          <p className="font-display text-3xl font-semibold tracking-[-0.06em] text-[var(--board-ink)]">
                            {formatSol(proposal.proposedPriceSol)} SOL
                          </p>
                        ) : proposal.cost ? (
                          <p className="text-base text-[var(--board-ink)]">{proposal.cost}</p>
                        ) : null}
                        {proposal.tipTotal ? (
                          <p className="mt-3 text-sm text-[var(--board-accent)]">
                            {formatSol(proposal.tipTotal)} tipped
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bounties" className="mt-6">
            {activeJobs.length === 0 ? (
              <EmptyState
                title="No accepted work yet."
                description="When a requester selects one of your bids, the active payout path will show up here."
              />
            ) : (
              <div className="border-t border-[color:var(--board-line)]">
                {activeJobs.map((job) => (
                  <article key={job.id} className="board-row">
                    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_180px] md:items-start">
                      <div>
                        <MetaPill tone="accent">{formatJobStatus(job.jobStatus)}</MetaPill>
                        <Link to={`/problem/${job.problemId}`} className="mt-4 block font-display text-3xl font-semibold tracking-[-0.05em] text-[var(--board-ink)]">
                          {job.problemTitle || "Untitled task"}
                        </Link>
                        <p className="mt-3 text-sm leading-7 text-[var(--board-muted)] md:text-base">
                          {job.estimatedDelivery || job.timeline || "Timeline pending"}
                        </p>
                      </div>

                      <div className="md:text-right">
                        {job.proposedPriceSol ? (
                          <p className="font-display text-3xl font-semibold tracking-[-0.06em] text-[var(--board-ink)]">
                            {formatSol(job.proposedPriceSol)} SOL
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="signals" className="mt-6">
            {notifications.length === 0 ? (
              <EmptyState
                title="No signals yet."
                description="Replies, updates, and movement from the board will collect here once your briefs or bids start moving."
              />
            ) : (
              <div className="border-t border-[color:var(--board-line)]">
                {notifications.map((notification) => (
                  <article key={notification.id} className="board-row">
                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_120px] md:items-start">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <MetaPill tone={notification.is_read ? "default" : "rust"}>
                            {notification.is_read ? "Read" : "Unread"}
                          </MetaPill>
                        </div>
                        <p className="mt-4 text-base leading-8 text-[var(--board-ink)]">{notification.message}</p>
                        <p className="mt-2 text-sm text-[var(--board-muted)]">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                      {notification.link ? (
                        <Link
                          to={notification.link}
                          className="font-mono-alt text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-accent)] md:text-right"
                        >
                          Open
                        </Link>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={walletModalOpen} onOpenChange={setWalletModalOpen}>
        <DialogContent className="h-[85vh] max-w-2xl overflow-y-auto rounded-none border-[color:var(--board-line-strong)] bg-[var(--board-paper)] text-[var(--board-ink)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-semibold tracking-[-0.05em] text-[var(--board-ink)]">
              Manage wallets
            </DialogTitle>
          </DialogHeader>
          <LinkWallet onWalletsChange={setWalletCount} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
