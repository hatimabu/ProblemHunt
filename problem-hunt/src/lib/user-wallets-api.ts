import { authenticatedFetch, handleResponse } from "./auth-helper";

export type WalletChainDto = "ethereum" | "polygon" | "arbitrum" | "solana";

export interface UserWalletApiRow {
  id: string;
  chain: WalletChainDto;
  address: string;
  is_primary: boolean;
  created_at: string;
}

/** GET /api/user/wallets — list wallets for the authenticated user (Python Functions). */
export async function listUserWalletsApi(): Promise<UserWalletApiRow[]> {
  const res = await authenticatedFetch("/api/user/wallets", { method: "GET" });
  const body = await handleResponse(res);
  const list = (body as { wallets?: UserWalletApiRow[] }).wallets;
  return Array.isArray(list) ? list : [];
}

/**
 * POST /api/user/wallets — set the primary payout address for a chain (replaces other rows for that chain server-side).
 */
export async function upsertPrimaryWalletApi(chain: WalletChainDto, address: string): Promise<UserWalletApiRow> {
  const res = await authenticatedFetch("/api/user/wallets", {
    method: "POST",
    body: { chain, address },
  });
  return (await handleResponse(res)) as UserWalletApiRow;
}

/** DELETE /api/user/wallets/{id} */
export async function deleteUserWalletApi(walletId: string): Promise<void> {
  const res = await authenticatedFetch(`/api/user/wallets/${walletId}`, { method: "DELETE" });
  await handleResponse(res);
}
