import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./env";

// Browser client: public anon key, limited by row level security.
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
