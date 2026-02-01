// Supabase Edge Function: auth-wallet
// Authenticates users with Web3 wallet signatures
// Creates Supabase user if doesn't exist, or returns existing user session
//
// Environment Variables Required:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// - JWT_SECRET (for generating custom JWT tokens)

// @deno-types="https://deno.land/std@0.177.0/http/server.ts"
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @deno-types="https://esm.sh/@supabase/supabase-js@2.38.4"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
// @deno-types="https://deno.land/x/djwt@v2.8/mod.ts"
import { create } from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuthWalletRequest {
  chain: string;
  address: string;
  signature: string;
  statement: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { chain, address, signature, statement } = await req.json() as AuthWalletRequest;

    // Validate inputs
    if (!chain || !address || !signature || !statement) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Normalize wallet address
    const normalizedAddress = chain === 'solana' 
      ? address 
      : address.toLowerCase();

    // Check if wallet already exists in database
    const { data: existingWallet } = await supabase
      .from('wallets')
      .select('user_id, users:user_id(id, email)')
      .eq('chain', chain)
      .eq('address', normalizedAddress)
      .single();

    let userId: string;

    if (existingWallet?.user_id) {
      // User exists, return their ID
      userId = existingWallet.user_id;
    } else {
      // Create new user
      // Use wallet address as email (Supabase requires email)
      const pseudoEmail = `${normalizedAddress}@wallet.local`;

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: pseudoEmail,
        email_confirm: true, // Auto-confirm since we verified signature
        user_metadata: {
          wallet_address: normalizedAddress,
          wallet_chain: chain,
          auth_method: 'web3_wallet',
        },
      });

      if (createError || !newUser.user) {
        // Check if user already exists by email
        const { data: existingUser } = await supabase.auth.admin.listUsers();
        const foundUser = existingUser.users.find(u => u.email === pseudoEmail);
        
        if (foundUser) {
          userId = foundUser.id;
        } else {
          throw createError || new Error('Failed to create user');
        }
      } else {
        userId = newUser.user.id;
      }

      // Create wallet entry
      await supabase
        .from('wallets')
        .insert({
          user_id: userId,
          chain,
          address: normalizedAddress,
          is_primary: true,
        });

      // Create profile entry
      await supabase
        .from('profiles')
        .insert({
          id: userId,
          username: `user_${normalizedAddress.slice(0, 8)}`,
          user_type: 'problem_poster',
        });
    }

    // Generate JWT tokens
    const jwtSecret = Deno.env.get('JWT_SECRET') || supabaseKey;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(jwtSecret),
      { name: 'HMAC', hash: 'SHA-256' } as HmacImportParams,
      false,
      ['sign', 'verify'] as KeyUsage[]
    );

    const now = Math.floor(Date.now() / 1000);
    const accessToken = await create(
      { alg: 'HS256', typ: 'JWT' },
      {
        sub: userId,
        aud: 'authenticated',
        role: 'authenticated',
        iat: now,
        exp: now + 3600, // 1 hour
      },
      key
    );

    const refreshToken = await create(
      { alg: 'HS256', typ: 'JWT' },
      {
        sub: userId,
        aud: 'authenticated',
        role: 'authenticated',
        iat: now,
        exp: now + (60 * 60 * 24 * 60), // 60 days
      },
      key
    );

    return new Response(
      JSON.stringify({ 
        access_token: accessToken,
        refresh_token: refreshToken,
        user_id: userId,
        wallet_address: normalizedAddress,
        chain,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    console.error('Error in auth-wallet:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
