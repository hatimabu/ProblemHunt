// Supabase Edge Function: verify-payment
// Verifies on-chain cryptocurrency transactions and marks orders as paid
//
// Dependencies: None (uses Web APIs only)
// Environment Variables Required:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// - ETH_RPC_URL (e.g., https://mainnet.infura.io/v3/YOUR_KEY or https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY)
// - POLYGON_RPC_URL
// - ARBITRUM_RPC_URL
// - SOL_RPC_URL (e.g., https://api.mainnet-beta.solana.com)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyPaymentRequest {
  order_id: string;
  tx_hash: string;
  chain?: string; // Optional - will be read from order if not provided
}

interface Order {
  id: string;
  user_id: string;
  chain: string;
  amount: number;
  token_address: string | null;
  receiving_address: string;
  status: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { order_id, tx_hash, chain } = await req.json() as VerifyPaymentRequest;

    // Validate inputs
    if (!order_id || !tx_hash) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Missing required fields: order_id and tx_hash' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Order not found' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if order is already processed
    if (order.status !== 'pending') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Order already ${order.status}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify transaction based on chain
    const verificationResult = await verifyTransaction(
      order as Order,
      tx_hash
    );

    if (!verificationResult.success) {
      // Update order with failed status
      await supabase
        .from('orders')
        .update({
          status: 'failed',
          verification_attempts: (order.verification_attempts || 0) + 1,
          last_verification_attempt: new Date().toISOString(),
        })
        .eq('id', order_id);

      return new Response(
        JSON.stringify({ 
          success: false, 
          message: verificationResult.message 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Mark order as paid
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        tx_hash: tx_hash,
        verified_at: new Date().toISOString(),
        verification_attempts: (order.verification_attempts || 0) + 1,
        last_verification_attempt: new Date().toISOString(),
      })
      .eq('id', order_id);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Payment verified successfully',
        amount_received: verificationResult.amount,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in verify-payment:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/**
 * Verify transaction on-chain based on the blockchain
 */
async function verifyTransaction(
  order: Order,
  txHash: string
): Promise<{ success: boolean; message: string; amount?: number }> {
  const chain = order.chain.toLowerCase();

  if (chain === 'ethereum' || chain === 'polygon' || chain === 'arbitrum') {
    return await verifyEVMTransaction(order, txHash, chain);
  } else if (chain === 'solana') {
    return await verifySolanaTransaction(order, txHash);
  } else {
    return {
      success: false,
      message: `Unsupported chain: ${chain}`,
    };
  }
}

/**
 * Verify EVM-based transaction (Ethereum, Polygon, Arbitrum)
 */
async function verifyEVMTransaction(
  order: Order,
  txHash: string,
  chain: string
): Promise<{ success: boolean; message: string; amount?: number }> {
  try {
    // Get RPC URL for the chain
    const rpcUrlKey = chain === 'ethereum' 
      ? 'ETH_RPC_URL' 
      : chain === 'polygon' 
      ? 'POLYGON_RPC_URL' 
      : 'ARBITRUM_RPC_URL';
    
    const rpcUrl = Deno.env.get(rpcUrlKey);
    
    if (!rpcUrl) {
      throw new Error(`Missing ${rpcUrlKey} environment variable`);
    }

    // Fetch transaction receipt
    const receiptResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      }),
    });

    const receiptData = await receiptResponse.json();

    if (receiptData.error) {
      return {
        success: false,
        message: `RPC error: ${receiptData.error.message}`,
      };
    }

    const receipt = receiptData.result;

    if (!receipt) {
      return {
        success: false,
        message: 'Transaction not found',
      };
    }

    // Check if transaction was successful
    if (receipt.status !== '0x1') {
      return {
        success: false,
        message: 'Transaction failed on-chain',
      };
    }

