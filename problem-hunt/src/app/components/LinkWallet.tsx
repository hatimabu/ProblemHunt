import { useState } from 'react';
import { Plus, Loader2, ExternalLink, Trash2, Star } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { ethers } from 'ethers';
import { useEffect } from 'react';

type ChainType = 'ethereum' | 'polygon' | 'arbitrum' | 'solana';

interface WalletData {
  id: string;
  chain: string;
  address: string;
  is_primary: boolean;
  created_at: string;
}

interface LinkWalletProps {
  onWalletLinked?: () => void;
  compact?: boolean;
}

export function LinkWallet({ onWalletLinked, compact = false }: LinkWalletProps) {
  const { user } = useAuth();
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [linkingChain, setLinkingChain] = useState<ChainType | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEthereumAvailable, setIsEthereumAvailable] = useState(false);
  const [isSolanaAvailable, setIsSolanaAvailable] = useState(false);

  useEffect(() => {
    if (user) {
      fetchWallets();
    }
    setIsEthereumAvailable(typeof window !== 'undefined' && typeof (window as any).ethereum !== 'undefined');
    setIsSolanaAvailable(typeof window !== 'undefined' && typeof (window as any).solana !== 'undefined');
  }, [user]);

  const fetchWallets = async () => {
    if (!user) return;
    try {
      const { data, error: fetchError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setWallets(data || []);
    } catch (err: any) {
      console.error('Error fetching wallets:', err);
    }
  };

  const linkEthereumWallet = async (chain: ChainType) => {
    if (!user) {
      setError('Please sign in first');
      return;
    }

    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      setError('Please install MetaMask or another Ethereum wallet');
      return;
    }

    try {
      setLinkingChain(chain);
      setError('');
      setSuccess('');

      const accounts = await ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const walletAddress = accounts[0].toLowerCase();
      const statement = `Link wallet to ProblemHunt profile\n\nWallet: ${walletAddress}\nChain: ${chain}\nTimestamp: ${new Date().toISOString()}`;

      const signature = await ethereum.request({
        method: 'personal_sign',
        params: [statement, walletAddress],
      }) as string;

      const recoveredAddress = ethers.verifyMessage(statement, signature);
      if (recoveredAddress.toLowerCase() !== walletAddress) {
        throw new Error('Signature verification failed');
      }

      await saveWalletToDatabase(chain, walletAddress);
      setSuccess(`${chain.toUpperCase()} wallet linked successfully!`);
      setLinkingChain(null);
      fetchWallets();
      onWalletLinked?.();
    } catch (err: any) {
      console.error('Error linking wallet:', err);
      setError(err.message || 'Failed to link wallet');
      setLinkingChain(null);
    }
  };

  const linkSolanaWallet = async () => {
    if (!user) {
      setError('Please sign in first');
      return;
    }

    const solana = (window as any).solana;
    if (!solana) {
      setError('Please install Phantom or another Solana wallet');
      return;
    }

    try {
      setLinkingChain('solana');
      setError('');
      setSuccess('');

      const resp = await solana.connect();
      const walletAddress = resp.publicKey.toString();

      const statement = `Link wallet to ProblemHunt profile\n\nWallet: ${walletAddress}\nChain: solana\nTimestamp: ${new Date().toISOString()}`;
      const encodedMessage = new TextEncoder().encode(statement);

      const signedMessage = await solana.signMessage(encodedMessage, 'utf8');
      const signature = Buffer.from(signedMessage.signature).toString('base64');

      await saveWalletToDatabase('solana', walletAddress);
      setSuccess('Solana wallet linked successfully!');
      setLinkingChain(null);
      fetchWallets();
      onWalletLinked?.();
    } catch (err: any) {
      console.error('Error linking Solana wallet:', err);
      setError(err.message || 'Failed to link Solana wallet');
      setLinkingChain(null);
    }
  };

  const saveWalletToDatabase = async (chain: ChainType, address: string) => {
    if (!user) throw new Error('User not authenticated');

    const { error: insertError } = await supabase.from('wallets').insert({
      user_id: user.id,
      chain,
      address,
      is_primary: wallets.length === 0, // First wallet is primary
    });

    if (insertError) throw insertError;
  };

  const setAsPrimary = async (walletId: string, chain: string) => {
    try {
      // Unset all primary wallets for this chain
      await supabase
        .from('wallets')
        .update({ is_primary: false })
        .eq('user_id', user?.id)
        .eq('chain', chain);

      // Set this one as primary
      await supabase
        .from('wallets')
        .update({ is_primary: true })
        .eq('id', walletId);

      setSuccess('Primary wallet updated!');
      fetchWallets();
    } catch (err: any) {
      setError(err.message || 'Failed to update primary wallet');
    }
  };

  const deleteWallet = async (walletId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('wallets')
        .delete()
        .eq('id', walletId);

      if (deleteError) throw deleteError;

      setSuccess('Wallet removed!');
      fetchWallets();
    } catch (err: any) {
      setError(err.message || 'Failed to delete wallet');
    }
  };

  const getExplorerUrl = (chain: string, address: string): string => {
    const explorers: Record<string, string> = {
      ethereum: `https://etherscan.io/address/${address}`,
      polygon: `https://polygonscan.com/address/${address}`,
      arbitrum: `https://arbiscan.io/address/${address}`,
      solana: `https://explorer.solana.com/address/${address}`,
    };
    return explorers[chain] || '#';
  };

  if (compact) {
    return (
      <div className="space-y-3">
        {error && (
          <Alert className="bg-red-500/10 border-red-500/30">
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="bg-green-500/10 border-green-500/30">
            <AlertDescription className="text-green-400">{success}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Button
            onClick={() => linkEthereumWallet('ethereum')}
            disabled={!isEthereumAvailable || linkingChain !== null}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {linkingChain === 'ethereum' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            {linkingChain === 'ethereum' ? 'Linking...' : 'Link Ethereum'}
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => linkEthereumWallet('polygon')}
              disabled={!isEthereumAvailable || linkingChain !== null}
              variant="outline"
              className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
            >
              {linkingChain === 'polygon' ? 'Linking...' : 'Link Polygon'}
            </Button>
            <Button
              onClick={() => linkEthereumWallet('arbitrum')}
              disabled={!isEthereumAvailable || linkingChain !== null}
              variant="outline"
              className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
            >
              {linkingChain === 'arbitrum' ? 'Linking...' : 'Link Arbitrum'}
            </Button>
          </div>

          <Button
            onClick={linkSolanaWallet}
            disabled={!isSolanaAvailable || linkingChain !== null}
            className="w-full bg-cyan-600 hover:bg-cyan-700"
          >
            {linkingChain === 'solana' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            {linkingChain === 'solana' ? 'Linking...' : 'Link Solana'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Plus className="w-5 h-5 text-cyan-400" />
          Add Crypto Wallet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert className="bg-red-500/10 border-red-500/30">
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="bg-green-500/10 border-green-500/30">
            <AlertDescription className="text-green-400">{success}</AlertDescription>
          </Alert>
        )}

        {/* Link Wallet Buttons */}
        <div className="space-y-3 mb-6">
          <Button
            onClick={() => linkEthereumWallet('ethereum')}
            disabled={!isEthereumAvailable || linkingChain !== null}
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white border-0 h-10"
          >
            {linkingChain === 'ethereum' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Linking...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Link Ethereum Wallet
              </>
            )}
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => linkEthereumWallet('polygon')}
              disabled={!isEthereumAvailable || linkingChain !== null}
              variant="outline"
              className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
            >
              {linkingChain === 'polygon' ? 'Linking...' : 'Link Polygon'}
            </Button>
            <Button
              onClick={() => linkEthereumWallet('arbitrum')}
              disabled={!isEthereumAvailable || linkingChain !== null}
              variant="outline"
              className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
            >
              {linkingChain === 'arbitrum' ? 'Linking...' : 'Link Arbitrum'}
            </Button>
          </div>

          <Button
            onClick={linkSolanaWallet}
            disabled={!isSolanaAvailable || linkingChain !== null}
            className="w-full bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white border-0 h-10"
          >
            {linkingChain === 'solana' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Linking...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Link Solana Wallet
              </>
            )}
          </Button>
        </div>

        {/* Linked Wallets List */}
        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-white font-medium mb-3 flex items-center gap-2">
            {wallets.length > 0 ? `${wallets.length} Connected Wallet${wallets.length !== 1 ? 's' : ''}` : 'No Wallets Connected'}
          </h3>

          {wallets.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              Connect your first wallet to get started
            </p>
          ) : (
            <div className="space-y-3">
              {wallets.map((wallet) => (
                <div
                  key={wallet.id}
                  className="bg-gray-800/30 border border-gray-700 rounded-lg p-3 hover:border-cyan-500/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                          {wallet.chain.charAt(0).toUpperCase() + wallet.chain.slice(1)}
                        </Badge>
                        {wallet.is_primary && (
                          <Badge className="bg-green-500/20 text-green-300 border-green-500/30 flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            Primary
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-xs text-gray-300 font-mono bg-gray-900/50 px-2 py-1 rounded truncate">
                          {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                        </code>
                        <a
                          href={getExplorerUrl(wallet.chain, wallet.address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 transition-colors"
                          title="View on blockchain explorer"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <p className="text-xs text-gray-500">
                        Added {new Date(wallet.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!wallet.is_primary && (
                        <Button
                          onClick={() => setAsPrimary(wallet.id, wallet.chain)}
                          size="sm"
                          variant="ghost"
                          className="text-gray-400 hover:text-yellow-400 h-8 w-8 p-0"
                          title="Set as primary"
                        >
                          <Star className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        onClick={() => deleteWallet(wallet.id)}
                        size="sm"
                        variant="ghost"
                        className="text-gray-400 hover:text-red-400 h-8 w-8 p-0"
                        title="Remove wallet"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
