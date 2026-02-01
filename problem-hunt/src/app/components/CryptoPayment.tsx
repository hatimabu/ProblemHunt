import { useState, useEffect } from "react";
import { DollarSign, Copy, Check, Loader2, AlertCircle, ExternalLink, Wallet } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";

/**
 * CryptoPayment Component
 * 
 * Peer-to-peer tipping system for builders.
 * Allows users to tip other users with crypto payments.
 * Integrates with the orders table and payment verification Edge Function.
 */

interface CryptoPaymentProps {
  recipientUserId: string; // The builder receiving the tip
  recipientName?: string; // Optional display name
  onPaymentComplete?: (orderId: string) => void;
}

interface Order {
  id: string;
  chain: string;
  amount: number;
  token_symbol: string;
  receiving_address: string;
  status: string;
  tx_hash: string | null;
  created_at: string;
  expires_at: string;
}

type ChainType = 'ethereum' | 'solana' | 'polygon' | 'arbitrum';

const SUPPORTED_TOKENS = {
  ethereum: [
    { symbol: 'ETH', name: 'Ethereum', address: null },
    { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
    { symbol: 'USDT', name: 'Tether', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
  ],
  polygon: [
    { symbol: 'MATIC', name: 'Polygon', address: null },
    { symbol: 'USDC', name: 'USD Coin', address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' },
  ],
  arbitrum: [
    { symbol: 'ETH', name: 'Ethereum', address: null },
    { symbol: 'USDC', name: 'USD Coin', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' },
  ],
  solana: [
    { symbol: 'SOL', name: 'Solana', address: null },
    { symbol: 'USDC', name: 'USD Coin', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
  ],
};

export function CryptoPayment({ recipientUserId, recipientName, onPaymentComplete }: CryptoPaymentProps) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isVerifying, setIsVerifying] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [recipientWallet, setRecipientWallet] = useState<string | null>(null);

  // Form state
  const [chain, setChain] = useState<ChainType>('ethereum');
  const [amount, setAmount] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("ETH");
  const [description, setDescription] = useState("");
  const [txHash, setTxHash] = useState("");

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  // Fetch recipient's wallet address for selected chain
  useEffect(() => {
    const fetchRecipientWallet = async () => {
      const { data } = await supabase
        .from('wallets')
        .select('address')
        .eq('user_id', recipientUserId)
        .eq('chain', chain)
        .eq('is_primary', true)
        .single();
      
      setRecipientWallet(data?.address || null);
    };

    fetchRecipientWallet();
  }, [recipientUserId, chain]);

  // Update token when chain changes
  useEffect(() => {
    const defaultToken = SUPPORTED_TOKENS[chain][0];
    setTokenSymbol(defaultToken.symbol);
  }, [chain]);

  const fetchOrders = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (fetchError) throw fetchError;
      setOrders(data || []);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const createOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError("Please sign in to create an order");
      return;
    }

    if (!recipientWallet) {
      setError(`Recipient doesn't have a ${chain.toUpperCase()} wallet linked. Please select a different chain.`);
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    try {
      setIsCreating(true);
      setError("");
      setSuccess("");

      // Get user's wallet for this chain
      const { data: wallet } = await supabase
        .from('wallets')
        .select('address')
        .eq('user_id', user.id)
        .eq('chain', chain)
        .single();

      const walletAddress = wallet?.address || 'unknown';

      // Get token info
      const selectedToken = SUPPORTED_TOKENS[chain].find(t => t.symbol === tokenSymbol);

      // Create order
      const { data: order, error: createError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          wallet_address: walletAddress,
          chain,
          amount: amountNum,
          token_address: selectedToken?.address,
          token_symbol: tokenSymbol,
          receiving_address: recipientWallet,
          description: description || `Tip to ${recipientName || 'builder'}`,
          status: 'pending',
        })
        .select()
        .single();

      if (createError) throw createError;

      setSuccess("Payment order created successfully!");
      setAmount("");
      setDescription("");
      
      // Refresh orders
      await fetchOrders();

    } catch (err: any) {
      console.error('Error creating order:', err);
      setError(err.message || 'Failed to create order');
    } finally {
      setIsCreating(false);
    }
  };

  const verifyPayment = async (orderId: string, txHashInput: string) => {
    if (!txHashInput) {
      setError("Please enter a transaction hash");
      return;
    }

    try {
      setIsVerifying(orderId);
      setError("");
      setSuccess("");

      // Call Edge Function to verify payment
      const { data, error: verifyError } = await supabase.functions.invoke('verify-payment', {
        body: {
          order_id: orderId,
          tx_hash: txHashInput,
        }
      });

      if (verifyError) throw verifyError;

      if (data.success) {
        setSuccess("Payment verified successfully!");
        await fetchOrders();
        onPaymentComplete?.(orderId);
        setTxHash("");
      } else {
        setError(data.message || 'Payment verification failed');
      }

    } catch (err: any) {
      console.error('Error verifying payment:', err);
      setError(err.message || 'Failed to verify payment');
    } finally {
      setIsVerifying(null);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getExplorerUrl = (chain: string, txHash: string) => {
    const explorers: Record<string, string> = {
      ethereum: `https://etherscan.io/tx/${txHash}`,
      polygon: `https://polygonscan.com/tx/${txHash}`,
      arbitrum: `https://arbiscan.io/tx/${txHash}`,
      solana: `https://explorer.solana.com/tx/${txHash}`,
    };
    return explorers[chain] || '#';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'yellow',
      paid: 'green',
      failed: 'red',
      expired: 'gray',
    };
    return colors[status] || 'gray';
  };

  return (
    <div className="space-y-6">
      {/* Create Order Form */}
      <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-cyan-400" />
            Create Payment Request
          </CardTitle>
          <CardDescription className="text-gray-400">
            Generate a crypto payment order with payment instructions
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={createOrder} className="space-y-4">
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="chain" className="text-white mb-2 block">
                  Blockchain
                </Label>
                <Select value={chain} onValueChange={(v) => setChain(v as ChainType)}>
                  <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="ethereum">Ethereum</SelectItem>
                    <SelectItem value="polygon">Polygon</SelectItem>
                    <SelectItem value="arbitrum">Arbitrum</SelectItem>
                    <SelectItem value="solana">Solana</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="token" className="text-white mb-2 block">
                  Token
                </Label>
                <Select value={tokenSymbol} onValueChange={setTokenSymbol}>
                  <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {SUPPORTED_TOKENS[chain].map(token => (
                      <SelectItem key={token.symbol} value={token.symbol}>
                        {token.symbol} - {token.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="amount" className="text-white mb-2 block">
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.00000001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white"
                required
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-white mb-2 block">
                Description (Optional)
              </Label>
              <Input
                id="description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this payment for?"
                className="bg-gray-800/50 border-gray-700 focus:border-cyan-500/50 text-white"
              />
            </div>

            <Button
              type="submit"
              disabled={isCreating}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4 mr-2" />
                  Create Payment Order
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">Recent Orders</CardTitle>
          <CardDescription className="text-gray-400">
            Your payment requests and their status
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            </div>
          ) : orders.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No orders yet</p>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white font-semibold">
                          {order.amount} {order.token_symbol}
                        </p>
                        <Badge
                          variant="outline"
                          className={`bg-${getStatusColor(order.status)}-500/10 border-${getStatusColor(order.status)}-500/30 text-${getStatusColor(order.status)}-400`}
                        >
                          {order.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400">
                        Chain: {order.chain.charAt(0).toUpperCase() + order.chain.slice(1)}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {order.status === 'pending' && (
                    <div className="space-y-2 pt-2 border-t border-gray-700">
                      <div>
                        <Label className="text-xs text-gray-400">Send to Address:</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-xs text-cyan-400 bg-gray-900/50 px-2 py-1 rounded flex-1 truncate">
                            {order.receiving_address}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(order.receiving_address, `addr-${order.id}`)}
                            className="text-gray-400 hover:text-white"
                          >
                            {copiedField === `addr-${order.id}` ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor={`tx-${order.id}`} className="text-xs text-gray-400">
                          Submit Transaction Hash:
                        </Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            id={`tx-${order.id}`}
                            type="text"
                            value={txHash}
                            onChange={(e) => setTxHash(e.target.value)}
                            placeholder="0x... or transaction signature"
                            className="bg-gray-900/50 border-gray-700 text-white text-sm"
                          />
                          <Button
                            size="sm"
                            onClick={() => verifyPayment(order.id, txHash)}
                            disabled={isVerifying === order.id || !txHash}
                            className="bg-cyan-500 hover:bg-cyan-600"
                          >
                            {isVerifying === order.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              'Verify'
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {order.tx_hash && (
                    <div className="pt-2 border-t border-gray-700">
                      <a
                        href={getExplorerUrl(order.chain, order.tx_hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                      >
                        View on Explorer
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
