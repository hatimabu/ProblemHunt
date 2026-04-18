import { supabase } from "../../lib/supabaseClient";

export async function getUserSolanaWallet(userId: string): Promise<string | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("wallet_address")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.wallet_address) {
    return profile.wallet_address;
  }

  const { data: wallet } = await supabase
    .from("wallets")
    .select("address")
    .eq("user_id", userId)
    .eq("chain", "solana")
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return wallet?.address || null;
}

export async function syncUserSolanaWallet(userId: string, address: string): Promise<void> {
  const trimmed = address.trim();

  // For local UX and payouts:
  // - ensure only ONE solana wallet row is_primary=true
  // - ensure profiles.wallet_address matches that primary (python API checks profile first)
  await supabase.from("profiles").update({ wallet_address: trimmed }).eq("id", userId);

  // Clear any existing primaries first (avoids the unique index conflict)
  await supabase
    .from("wallets")
    .update({ is_primary: false })
    .eq("user_id", userId)
    .eq("chain", "solana");

  // If the exact address exists already for this user, just promote it.
  const { data: updated, error: updateErr } = await supabase
    .from("wallets")
    .update({ address: trimmed, is_primary: true })
    .eq("user_id", userId)
    .eq("chain", "solana")
    .eq("address", trimmed)
    .select("id");

  if (updateErr) throw updateErr;
  const alreadyHadRow = Array.isArray(updated) ? updated.length > 0 : !!updated;
  if (alreadyHadRow) return;

  // Otherwise insert the wallet and mark it as primary.
  await supabase.from("wallets").insert({
    user_id: userId,
    chain: "solana",
    address: trimmed,
    is_primary: true,
  });
}

export async function clearUserSolanaWallet(userId: string): Promise<void> {
  // Clear both profile + wallet primaries to prevent the UI/navbar from getting stuck
  // with an out-of-date primary reference.
  await supabase.from("profiles").update({ wallet_address: null }).eq("id", userId);
  await supabase.from("wallets").update({ is_primary: false }).eq("user_id", userId).eq("chain", "solana");
}
