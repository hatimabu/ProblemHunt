import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";
import {
  Bell,
  BriefcaseBusiness,
  Camera,
  CheckCircle2,
  Edit3,
  Loader2,
  Save,
  User,
  Wallet,
  ArrowRight,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Navbar } from "./navbar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea } from "./ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { PayoutWalletDialog } from "./payout-wallet-dialog";
import {
  deleteProblemById,
  fetchDashboardSnapshot,
  markNotificationRead,
  updateDashboardProfile,
  uploadDashboardAvatar,
  type DashboardProfile,
} from "../../lib/user-dashboard-api";
import {
  formatBudget,
  formatJobStatus,
  formatSol,
  type NotificationRow,
  type ProblemPost,
  type ProposalRecord,
} from "../../lib/marketplace";

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-[color:var(--board-line-strong)] bg-[var(--board-panel)] px-2.5 py-1 text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-[var(--board-muted)]">
      {children}
    </span>
  );
}

function EmptyCard({
  title,
  copy,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  copy: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="board-panel p-6 md:p-8">
      <h2 className="font-display text-4xl font-semibold tracking-[-0.05em] text-[var(--board-ink)]">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--board-muted)]">{copy}</p>
      {ctaHref && ctaLabel ? (
        <Link to={ctaHref} className="mt-6 inline-flex">
          <Button className="board-btn-primary h-11 border-0 bg-[var(--board-accent)] px-5 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-white hover:bg-[var(--color-accent-hover)]">
            {ctaLabel}
          </Button>
        </Link>
      ) : null}
    </div>
  );
}

