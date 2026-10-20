import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Product } from "@/lib/types";

export async function getProducts(): Promise<{ products: Product[]; error?: string }> {
  if (!isSupabaseConfigured) {
    return { products: [], error: "Supabase isn't connected yet. Add the keys from .env.example to .env.local." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select("*").order("sort_order");
  return { products: data ?? [], error: error?.message };
}
