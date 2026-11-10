// Provider factory kept separate so missing configuration fails at application startup.
import { SupabaseAuthClient } from './supabase-auth.client';

export function createSupabaseAuthClient(): SupabaseAuthClient {
  const url = process.env.SUPABASE_URL;
  const apiKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !apiKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
  }
  return new SupabaseAuthClient(url, apiKey);
}