    // Fetch transaction details
    const txResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'eth_getTransactionByHash',
        params: [txHash],
      }),
    });

    const txData = await txResponse.json();
    const tx = txData.result;

    if (!tx) {
      return {
        success: false,
        message: 'Transaction details not found',
      };
    }

    // Verify receiving address
    const expectedAddress = order.receiving_address.toLowerCase();
    
    let actualRecipient: string;
    let actualAmount: number;

    if (order.token_address) {
      // ERC20 token transfer
      // Parse transfer event from logs
      const transferEvent = receipt.logs.find((log: any) => 
        log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' // Transfer event signature
      );

      if (!transferEvent) {
        return {
          success: false,
          message: 'No transfer event found',
        };
      }

      // Decode recipient (topics[2])
      actualRecipient = '0x' + transferEvent.topics[2].slice(-40);
      
      // Decode amount (data)
      const amountHex = transferEvent.data;
      actualAmount = parseInt(amountHex, 16) / 1e6; // Assuming 6 decimals (USDC/USDT)

    } else {
      // Native token transfer (ETH, MATIC)
      actualRecipient = tx.to.toLowerCase();
      actualAmount = parseInt(tx.value, 16) / 1e18; // Convert from wei to ETH
    }

    // Verify recipient matches
    if (actualRecipient !== expectedAddress) {
      return {
        success: false,
        message: `Payment sent to wrong address. Expected: ${expectedAddress}, Got: ${actualRecipient}`,
      };
    }

    // Verify amount (with 1% tolerance for gas/rounding)
    const expectedAmount = order.amount;
    const tolerance = expectedAmount * 0.01;

    if (actualAmount < expectedAmount - tolerance) {
      return {
        success: false,
        message: `Insufficient amount. Expected: ${expectedAmount}, Got: ${actualAmount}`,
      };
    }

    return {
      success: true,
      message: 'Transaction verified successfully',
      amount: actualAmount,
    };

  } catch (error) {
    console.error('Error verifying EVM transaction:', error);
    return {
      success: false,
      message: error.message || 'Failed to verify transaction',
    };
  }
}

/**
 * Verify Solana transaction
 */
async function verifySolanaTransaction(
  order: Order,
  txSignature: string
): Promise<{ success: boolean; message: string; amount?: number }> {
  try {
    const rpcUrl = Deno.env.get('SOL_RPC_URL') || 'https://api.mainnet-beta.solana.com';

    // Fetch transaction
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTransaction',
        params: [
          txSignature,
          {
            encoding: 'jsonParsed',
            maxSupportedTransactionVersion: 0,
          },
        ],
      }),
    });

    const data = await response.json();

    if (data.error) {
      return {
        success: false,
        message: `RPC error: ${data.error.message}`,
      };
    }

    const tx = data.result;

    if (!tx) {
      return {
        success: false,
        message: 'Transaction not found',
      };
    }

    // Check if transaction was successful
    if (tx.meta?.err) {
      return {
        success: false,
        message: 'Transaction failed on-chain',
      };
    }

    // Find the transfer instruction
    const instructions = tx.transaction.message.instructions;
    
    let actualAmount = 0;
    let actualRecipient = '';
    const expectedAddress = order.receiving_address;

    if (order.token_address) {
      // SPL Token transfer
      const transferInstruction = instructions.find((ix: any) => 
        ix.parsed?.type === 'transfer' || ix.parsed?.type === 'transferChecked'
      );

      if (!transferInstruction) {
        return {
          success: false,
          message: 'No transfer instruction found',
        };
      }

      const info = transferInstruction.parsed.info;
      actualRecipient = info.destination;
      actualAmount = info.tokenAmount?.uiAmount || (info.amount / 1e6); // USDC has 6 decimals

    } else {
      // Native SOL transfer
      const postBalances = tx.meta.postBalances;
      const preBalances = tx.meta.preBalances;
      const accountKeys = tx.transaction.message.accountKeys;

      // Find the receiving account
      const recipientIndex = accountKeys.findIndex((key: any) => 
        key.pubkey === expectedAddress
      );

      if (recipientIndex === -1) {
        return {
          success: false,
          message: 'Recipient not found in transaction',
        };
      }

      actualRecipient = accountKeys[recipientIndex].pubkey;
      actualAmount = (postBalances[recipientIndex] - preBalances[recipientIndex]) / 1e9; // Convert lamports to SOL
    }

    // Verify recipient
    if (actualRecipient !== expectedAddress) {
      return {
        success: false,
        message: `Payment sent to wrong address. Expected: ${expectedAddress}, Got: ${actualRecipient}`,
      };
    }

    // Verify amount (with 1% tolerance)
    const expectedAmount = order.amount;
    const tolerance = expectedAmount * 0.01;

    if (actualAmount < expectedAmount - tolerance) {
      return {
        success: false,
        message: `Insufficient amount. Expected: ${expectedAmount}, Got: ${actualAmount}`,
      };
    }

    return {
      success: true,
      message: 'Transaction verified successfully',
      amount: actualAmount,
    };

  } catch (error) {
    console.error('Error verifying Solana transaction:', error);
    return {
      success: false,
      message: error.message || 'Failed to verify transaction',
    };
  }
}
