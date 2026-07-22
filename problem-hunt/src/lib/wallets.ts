import { deleteWallet, getPrimaryWallet, listWallets, upsertPrimaryWallet } from "./supabase-marketplace";

export async function getUserSolanaWallet(_userId: string): Promise<string | null> {
  return getPrimaryWallet("solana");
}

export async function syncUserSolanaWallet(_userId: string, address: string): Promise<void> {
  await upsertPrimaryWallet("solana", address);
}

export async function clearUserSolanaWallet(_userId: string): Promise<void> {
  const wallets = await listWallets();
  const wallet = wallets.find((item) => item.chain === "solana" && item.is_primary) || wallets.find((item) => item.chain === "solana");
  if (wallet) await deleteWallet(wallet.id);
}
