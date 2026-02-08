import { useState, useEffect } from "react";
import { Wallet, Loader2, AlertCircle, Check } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { supabase } from "../../../lib/supabaseClient";
import { setSessionWithTimeout } from "../utils/sessionUtils";
import { ethers } from "ethers";

/**
 * SignInWithWallet Component
 * 
 * Enables users to sign in using Ethereum or Solana wallets.
 * After successful authentication, the wallet address is saved to the wallets table.
 * 
 * Supported wallets:
 * - Ethereum: MetaMask, Rainbow, Coinbase Wallet (via window.ethereum)
 * - Solana: Phantom, Solflare (via window.solana)
 */

type ChainType = 'ethereum' | 'solana' | 'polygon' | 'arbitrum';

interface WalletProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on?: (event: string, handler: (...args: any[]) => void) => void;
  removeListener?: (event: string, handler: (...args: any[]) => void) => void;
}

interface SolanaProvider {
  isPhantom?: boolean;
  publicKey?: { toString: () => string };
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  signMessage: (message: Uint8Array, encoding: string) => Promise<{ signature: Uint8Array }>;
  disconnect: () => Promise<void>;
}

declare global {
  interface Window {
    ethereum?: WalletProvider;
    solana?: SolanaProvider;
  }
}

interface SignInWithWalletProps {
  onSuccess?: (userId: string, walletAddress: string, chain: ChainType) => void;
  onError?: (error: string) => void;
  redirectTo?: string;
}

