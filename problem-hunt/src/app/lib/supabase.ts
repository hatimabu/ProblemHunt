declare global {
  interface ImportMeta {
    env: {
      VITE_SUPABASE_URL?: string;
      SUPABASE_URL?: string;
      VITE_SUPABASE_ANON_KEY?: string;
      SUPABASE_ANON_KEY?: string;
    };
  }
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function resolveEnvValue(possibleKeys: (string | undefined)[]) {
  return possibleKeys.find((value) => value && value.length > 0);
}

const supabaseUrl = resolveEnvValue([
  // Vite-style vars
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.SUPABASE_URL,
  // Window injected env (Azure Static Web Apps)
  typeof window !== "undefined" ? (window as any).env?.SUPABASE_URL : undefined,
  typeof window !== "undefined" ? (window as any).SUPABASE_URL : undefined,
]);

const supabaseAnonKey = resolveEnvValue([
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  import.meta.env.SUPABASE_ANON_KEY,
  typeof window !== "undefined" ? (window as any).env?.SUPABASE_ANON_KEY : undefined,
  typeof window !== "undefined" ? (window as any).SUPABASE_ANON_KEY : undefined,
]);

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase environment variables are missing. Auth will fail until they are set.");
}

const fallbackUrl = "https://example.supabase.co";
const fallbackKey = "public-anon-key";

export const supabase: SupabaseClient = createClient(
  supabaseUrl || fallbackUrl,
  supabaseAnonKey || fallbackKey
);
