import { authenticatedFetch } from './auth-helper';

export async function getUserSolanaWallet(userId: string): Promise<string | null> {
  try {
    const res = await fetch('/api/user/wallets', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('problemhunt-token') || ''}`,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const wallets: any[] = data.wallets || [];
    const solWallet = wallets.find((w) => w.chain === 'solana' && w.is_primary);
    return solWallet?.address || wallets.find((w) => w.chain === 'solana')?.address || null;
  } catch {
    return null;
  }
}

export async function syncUserSolanaWallet(userId: string, address: string): Promise<void> {
  const res = await authenticatedFetch('/api/user/wallets', {
    method: 'POST',
    body: JSON.stringify({ chain: 'solana', address: address.trim() }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to save wallet');
  }
}

export async function clearUserSolanaWallet(userId: string): Promise<void> {
  try {
    const res = await fetch('/api/user/wallets', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('problemhunt-token') || ''}`,
      },
    });
    if (!res.ok) return;
    const data = await res.json();
    const wallets: any[] = data.wallets || [];
    const solWallet = wallets.find((w) => w.chain === 'solana' && w.is_primary);
    if (solWallet) {
      await authenticatedFetch(`/api/user/wallets/${solWallet.id}`, { method: 'DELETE' });
    }
  } catch {
    // best-effort
  }
}
