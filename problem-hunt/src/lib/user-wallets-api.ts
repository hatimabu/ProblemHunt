import {
  addWallet,
  deleteWallet,
  listWallets,
  setPrimaryWallet,
  upsertPrimaryWallet,
  type WalletChain,
  type WalletRow,
} from "./supabase-marketplace";

export type WalletChainDto = WalletChain;
export type UserWalletApiRow = WalletRow;

export async function listUserWalletsApi(): Promise<UserWalletApiRow[]> {
  return listWallets();
}

export async function upsertPrimaryWalletApi(chain: WalletChainDto, address: string): Promise<UserWalletApiRow> {
  return upsertPrimaryWallet(chain, address);
}

export async function addUserWalletApi(chain: WalletChainDto, address: string): Promise<UserWalletApiRow> {
  return addWallet(chain, address);
}

export async function setPrimaryUserWalletApi(walletId: string): Promise<UserWalletApiRow> {
  return setPrimaryWallet(walletId);
}

export async function deleteUserWalletApi(walletId: string): Promise<void> {
  await deleteWallet(walletId);
}
