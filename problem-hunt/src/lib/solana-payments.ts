import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
} from "@solana/web3.js";

type SolanaProvider = {
  isPhantom?: boolean;
  isSolflare?: boolean;
  publicKey?: { toString(): string };
  connect: (options?: Record<string, unknown>) => Promise<{ publicKey: { toString(): string } }>;
  signAndSendTransaction?: (transaction: Transaction) => Promise<{ signature: string }>;
  signTransaction?: (transaction: Transaction) => Promise<Transaction>;
};

declare global {
  interface Window {
    solana?: SolanaProvider & { providers?: SolanaProvider[] };
    phantom?: { solana?: SolanaProvider };
    solflare?: SolanaProvider;
  }
}

export function getSolanaRpcUrl(): string {
  const explicitUrl =
    import.meta.env.VITE_ALCHEMY_SOLANA_RPC_URL ||
    import.meta.env.VITE_SOL_RPC_URL ||
    import.meta.env.VITE_SOLANA_RPC_URL;

  if (explicitUrl) {
    return explicitUrl;
  }

  const alchemyApiKey = import.meta.env.VITE_ALCHEMY_API_KEY;
  if (alchemyApiKey) {
    return `https://solana-mainnet.g.alchemy.com/v2/${alchemyApiKey}`;
  }

  return clusterApiUrl("mainnet-beta");
}

export function getAvailableSolanaWallets(): { id: "phantom" | "solflare"; provider: SolanaProvider }[] {
  const wallets: { id: "phantom" | "solflare"; provider: SolanaProvider }[] = [];
  const phantomProvider =
    window.phantom?.solana ||
    window.solana?.providers?.find((provider) => provider.isPhantom) ||
    (window.solana?.isPhantom ? window.solana : undefined);
  const solflareProvider =
    window.solflare ||
    window.solana?.providers?.find((provider) => provider.isSolflare) ||
    (window.solana?.isSolflare ? window.solana : undefined);

  if (phantomProvider) {
    wallets.push({ id: "phantom", provider: phantomProvider });
  }
  if (solflareProvider) {
    wallets.push({ id: "solflare", provider: solflareProvider });
  }

  return wallets;
}

export async function connectSolanaWallet(preferred?: "phantom" | "solflare"): Promise<{
  address: string;
  provider: SolanaProvider;
  wallet: "phantom" | "solflare";
}> {
  const wallets = getAvailableSolanaWallets();
  const selectedWallet =
    wallets.find((wallet) => wallet.id === preferred) ||
    wallets[0];

  if (!selectedWallet) {
    throw new Error("No supported Solana wallet found. Install Phantom or Solflare.");
  }

  const result = await selectedWallet.provider.connect();
  const address =
    result?.publicKey?.toString() ||
    selectedWallet.provider.publicKey?.toString();

  if (!address) {
    throw new Error("Wallet connected but did not return an address.");
  }

  return {
    address,
    provider: selectedWallet.provider,
    wallet: selectedWallet.id,
  };
}

export async function sendSolTransfer(args: {
  provider?: SolanaProvider;
  toAddress: string;
  amountSol: number;
}): Promise<{ signature: string; fromAddress: string }> {
  const connection = new Connection(getSolanaRpcUrl(), "confirmed");
  const walletConnection = args.provider
    ? {
        provider: args.provider,
        address: args.provider.publicKey?.toString(),
      }
    : await connectSolanaWallet();

  const provider = "provider" in walletConnection ? walletConnection.provider : args.provider!;
  const fromAddress =
    ("address" in walletConnection ? walletConnection.address : provider.publicKey?.toString()) ||
    provider.publicKey?.toString();

  if (!fromAddress) {
    throw new Error("No connected wallet address found.");
  }

  const transaction = new Transaction();
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: new PublicKey(fromAddress),
      toPubkey: new PublicKey(args.toAddress),
      lamports: Math.round(args.amountSol * LAMPORTS_PER_SOL),
    })
  );

  const latestBlockhash = await connection.getLatestBlockhash("finalized");
  transaction.feePayer = new PublicKey(fromAddress);
  transaction.recentBlockhash = latestBlockhash.blockhash;

  if (provider.signAndSendTransaction) {
    const { signature } = await provider.signAndSendTransaction(transaction);
    await connection.confirmTransaction(
      {
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      "confirmed"
    );

    return { signature, fromAddress };
  }

  if (!provider.signTransaction) {
    throw new Error("Connected wallet does not support Solana transaction signing.");
  }

  const signedTransaction = await provider.signTransaction(transaction);
  const signature = await connection.sendRawTransaction(signedTransaction.serialize());
  await connection.confirmTransaction(
    {
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    },
    "confirmed"
  );

  return { signature, fromAddress };
}
