import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Camera, Cpu, Loader2, Rocket, Signal, User, Wallet, Search, AlertCircle, BarChart3, ArrowRight, Trash2, X, Crown, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Navbar } from "./navbar";
import { DashboardBackground } from "./dashboard-background";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { supabase } from "../../../lib/supabaseClient";
import {
  upsertPrimaryWalletApi,
  listUserWalletsApi,
  deleteUserWalletApi,
  type WalletChainDto,
  type UserWalletApiRow,
} from "../../lib/user-wallets-api";
import { fetchDashboardSnapshot, uploadDashboardAvatar, type DashboardProfile } from "../../lib/user-dashboard-api";
import { formatTimeAgo, type ProblemPost, type ProposalRecord } from "../../lib/marketplace";

function isNetworkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("ECONNREFUSED") || msg.includes("Could not connect");
}

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
  const [walletChain, setWalletChain] = useState<WalletChainDto>("solana");
  const [walletAddress, setWalletAddress] = useState("");
  const [walletSaving, setWalletSaving] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "posted" | "wallets">("overview");
  const [wallets, setWallets] = useState<UserWalletApiRow[]>([]);
  const [walletsLoading, setWalletsLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [showAddresses, setShowAddresses] = useState(false);

  function maskAddress(address: string) {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

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

  const handleSaveWallet = async () => {
    setWalletError(null);
    const trimmed = walletAddress.trim();
    if (!trimmed) { setWalletError("Address is required."); return; }

    if (walletChain === "solana") {
      if (trimmed.length < 32 || trimmed.length > 44) { setWalletError("Invalid Solana address (32–44 chars)."); return; }
    } else {
      if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) { setWalletError("Invalid EVM address (0x + 40 hex chars)."); return; }
    }

    setWalletSaving(true);
    try {
      try {
        await upsertPrimaryWalletApi(walletChain, trimmed);
      } catch (apiErr) {
        if (!isNetworkError(apiErr)) console.warn("[dashboard] API save failed, using Supabase fallback", apiErr);
        if (!user) throw new Error("Not authenticated");
        // Mimic server-side upsert: delete existing wallet for this chain, then insert
        const { error: deleteErr } = await supabase
          .from("wallets")
          .delete()
          .eq("user_id", user.id)
          .eq("chain", walletChain);
        if (deleteErr) throw deleteErr;
        const { error: insertErr } = await supabase
          .from("wallets")
          .insert({ user_id: user.id, chain: walletChain, address: trimmed, is_primary: true });
        if (insertErr) throw insertErr;
      }
      setWalletAddress("");
      setActionMessage("Wallet saved.");
      void loadDashboard(false);
      if (activeTab === "wallets") {
        void fetchWalletsList();
      }
    } catch (err) {
      setWalletError(err instanceof Error ? err.message : "Failed to save wallet.");
    } finally {
      setWalletSaving(false);
    }
  };

  const fetchWalletsList = async () => {
    if (!user) return;
    setWalletsLoading(true);
    try {
      try {
        const rows = await listUserWalletsApi();
        setWallets(rows);
        setWalletCount(rows.length);
      } catch (apiErr) {
        if (!isNetworkError(apiErr)) console.warn("[dashboard] API list failed, using Supabase", apiErr);
        const { data, error } = await supabase
          .from("wallets")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });
        if (error) throw error;
        const rows = (data ?? []) as UserWalletApiRow[];
        setWallets(rows);
        setWalletCount(rows.length);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load wallets.");
    } finally {
      setWalletsLoading(false);
    }
  };

  const handleDeleteWallet = async (walletId: string) => {
    try {
      try {
        await deleteUserWalletApi(walletId);
      } catch (apiErr) {
        if (!isNetworkError(apiErr)) console.warn("[dashboard] API delete failed, using Supabase", apiErr);
        const { error } = await supabase.from("wallets").delete().eq("id", walletId);
        if (error) throw error;
      }
      await fetchWalletsList();
      setActionMessage("Wallet removed.");
      void loadDashboard(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove wallet.");
    }
  };

  const handleMakePrimary = async (walletId: string, chain: string) => {
    if (!user) return;
    try {
      const { error: clearErr } = await supabase
        .from("wallets")
        .update({ is_primary: false })
        .eq("user_id", user.id)
        .eq("chain", chain);
      if (clearErr) throw clearErr;

      const { error: setErr } = await supabase
        .from("wallets")
        .update({ is_primary: true })
        .eq("id", walletId)
        .eq("user_id", user.id);
      if (setErr) throw setErr;

      await fetchWalletsList();
      setActionMessage("Primary wallet updated.");
      void loadDashboard(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update primary wallet.");
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

      <main className="board-container relative py-8 md:py-10">
        <DashboardBackground />
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
          {/* Main panel */}
          <div className="board-panel relative overflow-hidden p-6 md:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(160,168,173,0.08),transparent_45%)]" />
            <div className="relative">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 animate-[cpuPulse_3s_ease-in-out_infinite] text-[#e8c547]" />
                <p className="board-kicker">Mission Control</p>
              </div>
              <h1 className="mt-3 font-display text-6xl font-semibold tracking-[-0.06em] text-[var(--board-ink)]">{displayName}</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--board-muted)] md:text-base">
                Manage your identity, payout wallets, posted briefs, and active bids from one clean workspace.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link to="/browse">
                  <Button className="h-11 border-0 bg-[var(--board-metal-accent)] px-5 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[var(--board-metal-dark)] transition-all hover:bg-[var(--board-metal-light)] hover:shadow-[0_0_20px_rgba(200,205,208,0.35)] hover:scale-[1.02]">
                    <Search className="mr-2 h-4 w-4" />
                    Browse
                  </Button>
                </Link>
                <Link to="/post">
                  <Button className="h-11 border-0 bg-[var(--board-accent)] px-5 text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-white transition-all hover:bg-[var(--color-accent-hover)] hover:shadow-[0_0_20px_rgba(200,205,208,0.35)] hover:scale-[1.02]">
                    <Rocket className="mr-2 h-4 w-4" />
                    Post brief
                  </Button>
                </Link>
              </div>

              <div className="mt-8 grid gap-3 border-t border-[color:var(--board-line)] pt-5 sm:grid-cols-2 xl:grid-cols-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("posted")}
                  className="group nav-link-shine-teal rounded-xl border border-[color:var(--board-line)] bg-[var(--board-panel-strong)] p-4 text-left transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-3.5 w-3.5 text-[var(--board-metal-steel)] transition-all duration-300 group-hover:text-white group-hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]" />
                    <p className="board-eyebrow transition-colors duration-300 group-hover:text-white">Posted</p>
                  </div>
                  <p className="mt-2 text-sm text-[var(--board-muted)] transition-colors duration-300 group-hover:text-white">{posts.length} brief{posts.length === 1 ? "" : "s"}</p>
                </button>
                <div className="rounded-xl border border-[color:var(--board-line)] bg-[var(--board-panel-strong)] p-4">
                  <div className="flex items-center gap-2">
                    <Signal className="h-3.5 w-3.5 text-[var(--board-metal-steel)]" />
                    <p className="board-eyebrow">Bids</p>
                  </div>
                  <p className="mt-2 text-sm text-[var(--board-muted)]">{proposals.length} proposal{proposals.length === 1 ? "" : "s"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setActiveTab("wallets"); void fetchWalletsList(); }}
                  className="group nav-link-shine-teal rounded-xl border border-[color:var(--board-line)] bg-[var(--board-panel-strong)] p-4 text-left transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Wallet className="h-3.5 w-3.5 text-[var(--board-metal-steel)] transition-all duration-300 group-hover:text-white group-hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.6)]" />
                    <p className="board-eyebrow transition-colors duration-300 group-hover:text-white">Wallets</p>
                  </div>
                  <p className="mt-2 text-sm text-[var(--board-muted)] transition-colors duration-300 group-hover:text-white">{walletCount} linked wallet{walletCount === 1 ? "" : "s"}</p>
                </button>
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

            {/* Inline wallet input */}
            <div className="mt-4 space-y-3 rounded-xl border border-[color:var(--board-line)] bg-[var(--board-panel)] p-4">
              <p className="board-eyebrow">Add payout wallet</p>
              <Select value={walletChain} onValueChange={(v) => setWalletChain(v as WalletChainDto)}>
                <SelectTrigger className="board-field h-10 text-[var(--board-ink)]">
                  <SelectValue placeholder="Chain" />
                </SelectTrigger>
                <SelectContent className="border-[color:var(--board-line-strong)] bg-[var(--board-panel-strong)] text-[var(--board-ink)]">
                  <SelectItem value="solana">Solana</SelectItem>
                  <SelectItem value="ethereum">Ethereum</SelectItem>
                  <SelectItem value="polygon">Polygon</SelectItem>
                  <SelectItem value="arbitrum">Arbitrum</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Wallet address"
                value={walletAddress}
                onChange={(e) => { setWalletAddress(e.target.value); setWalletError(null); }}
                className="board-field h-10"
              />
              {walletError ? (
                <div className="flex items-center gap-2 text-xs text-[var(--board-accent)]">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {walletError}
                </div>
              ) : null}
              <Button
                onClick={() => void handleSaveWallet()}
                disabled={walletSaving || !walletAddress.trim()}
                className="h-10 w-full border-0 bg-[var(--board-accent)] text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-white hover:bg-[var(--color-accent-hover)]"
              >
                {walletSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                Save wallet
              </Button>
            </div>
          </aside>
        </section>

        {/* Bottom tabbed section */}
        {activeTab === "posted" && (
          <section className="board-panel mt-6 p-6 md:p-8">
            <div className="flex items-center justify-between border-b border-[color:var(--board-line)] pb-4">
              <h2 className="board-subtitle text-[1.4rem]">Posted briefs</h2>
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--board-line)] text-[var(--board-muted)] hover:bg-[var(--board-panel-strong)] hover:text-[var(--board-ink)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {posts.length === 0 ? (
                <p className="text-sm text-[var(--board-muted)]">No briefs posted yet.</p>
              ) : (
                posts.map((post) => (
                  <Link
                    key={post.id}
                    to={`/problem/${post.id}`}
                    className="flex items-center justify-between rounded-lg border border-[color:var(--board-line)] bg-[var(--board-panel)] p-4 transition-colors hover:bg-[var(--board-panel-strong)]"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--board-ink)]">{post.title}</p>
                      <p className="mt-1 text-xs text-[var(--board-muted)]">
                        {post.category} • {formatTimeAgo(post.createdAt)}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-[var(--board-accent)]" />
                  </Link>
                ))
              )}
            </div>
          </section>
        )}

        {activeTab === "wallets" && (
          <section className="board-panel mt-6 p-6 md:p-8">
            <div className="flex items-center justify-between border-b border-[color:var(--board-line)] pb-4">
              <h2 className="board-subtitle text-[1.4rem]">Linked wallets</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddresses((s) => !s)}
                  className="flex items-center gap-2 rounded-lg border border-[color:var(--board-line)] px-3 py-1.5 text-xs font-medium text-[var(--board-muted)] hover:bg-[var(--board-panel-strong)] hover:text-[var(--board-ink)]"
                >
                  {showAddresses ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {showAddresses ? "Hide" : "Reveal"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("overview")}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--board-line)] text-[var(--board-muted)] hover:bg-[var(--board-panel-strong)] hover:text-[var(--board-ink)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {walletsLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--board-accent)]" />
                </div>
              ) : wallets.length === 0 ? (
                <p className="text-sm text-[var(--board-muted)]">No wallets linked.</p>
              ) : (
                wallets.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between gap-4 rounded-lg border border-[color:var(--board-line)] bg-[var(--board-panel)] p-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="board-pill text-[0.65rem]">{w.chain}</span>
                        {w.is_primary && (
                          <span className="inline-flex items-center text-[#e8c547]" title="Primary">
                            <Crown className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                      <p className="mt-2 font-mono text-xs text-[var(--board-ink)] break-all">
                        {showAddresses ? w.address : maskAddress(w.address)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!w.is_primary && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleMakePrimary(w.id, w.chain)}
                          className="shrink-0 border-[color:var(--board-line)] text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-[var(--board-muted)] hover:border-[color:rgba(6,167,125,0.4)] hover:bg-[rgba(6,167,125,0.12)] hover:text-[#06A77D]"
                        >
                          Make primary
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleDeleteWallet(w.id)}
                        className="shrink-0 border-[color:var(--board-line)] text-[var(--board-muted)] hover:border-[color:rgba(201,84,94,0.34)] hover:bg-[rgba(201,84,94,0.12)] hover:text-[var(--board-accent)]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <p className="mt-4 text-sm text-[var(--board-muted)]">
              {wallets.length} linked wallet{wallets.length === 1 ? "" : "s"}
            </p>
          </section>
        )}

        {error ? <div className="board-inline-note mt-6">{error}</div> : null}
        {actionMessage ? <div className="board-inline-note mt-6">{actionMessage}</div> : null}
      </main>


    </div>
  );
}
