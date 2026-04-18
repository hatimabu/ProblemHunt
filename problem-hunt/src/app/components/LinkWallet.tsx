import { useState, useEffect } from "react";
import {
  Wallet,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  ChevronDown,
  ClipboardPaste,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";
import { clearUserSolanaWallet, syncUserSolanaWallet } from "../../lib/wallets";
import {
  deleteUserWalletApi,
  listUserWalletsApi,
  upsertPrimaryWalletApi,
  type WalletChainDto,
} from "../../lib/user-wallets-api";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChainType = WalletChainDto;

interface WalletRow {
  id: string;
  user_id: string;
  chain: ChainType;
  address: string;
  is_primary: boolean;
  created_at: string;
}

// ─── Chain metadata ───────────────────────────────────────────────────────────

const CHAINS: {
  id: ChainType;
  label: string;
  placeholder: string;
  hint: string;
  color: string;
  icon: string;
}[] = [
  {
    id: "ethereum",
    label: "Ethereum",
    placeholder: "0x...",
    hint: "EVM address (42 chars, starts with 0x)",
    color: "from-indigo-500 to-blue-600",
    icon: "Ξ",
  },
  {
    id: "polygon",
    label: "Polygon",
    placeholder: "0x...",
    hint: "EVM address (42 chars, starts with 0x)",
    color: "from-purple-500 to-indigo-600",
    icon: "⬡",
  },
  {
    id: "arbitrum",
    label: "Arbitrum",
    placeholder: "0x...",
    hint: "EVM address (42 chars, starts with 0x)",
    color: "from-blue-400 to-cyan-600",
    icon: "◈",
  },
  {
    id: "solana",
    label: "Solana",
    placeholder: "Base58 address...",
    hint: "Solana address (32–44 chars)",
    color: "from-green-400 to-teal-500",
    icon: "◎",
  },
];

// ─── Validation ───────────────────────────────────────────────────────────────

function validateAddress(chain: ChainType, address: string): string | null {
  const trimmed = address.trim();
  if (!trimmed) return "Address is required.";

  if (chain === "ethereum" || chain === "polygon" || chain === "arbitrum") {
    if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed))
      return "Must be a valid EVM address (0x followed by 40 hex chars).";
  }

  if (chain === "solana") {
    if (trimmed.length < 32 || trimmed.length > 44)
      return "Must be a valid Solana address (32–44 characters).";
  }

  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface LinkWalletProps {
  onWalletsChange?: (count: number) => void;
}

