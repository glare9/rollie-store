import { createAdminClient } from "@/lib/supabase/admin";
import type { Product } from "@/lib/types";
import { ProductForm } from "./ProductForm";

export const dynamic = "force-dynamic";

export default async function AdminProducts() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("products").select("*").order("sort_order").order("name");
  const products = (data ?? []) as Product[];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Products and stock</h1>
        <p className="text-sm opacity-70">
          Stock goes down when an order is placed and back up when one is cancelled. Untick &ldquo;On sale&rdquo; to hide a treat
          that&apos;s out of season.
        </p>
      </div>
      {error && <p className="rounded-lg bg-red-100 text-red-900 px-4 py-3 text-sm">Couldn&apos;t load products: {error.message}</p>}
      <div className="space-y-3">
        {products.map((p) => (
          <ProductForm key={p.id} product={p} />
        ))}
      </div>
      <section className="space-y-2">
        <h2 className="font-semibold">Add a treat</h2>
        <ProductForm nextSortOrder={Math.max(0, ...products.map((p) => p.sort_order)) + 1} />
      </section>
    </div>
  );
}
