import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Camera, Cpu, Loader2, Rocket, Signal, User, Wallet, ArrowRight, AlertCircle, BarChart3 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Navbar } from "./navbar";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { PayoutWalletDialog } from "./payout-wallet-dialog";
import { fetchDashboardSnapshot, uploadDashboardAvatar, type DashboardProfile } from "../../lib/user-dashboard-api";
import { type ProblemPost, type ProposalRecord } from "../../lib/marketplace";

export function BuilderDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [posts, setPosts] = useState<ProblemPost[]>([]);
  const [proposals, setProposals] = useState<ProposalRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [walletCount, setWalletCount] = useState(0);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);

  const loadDashboard = async (showSpinner = false) => {
    if (!user) return;
    if (showSpinner) setLoading(true);
    try {
      setError(null);
      const snapshot = await fetchDashboardSnapshot(user.id);
      setProfile(snapshot.profile);
      setWalletCount(snapshot.walletCount);
      setPosts(snapshot.posts);
      setProposals(snapshot.proposals);
      setUnreadCount(snapshot.notifications.filter((n) => !n.is_read).length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard.");
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => { void loadDashboard(true); }, [user]);
  useEffect(() => { return () => { if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl); }; }, [avatarPreviewUrl]);

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    const MAX_BYTES = 5 * 1024 * 1024;
    setAvatarError(null);
    if (!file.type.startsWith("image/")) { setAvatarError("Please upload an image file."); return; }
    if (file.size > MAX_BYTES) { setAvatarError("Image is too large (max 5MB)."); return; }
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
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
          {/* Main panel */}
          <div className="board-panel relative overflow-hidden p-6 md:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(160,168,173,0.08),transparent_45%)]" />
            <div className="relative">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-[var(--board-metal-steel)]" />
                <p className="board-kicker">Mission Control</p>
              </div>
              <h1 className="mt-3 font-display text-6xl font-semibold tracking-[-0.06em] text-[var(--board-ink)]">{displayName}</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--board-muted)] md:text-base">
                Manage your identity, payout wallets, posted briefs, and active bids from one clean workspace.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button onClick={() => setWalletDialogOpen(true)} className="h-11 border-0 bg-[var(--board-accent)] px-5 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-white hover:bg-[var(--color-accent-hover)]">
                  <Wallet className="mr-2 h-4 w-4" />
                  Add wallet
                </Button>
                <Link to="/post">
                  <Button variant="outline" className="h-11 border-[color:var(--board-line-strong)] bg-transparent px-5 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--board-muted)] hover:bg-[var(--board-panel-strong)] hover:text-[var(--board-ink)]">
                    <Rocket className="mr-2 h-4 w-4" />
                    Post brief
                  </Button>
                </Link>
              </div>

              <div className="mt-8 grid gap-3 border-t border-[color:var(--board-line)] pt-5 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-[color:var(--board-line)] bg-[var(--board-panel-strong)] p-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-3.5 w-3.5 text-[var(--board-metal-steel)]" />
                    <p className="board-eyebrow">Posted</p>
                  </div>
                  <p className="mt-2 text-sm text-[var(--board-muted)]">{posts.length} brief{posts.length === 1 ? "" : "s"}</p>
                </div>
                <div className="rounded-xl border border-[color:var(--board-line)] bg-[var(--board-panel-strong)] p-4">
                  <div className="flex items-center gap-2">
                    <Signal className="h-3.5 w-3.5 text-[var(--board-metal-steel)]" />
                    <p className="board-eyebrow">Bids</p>
                  </div>
                  <p className="mt-2 text-sm text-[var(--board-muted)]">{proposals.length} proposal{proposals.length === 1 ? "" : "s"}</p>
                </div>
                <div className="rounded-xl border border-[color:var(--board-line)] bg-[var(--board-panel-strong)] p-4">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-3.5 w-3.5 text-[var(--board-metal-steel)]" />
                    <p className="board-eyebrow">Wallets</p>
                  </div>
                  <p className="mt-2 text-sm text-[var(--board-muted)]">{walletCount} linked wallet{walletCount === 1 ? "" : "s"}</p>
                </div>
                <div className="rounded-xl border border-[color:var(--board-line)] bg-[var(--board-panel-strong)] p-4">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-3.5 w-3.5 text-[var(--board-metal-steel)]" />
                    <p className="board-eyebrow">Signals</p>
                  </div>
                  <p className="mt-2 text-sm text-[var(--board-muted)]">{unreadCount} unread signal{unreadCount === 1 ? "" : "s"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Profile sidebar */}
          <aside className="board-panel p-6">
            <p className="board-kicker">Profile</p>
            <div className="mt-4 flex items-center gap-4">
              <Avatar className="size-16 border border-[color:var(--board-line-strong)]">
                {avatarPreviewUrl || profile?.avatar_url ? (
                  <AvatarImage src={avatarPreviewUrl || profile?.avatar_url || undefined} alt="Profile" className="object-cover" />
                ) : null}
                <AvatarFallback><User className="h-5 w-5 text-[var(--board-muted)]" /></AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-[var(--board-ink)]">{displayName}</p>
                <p className="text-sm text-[var(--board-muted)]">@{profile?.username || user?.username || "user"}</p>
              </div>
            </div>

            <label className="mt-5 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[color:var(--board-line-strong)] bg-transparent px-4 py-2.5 text-sm text-[var(--board-muted)] hover:bg-[var(--board-panel-strong)] hover:text-[var(--board-ink)]">
              {avatarUploading ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Uploading...</>
              ) : (
                <><Camera className="h-4 w-4" />Update picture</>
              )}
              <input type="file" accept="image/*" disabled={avatarUploading} className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (!file) return; void handleAvatarUpload(file); }} />
            </label>
            {avatarError ? (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-[color:rgba(201,84,94,0.34)] bg-[rgba(201,84,94,0.12)] px-3 py-2 text-sm text-[var(--board-accent)]">
                <AlertCircle className="h-4 w-4" />{avatarError}
              </div>
            ) : null}

            <button type="button" onClick={() => setWalletDialogOpen(true)} className="mt-4 flex w-full items-center justify-between rounded-xl border border-[color:var(--board-line)] bg-[var(--board-panel)] px-4 py-3 text-sm text-[var(--board-ink)] hover:bg-[var(--board-panel-strong)]">
              <span>Manage wallets</span>
              <ArrowRight className="h-4 w-4 text-[var(--board-accent)]" />
            </button>
          </aside>
        </section>

        {error ? <div className="board-inline-note mt-6">{error}</div> : null}
        {actionMessage ? <div className="board-inline-note mt-6">{actionMessage}</div> : null}
      </main>

      <PayoutWalletDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen} walletCount={walletCount} onWalletsChange={(count) => { setWalletCount(count); void loadDashboard(false); }} />
    </div>
  );
}