export function LinkWallet({ onWalletsChange }: LinkWalletProps) {
  const { user } = useAuth();

  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Which chain card is expanded for adding
  const [expandedChain, setExpandedChain] = useState<ChainType | null>(null);

  // Per-chain input + state
  const [inputAddress, setInputAddress] = useState("");
  const [validationError, setValidationError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [primarizingId, setPrimarizingId] = useState<string | null>(null);
  const [flashSuccess, setFlashSuccess] = useState<ChainType | null>(null);
  const [globalError, setGlobalError] = useState("");

  useEffect(() => {
    if (user) fetchWallets();
  }, [user]);

  // Clear input when chain changes
  useEffect(() => {
    setInputAddress("");
    setValidationError("");
    setGlobalError("");
  }, [expandedChain]);

  // ── Data helpers ──────────────────────────────────────────────────────────

  const fetchWallets = async (opts?: { showLoading?: boolean }): Promise<WalletRow[] | void> => {
    if (!user) return;

    const showLoading = opts?.showLoading !== false;
    if (showLoading) setIsLoading(true);
    try {
      try {
        const rows = await listUserWalletsApi();
        const mapped: WalletRow[] = rows.map((w) => ({
          id: w.id,
          user_id: user.id,
          chain: w.chain,
          address: w.address,
          is_primary: w.is_primary,
          created_at: w.created_at,
        }));
        setWallets(mapped);
        onWalletsChange?.(mapped.length);
        return mapped;
      } catch (apiErr) {
        console.warn("[wallets] API list failed, using Supabase", apiErr);
        const { data, error } = await supabase
          .from("wallets")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (error) throw error;
        const mapped = (data ?? []) as WalletRow[];
        setWallets(mapped);
        onWalletsChange?.(mapped.length);
        return mapped;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load wallets.";
      setGlobalError(message);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const walletsForChain = (chain: ChainType) => wallets.filter((w) => w.chain === chain);

  const sortedWalletsForChain = (chain: ChainType) =>
    walletsForChain(chain)
      .slice()
      .sort((a, b) => {
        const primaryDiff = Number(b.is_primary) - Number(a.is_primary);
        if (primaryDiff !== 0) return primaryDiff;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

  const primaryWalletForChain = (chain: ChainType) => sortedWalletsForChain(chain).find((w) => w.is_primary) ?? null;

  // ── Add / Replace ─────────────────────────────────────────────────────────

  const setWalletAsPrimary = async (wallet: WalletRow) => {
    if (!user) return;

    try {
      setPrimarizingId(wallet.id);

      try {
        await upsertPrimaryWalletApi(wallet.chain, wallet.address);
        await fetchWallets({ showLoading: false });
        setFlashSuccess(wallet.chain);
        setTimeout(() => setFlashSuccess(null), 2500);
        return;
      } catch (apiErr) {
        console.warn("[wallets] API set-primary failed, using Supabase", apiErr);
      }

      if (wallet.chain === "solana") {
        await syncUserSolanaWallet(user.id, wallet.address);
      } else {
        await supabase.from("wallets").update({ is_primary: false }).eq("user_id", user.id).eq("chain", wallet.chain);
        await supabase.from("wallets").update({ is_primary: true }).eq("id", wallet.id);
      }
      await fetchWallets({ showLoading: false });

      setFlashSuccess(wallet.chain);
      setTimeout(() => setFlashSuccess(null), 2500);
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : "Failed to set primary wallet.");
    } finally {
      setPrimarizingId(null);
    }
  };

  const handleSave = async (chain: ChainType) => {
    setValidationError("");
    setGlobalError("");

    const error = validateAddress(chain, inputAddress);
    if (error) {
      setValidationError(error);
      return;
    }

    const trimmed = inputAddress.trim();

    try {
      setIsSaving(true);

      try {
        await upsertPrimaryWalletApi(chain, trimmed);
        await fetchWallets({ showLoading: false });
        setExpandedChain(null);
        setInputAddress("");
        setFlashSuccess(chain);
        setTimeout(() => setFlashSuccess(null), 2500);
        return;
      } catch (apiErr: unknown) {
        const status = typeof apiErr === "object" && apiErr !== null && "status" in apiErr ? (apiErr as { status?: number }).status : undefined;
        if (status === 409) {
          setValidationError("This address is already linked to another account.");
          return;
        }
        console.warn("[wallets] API save failed, using Supabase", apiErr);
      }

      if (chain === "solana") {
        await syncUserSolanaWallet(user!.id, trimmed);
      } else {
        const previousPrimary = primaryWalletForChain(chain);

        await supabase
          .from("wallets")
          .update({ is_primary: false })
          .eq("user_id", user!.id)
          .eq("chain", chain);

        try {
          const { error: insertErr } = await supabase.from("wallets").insert({
            user_id: user!.id,
            chain,
            address: trimmed,
            is_primary: true,
          });
          if (insertErr) throw insertErr;
        } catch (err: unknown) {
          const code = typeof err === "object" && err !== null && "code" in err ? (err as { code?: string }).code : undefined;
          if (code === "23505") {
            const { data: existingWallet, error: selErr } = await supabase
              .from("wallets")
              .select("id")
              .eq("user_id", user!.id)
              .eq("chain", chain)
              .eq("address", trimmed)
              .maybeSingle();

            if (selErr) throw selErr;
            if (!existingWallet?.id) {
              setValidationError("This address is already linked to another account.");
              if (previousPrimary?.id) {
                await supabase.from("wallets").update({ is_primary: true }).eq("id", previousPrimary.id);
              }
              return;
            }

            const { error: updErr } = await supabase
              .from("wallets")
              .update({ is_primary: true })
              .eq("id", existingWallet.id);
            if (updErr) throw updErr;
          } else {
            throw err;
          }
        }
      }

      await fetchWallets({ showLoading: false });
      setExpandedChain(null);
      setInputAddress("");

      setFlashSuccess(chain);
      setTimeout(() => setFlashSuccess(null), 2500);
    } catch (err: unknown) {
      const code = typeof err === "object" && err !== null && "code" in err ? (err as { code?: string }).code : undefined;
      if (code === "23505") {
        setValidationError("This address is already linked to another account.");
      } else {
        setGlobalError(err instanceof Error ? err.message : "Failed to save wallet.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async (wallet: WalletRow) => {
    setGlobalError("");
    try {
      setDeletingId(wallet.id);
      const wasPrimary = wallet.is_primary;

      try {
        await deleteUserWalletApi(wallet.id);
      } catch (apiErr) {
        console.warn("[wallets] API delete failed, using Supabase", apiErr);
        const { error } = await supabase.from("wallets").delete().eq("id", wallet.id);
        if (error) throw error;
      }

      const loaded = await fetchWallets({ showLoading: false });
      const fresh: WalletRow[] = Array.isArray(loaded) ? loaded : [];

      if (wasPrimary) {
        const remainingForChain = fresh
          .filter((w) => w.chain === wallet.chain)
          .slice()
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        if (remainingForChain.length > 0) {
          await setWalletAsPrimary(remainingForChain[0]);
        } else {
          if (wallet.chain === "solana") {
            await clearUserSolanaWallet(user!.id);
          } else {
            await supabase
              .from("wallets")
              .update({ is_primary: false })
              .eq("user_id", user!.id)
              .eq("chain", wallet.chain);
          }
        }
      }

      await fetchWallets({ showLoading: false });
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : "Failed to remove wallet.");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 rounded-2xl blur-xl" />
        <div className="relative bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Linked Wallets</h2>
              <p className="text-sm text-gray-400">
                Link one or more wallets per chain, then choose a primary wallet for payouts/tips.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 text-xs text-gray-500 bg-gray-800/40 border border-gray-700/50 rounded-lg px-3 py-2">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-500/70 shrink-0" />
            Addresses are validated against chain format rules before saving.
            Only one PRIMARY wallet per chain is allowed.
          </div>
        </div>
      </div>

      {/* Global error */}
      {globalError && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {globalError}
        </div>
      )}

      {/* Chain cards */}
      <div className="grid gap-4">
        {CHAINS.map((chain) => {
          const chainWallets = sortedWalletsForChain(chain.id);
          const primary = primaryWalletForChain(chain.id);
          const hasWallets = chainWallets.length > 0;
          const isExpanded = expandedChain === chain.id;
          const isFlashing = flashSuccess === chain.id;

          return (
            <div key={chain.id} className="relative">
              <div
                className={`absolute inset-0 rounded-2xl blur-xl transition-opacity duration-500 ${
                  isFlashing
                    ? "opacity-100 bg-green-500/10"
                    : primary
                    ? "opacity-60 bg-gradient-to-r from-cyan-500/5 to-blue-500/5"
                    : "opacity-0"
                }`}
              />
              <div
                className={`relative bg-gray-900/50 backdrop-blur-sm border rounded-2xl overflow-hidden transition-colors duration-300 ${
                  isFlashing
                    ? "border-green-500/40"
                    : isExpanded
                    ? "border-cyan-500/40"
                    : primary
                    ? "border-gray-700/80"
                    : "border-gray-800"
                }`}
              >
                {/* Card header row */}
                <div className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-4">
                    {/* Chain icon */}
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${chain.color} flex items-center justify-center text-white font-bold text-lg shrink-0`}
                    >
                      {chain.icon}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-white font-semibold">
                          {chain.label}
                        </span>
                        {primary && (
                          <Badge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/30 text-[10px] px-1.5 py-0">
                            Primary
                          </Badge>
                        )}
                      </div>

                      {primary ? (
                        <p className="text-xs font-mono text-gray-400 max-w-[260px] sm:max-w-sm truncate">
                          {primary.address}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500">No wallet linked</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setExpandedChain(isExpanded ? null : chain.id);
                      }}
                      className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-all ${
                        isExpanded
                          ? "text-gray-400 border-gray-700 hover:bg-gray-800"
                          : hasWallets
                          ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20"
                          : "text-cyan-400 border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20"
                      }`}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronDown className="w-3.5 h-3.5 rotate-180 transition-transform" />
                          Cancel
                        </>
                      ) : hasWallets ? (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          Add another
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          Add
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Linked wallet list (choose primary / delete) */}
                {!isExpanded && hasWallets && (
                  <div className="px-5 pb-5 pt-0 space-y-3">
                    {chainWallets.map((w) => (
                      <div key={w.id} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {w.is_primary ? (
                              <Badge className="bg-cyan-500/15 text-cyan-400 border-cyan-500/30 text-[10px] px-1.5 py-0">
                                Primary
                              </Badge>
                            ) : null}
                            <p className="text-xs font-mono text-gray-400 max-w-[260px] truncate">{w.address}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!w.is_primary ? (
                            <button
                              onClick={() => setWalletAsPrimary(w)}
                              disabled={isSaving || primarizingId === w.id}
                              className="text-xs px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-all disabled:opacity-40"
                            >
                              {primarizingId === w.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                "Make primary"
                              )}
                            </button>
                          ) : null}

                          <button
                            onClick={() => handleDelete(w)}
                            disabled={deletingId === w.id || isSaving || primarizingId === w.id}
                            className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all disabled:opacity-40"
                            title="Remove wallet"
                          >
                            {deletingId === w.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Expandable form */}
                {isExpanded && (
                  <div className="border-t border-gray-800/80 bg-gray-900/30 px-5 py-4 space-y-4">
                    <div className="flex items-center gap-2 text-xs text-yellow-400/80 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      Saving a new address will set it as your primary {chain.label} wallet.
                    </div>

                    <div>
                      <Label className="text-white text-sm mb-1.5 block">
                        Wallet Address
                      </Label>
                      <Input
                        type="text"
                        value={inputAddress}
                        onChange={(e) => {
                          setInputAddress(e.target.value);
                          setValidationError("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSave(chain.id);
                        }}
                        placeholder={chain.placeholder}
                        className={`bg-gray-800/60 border text-white font-mono text-sm placeholder:text-gray-600 focus:border-cyan-500/60 ${
                          validationError
                            ? "border-red-500/50"
                            : "border-gray-700"
                        }`}
                        autoFocus
                      />
                      {validationError ? (
                        <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {validationError}
                        </p>
                      ) : (
                        <p className="mt-1.5 text-xs text-gray-500">
                          {chain.hint}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          try {
                            const text = await navigator.clipboard.readText();
                            setInputAddress(text.trim());
                            setValidationError("");
                          } catch {
                            setValidationError("Could not read the clipboard. Use Ctrl+V in the field instead.");
                          }
                        }}
                        disabled={isSaving}
                        className="border-gray-700 text-gray-300 hover:bg-gray-800 text-sm"
                      >
                        <ClipboardPaste className="w-4 h-4 mr-2" />
                        Paste
                      </Button>
                      <Button
                        onClick={() => handleSave(chain.id)}
                        disabled={isSaving || !inputAddress.trim()}
                        className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 text-sm"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Save as primary
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setExpandedChain(null)}
                        disabled={isSaving}
                        className="border-gray-700 text-gray-400 hover:bg-gray-800 text-sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Flash success overlay message */}
                {isFlashing && (
                  <div className="border-t border-green-500/20 bg-green-500/10 px-5 py-2.5 flex items-center gap-2 text-sm text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                    Wallet saved successfully!
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
