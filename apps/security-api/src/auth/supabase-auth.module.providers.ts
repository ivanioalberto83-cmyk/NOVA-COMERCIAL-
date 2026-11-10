import { SupabaseAuthClient } from './supabase-auth.client';
import { validateEnvironment } from '../config/environment';

export function createSupabaseAuthClient(): SupabaseAuthClient {
  const config = validateEnvironment(process.env);
  return new SupabaseAuthClient(config.supabaseUrl, config.supabaseAnonKey);
}