export function SignInWithWallet({ 
  onSuccess, 
  onError,
  redirectTo = '/dashboard'
}: SignInWithWalletProps) {
  const [isEthereumAvailable, setIsEthereumAvailable] = useState(false);
  const [isSolanaAvailable, setIsSolanaAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState<ChainType | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    // Check for wallet availability
    setIsEthereumAvailable(typeof window.ethereum !== 'undefined');
    setIsSolanaAvailable(typeof window.solana !== 'undefined');
  }, []);

  /**
   * Sign in with Ethereum wallet (MetaMask, etc.)
   */
  const signInWithEthereum = async (chain: ChainType = 'ethereum') => {
    if (!window.ethereum) {
      const errorMsg = "Please install MetaMask or another Ethereum wallet";
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    try {
      setIsLoading(chain);
      setError("");
      setSuccess("");

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const walletAddress = accounts[0].toLowerCase();

      // Create a message to sign (proof of wallet ownership)
      const statement = `Sign in to ProblemHunt\n\nWallet: ${walletAddress}\nTimestamp: ${new Date().toISOString()}\nNonce: ${Math.random().toString(36).substring(7)}`;
      
      // Request signature from user
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [statement, walletAddress],
      }) as string;

      // Verify signature
      const recoveredAddress = ethers.verifyMessage(statement, signature);
      
      if (recoveredAddress.toLowerCase() !== walletAddress) {
        throw new Error("Signature verification failed");
      }

      // Sign in with Supabase using wallet
      // Note: Supabase doesn't have native Web3 auth yet, so we use a custom flow
      // Option 1: Create/get user by wallet address using a custom Edge Function
      // Option 2: Use magic link with wallet address as identifier
      
      // For this implementation, we'll use a server endpoint to create/authenticate the user
      const { data: authData, error: authError } = await supabase.functions.invoke('auth-wallet', {
        body: {
          chain,
          address: walletAddress,
          signature,
          statement
        }
      });

      if (authError) throw authError;

      // Set the session with timeout protection
      const { session, error: sessionError } = await setSessionWithTimeout(
        authData.access_token,
        authData.refresh_token
      );

      if (sessionError) throw sessionError;

      if (!session?.user) {
        throw new Error("Failed to establish session");
      }

      // Save wallet to wallets table
      await saveWalletToDatabase(session.user.id, chain, walletAddress);

      setSuccess(`Successfully signed in with ${chain} wallet`);
      onSuccess?.(session.user.id, walletAddress, chain);

      // Redirect if specified
      if (redirectTo) {
        setTimeout(() => {
          window.location.href = redirectTo;
        }, 1000);
      }

    } catch (err: any) {
      console.error('Ethereum sign-in error:', err);
      const errorMsg = err.message || 'Failed to sign in with Ethereum wallet';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsLoading(null);
    }
  };

  /**
   * Sign in with Solana wallet (Phantom, etc.)
   */
  const signInWithSolana = async () => {
    if (!window.solana) {
      const errorMsg = "Please install Phantom or another Solana wallet";
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    try {
      setIsLoading('solana');
      setError("");
      setSuccess("");

      // Connect to wallet
      const resp = await window.solana.connect();
      const walletAddress = resp.publicKey.toString();

      // Create message to sign
      const statement = `Sign in to ProblemHunt\n\nWallet: ${walletAddress}\nTimestamp: ${new Date().toISOString()}\nNonce: ${Math.random().toString(36).substring(7)}`;
      
      const encodedMessage = new TextEncoder().encode(statement);
      
      // Request signature
      const signedMessage = await window.solana.signMessage(encodedMessage, 'utf8');
      const signature = Buffer.from(signedMessage.signature).toString('base64');

      // Authenticate with backend
      const { data: authData, error: authError } = await supabase.functions.invoke('auth-wallet', {
        body: {
          chain: 'solana',
          address: walletAddress,
          signature,
          statement
        }
      });

      if (authError) throw authError;

      // Set the session with timeout protection
      const { session, error: sessionError } = await setSessionWithTimeout(
        authData.access_token,
        authData.refresh_token
      );

      if (sessionError) throw sessionError;

      if (!session?.user) {
        throw new Error("Failed to establish session");
      }

      // Save wallet to database
      await saveWalletToDatabase(session.user.id, 'solana', walletAddress);

      setSuccess("Successfully signed in with Solana wallet");
      onSuccess?.(session.user.id, walletAddress, 'solana');

      // Redirect if specified
      if (redirectTo) {
        setTimeout(() => {
          window.location.href = redirectTo;
        }, 1000);
      }

    } catch (err: any) {
      console.error('Solana sign-in error:', err);
      const errorMsg = err.message || 'Failed to sign in with Solana wallet';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsLoading(null);
    }
  };

  /**
   * Save wallet address to database (if not already exists)
   */
  const saveWalletToDatabase = async (
    userId: string,
    chain: ChainType,
    address: string
  ) => {
    try {
      // Check if wallet already exists
      const { data: existing } = await supabase
        .from('wallets')
        .select('id')
        .eq('chain', chain)
        .eq('address', address)
        .single();

      if (existing) {
        console.log('Wallet already exists in database');
        return;
      }

      // Check if user has any wallets
      const { data: userWallets } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', userId);

      const isPrimary = !userWallets || userWallets.length === 0;

      // Insert new wallet
      const { error: insertError } = await supabase
        .from('wallets')
        .insert({
          user_id: userId,
          chain,
          address,
          is_primary: isPrimary
        });

      if (insertError) {
        console.error('Error saving wallet:', insertError);
        // Don't throw - wallet save is not critical for sign-in
      }
    } catch (err) {
      console.error('Error in saveWalletToDatabase:', err);
    }
  };

  return (
    <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Wallet className="w-5 h-5 text-cyan-400" />
          Sign In with Wallet
        </CardTitle>
        <CardDescription className="text-gray-400">
          Connect your Web3 wallet to sign in securely
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert className="bg-red-500/10 border-red-500/30">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-500/10 border-green-500/30">
            <Check className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-400">{success}</AlertDescription>
          </Alert>
        )}

        {/* Ethereum Wallets */}
        <div className="space-y-2">
          <Button
            onClick={() => signInWithEthereum('ethereum')}
            disabled={!isEthereumAvailable || isLoading !== null}
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white border-0"
          >
            {isLoading === 'ethereum' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" 
                  alt="Ethereum" 
                  className="w-5 h-5 mr-2"
                />
                Sign in with Ethereum
              </>
            )}
          </Button>

          {!isEthereumAvailable && (
            <p className="text-xs text-gray-500 text-center">
              <a 
                href="https://metamask.io/download/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline"
              >
                Install MetaMask
              </a>
            </p>
          )}
        </div>

        {/* Polygon & Arbitrum (same provider as Ethereum) */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => signInWithEthereum('polygon')}
            disabled={!isEthereumAvailable || isLoading !== null}
            variant="outline"
            className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
          >
            {isLoading === 'polygon' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Polygon'
            )}
          </Button>

          <Button
            onClick={() => signInWithEthereum('arbitrum')}
            disabled={!isEthereumAvailable || isLoading !== null}
            variant="outline"
            className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
          >
            {isLoading === 'arbitrum' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Arbitrum'
            )}
          </Button>
        </div>

        {/* Solana Wallet */}
        <div className="space-y-2">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-900 px-2 text-gray-500">Or</span>
            </div>
          </div>

          <Button
            onClick={signInWithSolana}
            disabled={!isSolanaAvailable || isLoading !== null}
            className="w-full bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white border-0"
          >
            {isLoading === 'solana' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <img 
                  src="https://cryptologos.cc/logos/solana-sol-logo.svg" 
                  alt="Solana" 
                  className="w-5 h-5 mr-2"
                />
                Sign in with Solana
              </>
            )}
          </Button>

          {!isSolanaAvailable && (
            <p className="text-xs text-gray-500 text-center">
              <a 
                href="https://phantom.app/download" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline"
              >
                Install Phantom Wallet
              </a>
            </p>
          )}
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          By signing in, you agree to our Terms of Service and Privacy Policy.
          Your wallet signature proves ownership without exposing your private keys.
        </p>
      </CardContent>
    </Card>
  );
}