export function BuilderDashboard() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [profileForm, setProfileForm] = useState({ full_name: "", bio: "" });
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [posts, setPosts] = useState<ProblemPost[]>([]);
  const [proposals, setProposals] = useState<ProposalRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [walletCount, setWalletCount] = useState(0);

  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);

  const acceptedJobs = useMemo(
    () => proposals.filter((proposal) => proposal.problemType === "job" && proposal.isAcceptedBuilder),
    [proposals]
  );
  const unreadCount = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications]);

  const loadDashboard = async (showSpinner = false) => {
    if (!user) {
      return;
    }
    if (showSpinner) {
      setLoading(true);
    }

    try {
      setError(null);
      const snapshot = await fetchDashboardSnapshot(user.id);
      setProfile(snapshot.profile);
      setWalletCount(snapshot.walletCount);
      setPosts(snapshot.posts);
      setProposals(snapshot.proposals);
      setNotifications(snapshot.notifications);

      if (snapshot.profile) {
        setProfileForm({
          full_name: snapshot.profile.full_name || "",
          bio: snapshot.profile.bio || "",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard.");
    } finally {
      if (showSpinner) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadDashboard(true);
  }, [user]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      setSavingProfile(true);
      setActionMessage(null);
      const updated = await updateDashboardProfile(user.id, profileForm);
      setProfile(updated);
      setEditingProfile(false);
      setActionMessage("Profile updated.");
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;

    const MAX_BYTES = 5 * 1024 * 1024;
    setAvatarError(null);

    if (!file.type.startsWith("image/")) {
      setAvatarError("Please upload an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setAvatarError("Image is too large (max 5MB).");
      return;
    }

    if (avatarPreviewUrl) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreviewUrl(previewUrl);
    setAvatarUploading(true);

    try {
      const publicUrl = await uploadDashboardAvatar(user.id, file);
      setProfile((prev) => (prev ? { ...prev, avatar_url: publicUrl } : prev));
      setActionMessage("Profile picture updated.");
      URL.revokeObjectURL(previewUrl);
      setAvatarPreviewUrl(null);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Failed to upload avatar.");
      setAvatarPreviewUrl(null);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleDeletePost = async (post: ProblemPost) => {
    const confirmed = window.confirm(`Delete "${post.title}"? This cannot be undone.`);
    if (!confirmed) {
      return;
    }
    try {
      setDeletingPostId(post.id);
      setActionMessage(null);
      await deleteProblemById(post.id);
      setPosts((current) => current.filter((item) => item.id !== post.id));
      setActionMessage(`Deleted "${post.title}".`);
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Failed to delete post.");
    } finally {
      setDeletingPostId(null);
    }
  };

  const displayName = profile?.full_name || profile?.username || user?.username || "Builder";

  if (loading) {
    return (
      <div className="board-app">
        <Navbar />
        <div className="board-container py-20">
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--board-accent)]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="board-app">
      <Navbar />

      <main className="board-container py-8 md:py-10">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
          <div className="board-panel relative overflow-hidden p-6 md:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,226,255,0.12),transparent_45%)]" />
            <div className="relative">
              <p className="board-kicker">User Dashboard</p>
              <h1 className="mt-3 font-display text-6xl font-semibold tracking-[-0.06em] text-[var(--board-ink)]">{displayName}</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--board-muted)] md:text-base">
                Manage your identity, payout wallets, posted briefs, and active bids from one clean workspace.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={() => setWalletDialogOpen(true)}
                  className="h-11 border-0 bg-[var(--board-accent)] px-5 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-white hover:bg-[var(--color-accent-hover)]"
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  Add wallet
                </Button>
                <Link to="/post">
                  <Button
                    variant="outline"
                    className="h-11 border-[color:var(--board-line-strong)] bg-transparent px-5 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--board-muted)] hover:bg-[var(--board-panel-strong)] hover:text-[var(--board-ink)]"
                  >
                    Post brief
                  </Button>
                </Link>
              </div>

              <div className="mt-8 grid gap-3 border-t border-[color:var(--board-line)] pt-5 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-[color:var(--board-line)] bg-[var(--board-panel-strong)] p-4">
                  <p className="board-eyebrow">Posted</p>
                  <p className="mt-2 text-sm text-[var(--board-muted)]">{posts.length} brief{posts.length === 1 ? "" : "s"}</p>
                </div>
                <div className="rounded-xl border border-[color:var(--board-line)] bg-[var(--board-panel-strong)] p-4">
                  <p className="board-eyebrow">Bids</p>
                  <p className="mt-2 text-sm text-[var(--board-muted)]">{proposals.length} proposal{proposals.length === 1 ? "" : "s"}</p>
                </div>
                <div className="rounded-xl border border-[color:var(--board-line)] bg-[var(--board-panel-strong)] p-4">
                  <p className="board-eyebrow">Wallets</p>
                  <p className="mt-2 text-sm text-[var(--board-muted)]">{walletCount} linked wallet{walletCount === 1 ? "" : "s"}</p>
                </div>
                <div className="rounded-xl border border-[color:var(--board-line)] bg-[var(--board-panel-strong)] p-4">
                  <p className="board-eyebrow">Notifications</p>
                  <p className="mt-2 text-sm text-[var(--board-muted)]">{unreadCount} unread signal{unreadCount === 1 ? "" : "s"}</p>
                </div>
              </div>
            </div>
          </div>

          <aside className="board-panel p-6">
            <p className="board-kicker">Profile</p>
            <div className="mt-4 flex items-center gap-4">
              <Avatar className="size-16 border border-[color:var(--board-line-strong)]">
                {avatarPreviewUrl || profile?.avatar_url ? (
                  <AvatarImage src={avatarPreviewUrl || profile?.avatar_url || undefined} alt="Profile" className="object-cover" />
                ) : null}
                <AvatarFallback>
                  <User className="h-5 w-5 text-[var(--board-muted)]" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-[var(--board-ink)]">{displayName}</p>
                <p className="text-sm text-[var(--board-muted)]">@{profile?.username || user?.username || "user"}</p>
              </div>
            </div>

            <label className="mt-5 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[color:var(--board-line-strong)] bg-transparent px-4 py-2.5 text-sm text-[var(--board-muted)] hover:bg-[var(--board-panel-strong)] hover:text-[var(--board-ink)]">
              {avatarUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4" />
                  Update picture
                </>
              )}
              <input
                type="file"
                accept="image/*"
                disabled={avatarUploading}
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  void handleAvatarUpload(file);
                }}
              />
            </label>
            {avatarError ? (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-[color:rgba(219,84,97,0.34)] bg-[rgba(219,84,97,0.12)] px-3 py-2 text-sm text-[var(--board-accent)]">
                <AlertCircle className="h-4 w-4" />
                {avatarError}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setWalletDialogOpen(true)}
              className="mt-4 flex w-full items-center justify-between rounded-xl border border-[color:var(--board-line)] bg-[var(--board-panel)] px-4 py-3 text-sm text-[var(--board-ink)] hover:bg-[var(--board-panel-strong)]"
            >
              <span>Manage wallets</span>
              <ArrowRight className="h-4 w-4 text-[var(--board-accent)]" />
            </button>
          </aside>
        </section>

        {error ? <div className="board-inline-note mt-6">{error}</div> : null}
        {actionMessage ? <div className="board-inline-note mt-6">{actionMessage}</div> : null}

        <Tabs defaultValue="profile" className="mt-8">
          <TabsList className="board-tabs grid h-auto w-full p-1 md:grid-cols-4">
            <TabsTrigger value="profile">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="posts">
              <BriefcaseBusiness className="h-4 w-4" />
              Posted
            </TabsTrigger>
            <TabsTrigger value="bids">
              <CheckCircle2 className="h-4 w-4" />
              Bids
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4" />
              Signals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <div className="board-panel p-6 md:p-8">
              {editingProfile ? (
                <div className="space-y-5">
                  <div>
                    <Label className="mb-2 block text-sm text-[var(--board-ink)]">Full name</Label>
                    <Input
                      className="board-field"
                      value={profileForm.full_name}
                      onChange={(event) => setProfileForm((current) => ({ ...current, full_name: event.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="mb-2 block text-sm text-[var(--board-ink)]">Bio</Label>
                    <Textarea
                      className="board-field min-h-[150px]"
                      value={profileForm.bio}
                      onChange={(event) => setProfileForm((current) => ({ ...current, bio: event.target.value }))}
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      className="h-11 border-0 bg-[var(--board-accent)] px-5 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-white hover:bg-[var(--color-accent-hover)]"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {savingProfile ? "Saving..." : "Save profile"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditingProfile(false)}
                      className="h-11 border-[color:var(--board-line-strong)] bg-transparent px-5 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--board-muted)] hover:bg-[var(--board-panel-strong)] hover:text-[var(--board-ink)]"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="board-kicker">Identity</p>
                      <h2 className="mt-2 font-display text-4xl font-semibold tracking-[-0.05em] text-[var(--board-ink)]">
                        Keep your profile sharp.
                      </h2>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setEditingProfile(true)}
                      className="h-11 border-[color:var(--board-line-strong)] bg-transparent px-5 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--board-muted)] hover:bg-[var(--board-panel-strong)] hover:text-[var(--board-ink)]"
                    >
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit profile
                    </Button>
                  </div>

                  <div className="mt-6 grid gap-5 border-t border-[color:var(--board-line)] pt-5 md:grid-cols-2">
                    <div>
                      <p className="board-eyebrow">Username</p>
                      <p className="mt-2 text-base text-[var(--board-ink)]">{profile?.username || "-"}</p>
                    </div>
                    <div>
                      <p className="board-eyebrow">Full name</p>
                      <p className="mt-2 text-base text-[var(--board-ink)]">{profile?.full_name || "Not set"}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="board-eyebrow">Bio</p>
                      <p className="mt-2 text-sm leading-7 text-[var(--board-muted)] md:text-base">
                        {profile?.bio || "No bio yet. Add context about your strengths, delivery style, and preferred projects."}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="posts" className="mt-6">
            {posts.length === 0 ? (
              <EmptyCard
                title="No briefs posted yet"
                copy="Create your first brief and track responses from builders right here."
                ctaHref="/post"
                ctaLabel="Post a brief"
              />
            ) : (
              <div className="board-panel p-6 md:p-8">
                <h2 className="font-display text-4xl font-semibold tracking-[-0.05em] text-[var(--board-ink)]">Your posted briefs</h2>
                <div className="mt-5 space-y-4">
                  {posts.map((post) => (
                    <article key={post.id} className="rounded-2xl border border-[color:var(--board-line)] bg-[var(--board-panel-strong)] p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap gap-2">
                            <Pill>{post.type === "job" ? "Paid task" : "Problem brief"}</Pill>
                            {post.type === "job" && post.jobStatus ? <Pill>{formatJobStatus(post.jobStatus)}</Pill> : null}
                          </div>
                          <Link to={`/problem/${post.id}`} className="mt-3 block font-display text-3xl font-semibold tracking-[-0.05em] text-[var(--board-ink)]">
                            {post.title}
                          </Link>
                          <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--board-muted)]">{post.description}</p>
                        </div>
                        <div className="sm:text-right">
                          <p className="board-eyebrow">{post.type === "job" ? "Budget" : "Bounty"}</p>
                          <p className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em] text-[var(--board-ink)]">
                            {formatBudget(post)}
                          </p>
                          <p className="mt-2 text-sm text-[var(--board-muted)]">{post.proposals} bid{post.proposals === 1 ? "" : "s"}</p>
                          <Button
                            variant="outline"
                            onClick={() => handleDeletePost(post)}
                            disabled={deletingPostId === post.id}
                            className="mt-4 border-[color:rgba(219,84,97,0.34)] bg-transparent text-[var(--board-accent)] hover:bg-[rgba(219,84,97,0.12)]"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {deletingPostId === post.id ? "Deleting..." : "Delete"}
                          </Button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="bids" className="mt-6">
            {proposals.length === 0 ? (
              <EmptyCard
                title="No bids yet"
                copy="When you respond to briefs, your proposals and accepted work will show up here."
                ctaHref="/browse"
                ctaLabel="Browse work"
              />
            ) : (
              <div className="board-panel p-6 md:p-8">
                <h2 className="font-display text-4xl font-semibold tracking-[-0.05em] text-[var(--board-ink)]">Your bids and active work</h2>
                <p className="mt-2 text-sm text-[var(--board-muted)]">
                  {acceptedJobs.length} accepted job{acceptedJobs.length === 1 ? "" : "s"} currently in progress.
                </p>
                <div className="mt-5 space-y-4">
                  {proposals.map((proposal) => (
                    <article key={proposal.id} className="rounded-2xl border border-[color:var(--board-line)] bg-[var(--board-panel-strong)] p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap gap-2">
                            <Pill>{proposal.problemType === "job" ? "Paid task" : "Problem brief"}</Pill>
                            <Pill>{proposal.status || "pending"}</Pill>
                            {proposal.jobStatus ? <Pill>{formatJobStatus(proposal.jobStatus)}</Pill> : null}
                          </div>
                          <Link
                            to={`/problem/${proposal.problemId}`}
                            className="mt-3 block font-display text-3xl font-semibold tracking-[-0.05em] text-[var(--board-ink)]"
                          >
                            {proposal.problemTitle || "Untitled brief"}
                          </Link>
                          <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--board-muted)]">
                            {proposal.briefSolution || proposal.description}
                          </p>
                        </div>
                        <div className="sm:text-right">
                          {proposal.proposedPriceSol ? (
                            <p className="font-display text-3xl font-semibold tracking-[-0.05em] text-[var(--board-ink)]">
                              {formatSol(proposal.proposedPriceSol)} SOL
                            </p>
                          ) : proposal.cost ? (
                            <p className="text-sm text-[var(--board-muted)]">{proposal.cost}</p>
                          ) : null}
                          {proposal.tipTotal ? (
                            <p className="mt-2 text-sm text-[var(--board-accent)]">{formatSol(proposal.tipTotal)} tipped</p>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            {notifications.length === 0 ? (
              <EmptyCard title="No signals yet" copy="Activity updates, replies, and board events will appear here." />
            ) : (
              <div className="board-panel p-6 md:p-8">
                <h2 className="font-display text-4xl font-semibold tracking-[-0.05em] text-[var(--board-ink)]">Signals</h2>
                <div className="mt-5 space-y-3">
                  {notifications.map((notification) => (
                    <article key={notification.id} className="rounded-2xl border border-[color:var(--board-line)] bg-[var(--board-panel-strong)] p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <Pill>{notification.is_read ? "Read" : "Unread"}</Pill>
                          <p className="mt-3 text-sm leading-7 text-[var(--board-ink)] md:text-base">{notification.message}</p>
                          <p className="mt-1 text-xs text-[var(--board-muted)]">{new Date(notification.created_at).toLocaleString()}</p>
                        </div>
                        {notification.link ? (
                          <Link
                            to={notification.link}
                            onClick={() => {
                              if (!notification.is_read) {
                                void markNotificationRead(notification.id).then(() => {
                                  setNotifications((current) =>
                                    current.map((item) =>
                                      item.id === notification.id ? { ...item, is_read: true } : item
                                    )
                                  );
                                });
                              }
                            }}
                            className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[var(--board-accent)]"
                          >
                            Open
                          </Link>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <PayoutWalletDialog
        open={walletDialogOpen}
        onOpenChange={setWalletDialogOpen}
        walletCount={walletCount}
        onWalletsChange={(count) => {
          setWalletCount(count);
          void loadDashboard(false);
        }}
      />
    </div>
  );
}
