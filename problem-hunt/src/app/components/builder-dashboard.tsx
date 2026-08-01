import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { AlertCircle, ArrowRight, Camera, CheckCircle2, ClipboardList, Eye, EyeOff, Loader2, Plus, RefreshCw, Trash2, User, Wallet } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Navbar } from "./navbar";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { addUserWalletApi, deleteUserWalletApi, listUserWalletsApi, setPrimaryUserWalletApi, type UserWalletApiRow, type WalletChainDto } from "../../lib/user-wallets-api";
import { deleteDashboardAvatar, fetchDashboardSnapshot, uploadDashboardAvatar, type DashboardProfile } from "../../lib/user-dashboard-api";
import { formatTimeAgo, type ProblemPost } from "../../lib/marketplace";

type DashboardTab = "briefs" | "wallets";

function shortenAddress(address: string) {
  return address.length > 14 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

function deadlineLabel(deadline?: string | null, now = Date.now()) {
  if (!deadline) return "No deadline set";
  const remaining = new Date(deadline).getTime() - now;
  if (Number.isNaN(remaining)) return "No deadline set";
  if (remaining <= 0) return "Deadline passed";
  const minutes = Math.ceil(remaining / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  return `${days ? `${days}d ` : ""}${hours ? `${hours}h ` : ""}${minutes % 60}m remaining`;
}

function walletTone(chain: WalletChainDto) {
  switch (chain) {
    case "solana": return "border-violet-300 bg-violet-50 text-violet-800";
    case "ethereum": return "border-sky-300 bg-sky-50 text-sky-800";
    case "polygon": return "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-800";
    case "arbitrum": return "border-blue-300 bg-blue-50 text-blue-800";
  }
}

export function BuilderDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [posts, setPosts] = useState<ProblemPost[]>([]);
  const [wallets, setWallets] = useState<UserWalletApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletsLoading, setWalletsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<DashboardTab>("briefs");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletChain, setWalletChain] = useState<WalletChainDto>("solana");
  const [walletAddress, setWalletAddress] = useState("");
  const [showAddresses, setShowAddresses] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const refreshDashboard = useCallback(async (showSpinner = false) => {
    if (!user) return;
    if (showSpinner) setLoading(true);
    try {
      setError(null);
      const snapshot = await fetchDashboardSnapshot(user.id);
      setProfile(snapshot.profile);
      setPosts(snapshot.posts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your dashboard.");
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [user]);

  const refreshWallets = useCallback(async () => {
    if (!user) return;
    setWalletsLoading(true);
    try {
      setError(null);
      setWallets(await listUserWalletsApi());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your wallets.");
    } finally {
      setWalletsLoading(false);
    }
  }, [user]);

  useEffect(() => { void refreshDashboard(true); void refreshWallets(); }, [refreshDashboard, refreshWallets]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); }, [avatarPreview]);

  const displayName = profile?.full_name || profile?.username || user?.username || "Your profile";
  const primaryWallet = useMemo(() => wallets.find((wallet) => wallet.is_primary) || wallets[0], [wallets]);

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) { setError("Choose an image file for your profile picture."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Profile pictures must be 5 MB or smaller."); return; }
    setError(null); setMessage(null); setAvatarBusy(true);
    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    try {
      const avatarUrl = await uploadDashboardAvatar(user.id, file);
      setProfile((current) => current ? { ...current, avatar_url: avatarUrl } : current);
      setMessage("Profile picture updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload profile picture.");
    } finally {
      URL.revokeObjectURL(preview);
      setAvatarPreview(null);
      setAvatarBusy(false);
    }
  };

  const removeAvatar = async () => {
    if (!user || !profile?.avatar_url || !window.confirm("Remove your profile picture?")) return;
    setError(null); setMessage(null); setAvatarBusy(true);
    try {
      await deleteDashboardAvatar(user.id, profile.avatar_url);
      setProfile((current) => current ? { ...current, avatar_url: null } : current);
      setMessage("Profile picture removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove profile picture.");
    } finally {
      setAvatarBusy(false);
    }
  };

  const saveWallet = async () => {
    const address = walletAddress.trim();
    if (!address) { setError("Enter a wallet address."); return; }
    if (walletChain === "solana" ? address.length < 32 || address.length > 44 : !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setError(walletChain === "solana" ? "Enter a valid Solana address." : "Enter a valid EVM address."); return;
    }
    setError(null); setMessage(null); setWalletBusy(true);
    try {
      await addUserWalletApi(walletChain, address);
      setWalletAddress("");
      await refreshWallets();
      setMessage("Wallet added. Choose it as primary whenever you are ready.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save wallet.");
    } finally {
      setWalletBusy(false);
    }
  };

  const removeWallet = async (walletId: string) => {
    if (!window.confirm("Remove this wallet?")) return;
    setError(null); setMessage(null);
    try {
      const removedWallet = wallets.find((wallet) => wallet.id === walletId);
      await deleteUserWalletApi(walletId);
      await refreshWallets();
      const fallback = removedWallet?.is_primary
        ? wallets.find((wallet) => wallet.id !== walletId && wallet.chain === removedWallet.chain)
        : undefined;
      if (fallback) {
        await setPrimaryUserWalletApi(fallback.id);
        await refreshWallets();
        setMessage("Wallet removed. Your remaining wallet is now the payout wallet.");
      } else {
        setMessage("Wallet removed.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove wallet.");
    }
  };

  const makePrimary = async (wallet: UserWalletApiRow) => {
    setError(null); setMessage(null);
    try {
      await setPrimaryUserWalletApi(wallet.id);
      await refreshWallets();
      setMessage("Primary wallet updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update primary wallet.");
    }
  };

  const handleRefresh = async () => {
    // Dashboard confirmations are intentionally ephemeral: refreshing returns
    // the workspace to the current server state rather than preserving a toast.
    setMessage(null);
    setError(null);
    await Promise.all([refreshDashboard(), refreshWallets()]);
  };

  if (loading) return <div className="board-app"><Navbar /><main className="board-container flex min-h-[55vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[var(--board-accent)]" /></main></div>;

  return (
    <div className="board-app">
      <Navbar />
      <main className="board-container py-8 md:py-12">
        <div className="mb-8 flex flex-col gap-5 border-b border-[color:var(--board-line)] pb-7 md:flex-row md:items-end md:justify-between">
          <div><p className="board-kicker">Account workspace</p><h1 className="board-title mt-3">Your dashboard</h1><p className="mt-3 max-w-2xl text-[var(--board-muted)]">Manage your profile, payout wallets, and every brief you have posted.</p></div>
          <Button variant="outline" onClick={() => void handleRefresh()} className="border-[color:var(--board-line-strong)] bg-white text-[var(--board-ink)] hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50"><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
        </div>

        {error ? <div role="alert" className="mb-6 flex gap-2 rounded-xl border border-[color:rgba(219,84,97,0.5)] bg-[rgba(219,84,97,0.14)] p-4 text-sm text-[#ffd9dd]"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div> : null}
        {message ? <div className="mb-6 flex gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100"><CheckCircle2 className="h-5 w-5 shrink-0" />{message}</div> : null}

        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="board-panel h-fit p-6">
            <p className="board-kicker">Profile</p>
            <div className="mt-5 flex items-center gap-4"><Avatar className="size-20 border-2 border-[color:var(--board-line-strong)]"><AvatarImage src={avatarPreview || profile?.avatar_url || undefined} alt={`${displayName}'s profile`} className="object-cover" /><AvatarFallback><User className="h-7 w-7 text-[var(--board-muted)]" /></AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-lg font-semibold text-[var(--board-ink)]">{displayName}</p><p className="truncate text-sm text-[var(--board-muted)]">@{profile?.username || user?.username || "user"}</p></div></div>
            <label className="mt-6 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[color:var(--board-line-strong)] px-4 py-2.5 text-sm font-medium text-[var(--board-ink)] hover:bg-[var(--board-panel-strong)]"><Camera className="h-4 w-4" />{avatarBusy ? "Working…" : "Upload picture"}<input className="hidden" type="file" accept="image/*" disabled={avatarBusy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void uploadAvatar(file); }} /></label>
            {profile?.avatar_url ? <Button variant="outline" disabled={avatarBusy} onClick={() => void removeAvatar()} className="mt-2 w-full border-[color:rgba(219,84,97,0.45)] bg-[rgba(219,84,97,0.1)] text-[#ffd9dd] hover:bg-[rgba(219,84,97,0.22)] hover:text-white"><Trash2 className="mr-2 h-4 w-4" />Remove picture</Button> : null}
            <div className="mt-6 border-t border-[color:var(--board-line)] pt-5"><p className="board-eyebrow">Primary payout wallet</p><p className="mt-2 break-all font-mono text-sm text-[var(--board-ink)]">{primaryWallet ? shortenAddress(primaryWallet.address) : "Not connected"}</p><p className={`mt-2 inline-flex rounded-md border px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${primaryWallet ? walletTone(primaryWallet.chain) : "border-[color:var(--board-line)] bg-[var(--board-panel-strong)] text-[var(--board-muted)]"}`}>{primaryWallet?.chain || "Add a wallet below"}</p></div>
          </aside>

          <section className="board-panel overflow-hidden">
              <div className="flex border-b border-[color:var(--board-line)] px-5 pt-3 md:px-7"><button onClick={() => { setTab("briefs"); void refreshDashboard(); }} className={`border-b-2 px-4 py-4 text-sm font-semibold transition ${tab === "briefs" ? "border-[var(--board-accent)] text-[var(--board-ink)]" : "border-transparent text-[var(--board-muted)] hover:text-[var(--board-ink)]"}`}><ClipboardList className="mr-2 inline h-4 w-4" />Posted briefs ({posts.length})</button><button onClick={() => { setTab("wallets"); void refreshWallets(); }} className={`border-b-2 px-4 py-4 text-sm font-semibold transition ${tab === "wallets" ? "border-[var(--board-accent)] text-[var(--board-ink)]" : "border-transparent text-[var(--board-muted)] hover:text-[var(--board-ink)]"}`}><Wallet className="mr-2 inline h-4 w-4" />Wallets ({wallets.length})</button></div>
            {tab === "briefs" ? <div className="p-5 md:p-7"><div className="mb-5"><p className="board-kicker">Posted by you</p><h2 className="board-subtitle mt-2">Your published briefs</h2></div>{posts.length === 0 ? <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50/60 p-8 text-center"><ClipboardList className="mx-auto h-8 w-8 text-violet-400" /><p className="mt-3 font-medium text-[var(--board-ink)]">No briefs found for this account</p><p className="mt-1 text-sm text-[var(--board-muted)]">Published briefs are loaded from your signed-in account and appear here automatically.</p></div> : <div className="space-y-3">{posts.map((post) => <Link key={post.id} to={`/problem/${post.id}`} className="group flex flex-col gap-4 rounded-xl border border-violet-100 bg-gradient-to-r from-white to-violet-50/70 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="board-pill text-[0.62rem]">{post.type === "job" ? "Paid task" : "Brief"}</span><span className="text-xs text-[var(--board-muted)]">{post.category}</span></div><p className="mt-2 truncate font-semibold text-[var(--board-ink)]">{post.title}</p><p className="mt-1 text-xs text-[var(--board-muted)]">Posted {formatTimeAgo(post.createdAt)} · {post.proposals} proposal{post.proposals === 1 ? "" : "s"}</p></div><div className="flex shrink-0 items-center gap-3"><span className="rounded-md bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700">{deadlineLabel(post.deadline, now)}</span><ArrowRight className="h-4 w-4 text-[var(--board-accent)] transition group-hover:translate-x-1" /></div></Link>)}</div>}</div> : <div className="p-5 md:p-7"><div className="mb-5"><p className="board-kicker">Payout settings</p><h2 className="board-subtitle mt-2">Wallets you control</h2><p className="mt-2 text-sm text-[var(--board-muted)]">Add multiple wallets, choose the wallet that receives payouts, or remove one you no longer use.</p></div><div className="grid gap-3 rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50 to-cyan-50 p-4 md:grid-cols-[150px_minmax(0,1fr)_auto]"><Select value={walletChain} onValueChange={(value) => setWalletChain(value as WalletChainDto)}><SelectTrigger className="board-field bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="solana">Solana</SelectItem><SelectItem value="ethereum">Ethereum</SelectItem><SelectItem value="polygon">Polygon</SelectItem><SelectItem value="arbitrum">Arbitrum</SelectItem></SelectContent></Select><Input className="board-field bg-white" placeholder="Wallet address" value={walletAddress} onChange={(event) => setWalletAddress(event.target.value)} /><Button disabled={walletBusy || !walletAddress.trim()} onClick={() => void saveWallet()} className="border-0 bg-[var(--board-accent)] text-white hover:-translate-y-0.5">{walletBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-2 h-4 w-4" />Add wallet</>}</Button></div><div className="mt-5 flex items-center justify-between"><p className="text-sm text-[var(--board-muted)]">{wallets.length} linked wallet{wallets.length === 1 ? "" : "s"}</p><Button variant="ghost" onClick={() => setShowAddresses((visible) => !visible)} className="text-[var(--board-muted)] hover:bg-violet-50">{showAddresses ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}{showAddresses ? "Hide addresses" : "Reveal addresses"}</Button></div>{walletsLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[var(--board-accent)]" /></div> : <div className="mt-3 space-y-3">{wallets.map((wallet) => <div key={wallet.id} className={`flex flex-col gap-3 rounded-xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:flex-row sm:items-center sm:justify-between ${walletTone(wallet.chain)}`}><div><div className="flex items-center gap-2"><span className="rounded-md border border-current/30 bg-white/50 px-2 py-1 text-[0.62rem] font-bold uppercase tracking-[0.12em]">{wallet.chain}</span>{wallet.is_primary ? <span className="text-xs font-semibold text-amber-700">PRIMARY PAYOUT</span> : null}</div><p className="mt-2 break-all font-mono text-sm text-[var(--board-ink)]">{showAddresses ? wallet.address : shortenAddress(wallet.address)}</p></div><div className="flex gap-2">{!wallet.is_primary ? <Button size="sm" variant="outline" onClick={() => void makePrimary(wallet)} className="border-current/40 bg-white/50 text-current hover:bg-white">Use for payouts</Button> : null}<Button size="sm" variant="outline" onClick={() => void removeWallet(wallet.id)} className="border-rose-300 bg-white/50 text-rose-600 hover:bg-rose-100 hover:text-rose-700"><Trash2 className="mr-1 h-4 w-4" />Remove</Button></div></div>)}</div>}</div>}
          </section>
        </div>
      </main>
    </div>
  );
}
