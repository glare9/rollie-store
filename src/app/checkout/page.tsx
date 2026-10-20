import { createClient } from "@/lib/supabase/server";
import { getProducts } from "@/lib/catalogue";
import type { DeliveryDay, DeliverySlot } from "@/lib/types";
import { CheckoutForm } from "./CheckoutForm";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ buy?: string; qty?: string }>;
}) {
  const { buy, qty } = await searchParams;
  const { products, error } = await getProducts();

  let days: DeliveryDay[] = [];
  let slots: DeliverySlot[] = [];
  if (!error) {
    const supabase = await createClient();
    const [availability, slotRows] = await Promise.all([
      supabase.rpc("delivery_availability"),
      supabase.from("delivery_time_slots").select("*").order("sort_order"),
    ]);
    days = availability.data ?? [];
    slots = slotRows.data ?? [];
  }

  // "Buy now" checks out a single treat without touching the cart.
  const buyNowProduct = buy ? products.find((p) => p.slug === buy) : undefined;
  const buyNow = buyNowProduct
    ? [{ productId: buyNowProduct.id, quantity: Math.max(1, parseInt(qty ?? "1", 10) || 1) }]
    : undefined;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Checkout</h1>
      {error && <p className="rounded-lg bg-amber-100 text-amber-900 px-4 py-3 text-sm">{error}</p>}
      <CheckoutForm products={products} days={days} slots={slots} buyNow={buyNow} />
    </div>
  );
}
