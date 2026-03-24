import { supabase } from "../../lib/supabaseClient";

export async function getUserSolanaWallet(userId: string): Promise<string | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("wallet_address")
    .eq("user_id", userId)
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
  await supabase
    .from("profiles")
    .update({ wallet_address: address })
    .eq("user_id", userId);

  const { data: existing } = await supabase
    .from("wallets")
    .select("id")
    .eq("user_id", userId)
    .eq("chain", "solana")
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("wallets")
      .update({
        address,
        is_primary: true,
      })
      .eq("id", existing.id);
    return;
  }

  await supabase.from("wallets").insert({
    user_id: userId,
    chain: "solana",
    address,
    is_primary: true,
  });
}

export async function clearUserSolanaWallet(userId: string): Promise<void> {
  await supabase
    .from("profiles")
    .update({ wallet_address: null })
    .eq("user_id", userId);
}
