import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Bell, Briefcase, CheckCircle2, Edit2, Loader2, Save, User, Wallet, Camera, AlertCircle, Trash2, ArrowRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../../../lib/supabaseClient";
import { API_ENDPOINTS } from "../../lib/api-config";
import { Navbar } from "./navbar";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { formatBudget, formatJobStatus, formatSol, type NotificationRow, type ProblemPost, type ProposalRecord } from "../../lib/marketplace";
import { PayoutWalletDialog } from "./payout-wallet-dialog";

interface ProfileData {
  username: string;
  full_name: string | null;
  bio: string | null;
  reputation_score: number;
  user_type: string;
  created_at: string;
  wallet_address?: string | null;
  avatar_url?: string | null;
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
          <Button className="board-btn-primary mt-6 h-11 border-0 bg-[var(--board-accent)] px-5 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-[var(--color-accent-hover)]">
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
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [briefActionMessage, setBriefActionMessage] = useState<string | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({ full_name: "", bio: "" });

  const activeJobs = useMemo(
    () => proposals.filter((proposal) => proposal.problemType === "job" && proposal.isAcceptedBuilder),
    [proposals]
  );

  const unreadSignals = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications]
  );

  const loadDashboard = async (showSpinner = false) => {
    if (!user) {
      return;
    }

    if (showSpinner) {
      setLoading(true);
    }

    try {
      setDashboardError(null);
      const [profileResult, walletCountResult, notificationsResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("username, full_name, bio, reputation_score, user_type, created_at, wallet_address, avatar_url")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.from("wallets").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase
          .from("notifications")
          .select("id, message, link, is_read, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      if (profileResult.error) {
        throw profileResult.error;
      }
      if (walletCountResult.error) {
        throw walletCountResult.error;
      }
      if (notificationsResult.error) {
        throw notificationsResult.error;
      }

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

      if (!postsResponse.ok) {
        throw new Error("Failed to load your posted briefs.");
      }
      if (!proposalsResponse.ok) {
        throw new Error("Failed to load your bids.");
      }

      const postsData = await postsResponse.json();
      const proposalsData = await proposalsResponse.json();
      setPosts(Array.isArray(postsData.problems) ? postsData.problems : []);
      setProposals(Array.isArray(proposalsData.proposals) ? proposalsData.proposals : []);
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : "Failed to load dashboard data.");
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
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl]);

  const handleSaveProfile = async () => {
    if (!user) {
      return;
    }

    try {
      setSavingProfile(true);
      setBriefActionMessage(null);
      const { data } = await supabase
        .from("profiles")
        .update({
          full_name: profileForm.full_name,
          bio: profileForm.bio,
        })
        .eq("user_id", user.id)
        .select("username, full_name, bio, reputation_score, user_type, created_at, wallet_address, avatar_url")
        .single();

      if (!data) {
        throw new Error("Failed to update profile.");
      }

      setProfile(data);
      setEditingProfile(false);
      setBriefActionMessage("Profile updated.");
    } catch (error) {
      setBriefActionMessage(error instanceof Error ? error.message : "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;

    setAvatarError(null);
    setAvatarUploading(true);

    const MAX_BYTES = 5 * 1024 * 1024;
    if (!file.type.startsWith("image/")) {
      setAvatarError("Please upload an image file.");
      setAvatarUploading(false);
      return;
    }
    if (file.size > MAX_BYTES) {
      setAvatarError("Image is too large (max 5MB).");
      setAvatarUploading(false);
      return;
    }

    // Show an immediate preview while uploading.
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreviewUrl(previewUrl);

    try {
      const extRaw = (file.name.split(".").pop() || "").trim().toLowerCase();
      const safeExt = extRaw && extRaw.length <= 6 ? extRaw : "png";
      const objectPath = `${user.id}/${Date.now()}-${Math.random().toString(16).slice(2)}.${safeExt}`;

      const uploadResult = await supabase.storage.from("avatars").upload(objectPath, file, {
        upsert: true,
        contentType: file.type,
      });

      if (uploadResult.error) throw uploadResult.error;

      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(objectPath);
      const publicUrl = publicUrlData.publicUrl;

      const { error: updateErr } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
      if (updateErr) throw updateErr;

      setProfile((prev) => (prev ? { ...prev, avatar_url: publicUrl } : prev));
      URL.revokeObjectURL(previewUrl);
      setAvatarPreviewUrl(null);
      setBriefActionMessage("Profile picture updated.");
    } catch (err: any) {
      setAvatarError(err?.message ?? "Failed to upload avatar.");
      // If upload fails, clear the preview so we don't display a non-persisted image.
      setAvatarPreviewUrl(null);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleWalletsChange = async (count: number) => {
    setWalletCount(count);
    await loadDashboard(false);
  };

  const handleNotificationOpen = async (notification: NotificationRow) => {
    if (!notification.is_read) {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notification.id);
      if (!error) {
        setNotifications((current) =>
          current.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item))
        );
      }
    }
  };

  const handleDeletePost = async (post: ProblemPost) => {
    const confirmed = window.confirm(
      `Delete "${post.title}"? This will remove the post and related activity.`
    );
    if (!confirmed) {
      return;
    }

    try {
      setDeletingPostId(post.id);
      setBriefActionMessage(null);
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(API_ENDPOINTS.DELETE_PROBLEM(post.id), {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to delete post");
      }

      setPosts((current) => current.filter((item) => item.id !== post.id));
      setBriefActionMessage(`Deleted "${post.title}".`);
    } catch (err) {
      setBriefActionMessage(err instanceof Error ? err.message : "Failed to delete post");
    } finally {
      setDeletingPostId(null);
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
  const identityCopy = profile?.user_type === "builder"
    ? "Track the briefs you are chasing, the work you have landed, and the wallets that should get paid."
    : "Track the work you posted, the builders replying, and the signals coming back from the board.";

  return (
    <div className="board-app">
      <Navbar />

      <main className="board-container py-8 md:py-10">
        <section className="grid gap-6 border-b border-[color:var(--board-line)] pb-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <div className="board-panel p-6 md:p-8">
            <p className="board-kicker">Dashboard</p>
            <h1 className="board-title mt-3">{displayName}</h1>
            <p className="board-copy mt-5 max-w-3xl">{identityCopy}</p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button
                onClick={() => setWalletModalOpen(true)}
                className="board-btn-primary h-11 border-0 bg-[var(--board-accent)] px-5 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-[var(--color-accent-hover)]"
              >
                <Wallet className="mr-2 h-4 w-4" />
                Manage wallets
              </Button>
              <Link to="/post">
                <Button
                  variant="outline"
                  className="board-btn-secondary h-11 border-[color:var(--board-line-strong)] bg-transparent px-5 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-muted)] hover:bg-[var(--board-panel-strong)] hover:text-[var(--board-ink)]"
                >
                  Post a brief
                </Button>
              </Link>
            </div>

            <div className="mt-8 grid gap-3 border-t border-[color:var(--board-line)] pt-5 sm:grid-cols-3">
              <div className="rounded-xl border border-[color:var(--board-line)] bg-[var(--board-panel-strong)] p-4">
                <p className="board-eyebrow">Posted</p>
                <p className="mt-2 text-sm leading-7 text-[var(--board-muted)]">
                  {posts.length === 0 ? "No briefs yet." : `${posts.length} brief${posts.length === 1 ? "" : "s"} currently on the board.`}
                </p>
              </div>
              <div className="rounded-xl border border-[color:var(--board-line)] bg-[var(--board-panel-strong)] p-4">
                <p className="board-eyebrow">Replies</p>
                <p className="mt-2 text-sm leading-7 text-[var(--board-muted)]">
                  {proposals.length === 0 ? "No bids submitted yet." : `${proposals.length} active bid${proposals.length === 1 ? "" : "s"} across the marketplace.`}
                </p>
              </div>
              <div className="rounded-xl border border-[color:var(--board-line)] bg-[var(--board-panel-strong)] p-4">
                <p className="board-eyebrow">Signals</p>
                <p className="mt-2 text-sm leading-7 text-[var(--board-muted)]">
                  {unreadSignals === 0 ? "Everything is caught up." : `${unreadSignals} unread update${unreadSignals === 1 ? "" : "s"} waiting.`}
                </p>
              </div>
              <div className="rounded-xl border border-[color:var(--board-line)] bg-[var(--board-panel-strong)] p-4 sm:col-span-3">
                <p className="board-eyebrow">Payout Routes</p>
                <p className="mt-2 text-sm leading-7 text-[var(--board-muted)]">
                  {walletCount === 0 ? "No wallets connected yet." : `${walletCount} payout wallet${walletCount === 1 ? "" : "s"} connected and ready.`}
                </p>
              </div>
            </div>
          </div>

          <aside className="board-panel board-panel--command p-6">
            <p className="board-kicker">Quick Start</p>
            <h2 className="board-subtitle mt-3 text-[1.8rem]">Use the dashboard like a control room.</h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-[var(--board-muted)]">
              <p>Keep your profile current so people know who is behind the work.</p>
              <p>Jump into posted briefs, submitted bids, accepted work, or signals without scanning filler metrics.</p>
              <p>Open wallet management only when you actually need to update payout paths.</p>
            </div>
            <div className="mt-6 space-y-3 border-t border-[color:var(--board-line)] pt-5">
              <button onClick={() => setWalletModalOpen(true)} className="flex w-full items-center justify-between rounded-xl border border-[color:var(--board-line)] bg-[var(--board-panel)] px-4 py-3 text-left text-sm text-[var(--board-ink)] hover:bg-[var(--board-panel-strong)]">
                <span>Update payout wallets</span>
                <ArrowRight className="h-4 w-4 text-[var(--board-accent)]" />
              </button>
              <Link to="/post" className="flex items-center justify-between rounded-xl border border-[color:var(--board-line)] bg-[var(--board-panel)] px-4 py-3 text-sm text-[var(--board-ink)] hover:bg-[var(--board-panel-strong)]">
                <span>Create a new brief</span>
                <ArrowRight className="h-4 w-4 text-[var(--board-accent)]" />
              </Link>
              <Link to="/browse" className="flex items-center justify-between rounded-xl border border-[color:var(--board-line)] bg-[var(--board-panel)] px-4 py-3 text-sm text-[var(--board-ink)] hover:bg-[var(--board-panel-strong)]">
                <span>Browse live work</span>
                <ArrowRight className="h-4 w-4 text-[var(--board-accent)]" />
              </Link>
            </div>
          </aside>
        </section>

        <Tabs defaultValue="identity" className="board-section px-0">
          {dashboardError ? (
            <div className="board-inline-note mb-6">
              {dashboardError}
            </div>
          ) : null}

          {briefActionMessage ? (
            <div className="board-inline-note mb-6">
              {briefActionMessage}
            </div>
          ) : null}

          <TabsList className="board-tabs grid h-auto w-full p-1 md:grid-cols-5">
            <TabsTrigger value="identity">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="briefs">
              <Briefcase className="h-4 w-4" />
              Posted
            </TabsTrigger>
            <TabsTrigger value="bids">
              <Edit2 className="h-4 w-4" />
              Bids
            </TabsTrigger>
            <TabsTrigger value="bounties">
              <CheckCircle2 className="h-4 w-4" />
              Active work
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
                          className="board-field"
                        />
                      </div>
                      <div>
                        <Label className="mb-2 block text-sm text-[var(--board-ink)]">Bio</Label>
                        <Textarea
                          value={profileForm.bio}
                          onChange={(event) => setProfileForm({ ...profileForm, bio: event.target.value })}
                          className="board-field min-h-[160px]"
                        />
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Button
                          onClick={handleSaveProfile}
                          disabled={savingProfile}
                          className="board-btn-primary h-11 border-0 bg-[var(--board-accent)] px-5 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-white hover:bg-[var(--color-accent-hover)]"
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {savingProfile ? "Saving..." : "Save profile"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setEditingProfile(false)}
                          className="board-btn-secondary h-11 border-[color:var(--board-line-strong)] bg-transparent px-5 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-muted)] hover:bg-[var(--board-panel-strong)] hover:text-[var(--board-ink)]"
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
                          className="board-btn-secondary h-11 border-[color:var(--board-line-strong)] bg-transparent px-5 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-muted)] hover:bg-[var(--board-panel-strong)] hover:text-[var(--board-ink)]"
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
                  <p className="board-kicker">Profile</p>
                  <div className="mt-5 space-y-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="size-16 border border-[color:var(--board-line-strong)] bg-[var(--board-panel)]">
                        {avatarPreviewUrl || profile?.avatar_url ? (
                          <AvatarImage src={avatarPreviewUrl || profile?.avatar_url || undefined} alt="Profile picture" className="object-cover" />
                        ) : null}
                        <AvatarFallback>
                          <Camera className="h-5 w-5 text-[var(--board-soft)]" />
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0">
                        <p className="board-eyebrow">Profile picture</p>
                        <p className="mt-2 text-sm text-[var(--board-muted)]">JPG/PNG/GIF up to 5MB</p>
                      </div>
                    </div>

                    <label
                      className="board-btn-secondary flex cursor-pointer items-center justify-center gap-2 border border-[color:var(--board-line-strong)] bg-transparent px-4 py-2 text-sm font-semibold text-[var(--board-muted)] hover:bg-[var(--board-panel-strong)] hover:text-[var(--board-ink)] disabled:opacity-50"
                    >
                      {avatarUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Camera className="h-4 w-4" />
                          Upload picture
                        </>
                      )}

                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={avatarUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          // Allow selecting the same file again.
                          e.target.value = "";
                          void handleAvatarUpload(file);
                        }}
                      />
                    </label>

                    {avatarError ? (
                      <div className="flex items-center gap-2 rounded-lg border border-[color:rgba(219,84,97,0.34)] bg-[rgba(219,84,97,0.12)] px-4 py-3 text-sm text-[var(--board-accent)]">
                        <AlertCircle className="h-4 w-4" />
                        {avatarError}
                      </div>
                    ) : null}
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
              <div className="board-panel p-6 md:p-8">
                <div className="flex flex-col gap-3 border-b border-[color:var(--board-line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="board-kicker">Posted</p>
                    <h2 className="board-subtitle mt-3">Your live briefs and tasks.</h2>
                  </div>
                  <p className="text-sm text-[var(--board-muted)]">Open anything here to review responses or clean up old listings.</p>
                </div>
                <div className="mt-2">
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
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleDeletePost(post)}
                          disabled={deletingPostId === post.id}
                          className="board-danger-btn mt-4 w-full md:ml-auto"
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
              <EmptyState
                title="No bids submitted yet."
                description="Browse the marketplace, reply to a strong brief, and your active bids will appear here."
                ctaHref="/browse"
                ctaLabel="Browse the board"
              />
            ) : (
              <div className="board-panel p-6 md:p-8">
                <div className="flex flex-col gap-3 border-b border-[color:var(--board-line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="board-kicker">Bids</p>
                    <h2 className="board-subtitle mt-3">Everything you have in motion.</h2>
                  </div>
                  <p className="text-sm text-[var(--board-muted)]">This view keeps your submitted proposals readable without opening each brief first.</p>
                </div>
                <div className="mt-2">
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
              <div className="board-panel p-6 md:p-8">
                <div className="flex flex-col gap-3 border-b border-[color:var(--board-line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="board-kicker">Active Work</p>
                    <h2 className="board-subtitle mt-3">Accepted jobs with a payout path.</h2>
                  </div>
                  <p className="text-sm text-[var(--board-muted)]">Only work that is actually active shows up here.</p>
                </div>
                <div className="mt-2">
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
              <div className="board-panel p-6 md:p-8">
                <div className="flex flex-col gap-3 border-b border-[color:var(--board-line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="board-kicker">Signals</p>
                    <h2 className="board-subtitle mt-3">Updates from the board.</h2>
                  </div>
                  <p className="text-sm text-[var(--board-muted)]">Unread items stay obvious without dominating the whole page.</p>
                </div>
                <div className="mt-2">
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
                          onClick={() => {
                            void handleNotificationOpen(notification);
                          }}
                          className="font-mono-alt text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--board-accent)] md:text-right"
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
        open={walletModalOpen}
        onOpenChange={setWalletModalOpen}
        walletCount={walletCount}
        onWalletsChange={(count) => {
          void handleWalletsChange(count);
        }}
      />
    </div>
  );
}
