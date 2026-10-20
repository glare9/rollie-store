import Image from "next/image";
import { getProducts } from "@/lib/catalogue";
import { formatPrice } from "@/lib/types";
import { ProductActions } from "@/components/ProductActions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { products, error } = await getProducts();

  return (
    <div className="space-y-8">
      <section className="text-center space-y-2">
        <h1 className="text-3xl font-bold">This season&apos;s treats</h1>
        <p className="opacity-75">Baked in small batches. Delivered by us on Saturdays and Sundays.</p>
      </section>

      {error && (
        <p className="rounded-lg bg-amber-100 text-amber-900 px-4 py-3 text-sm">{error}</p>
      )}

      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <li key={p.id} className="rounded-xl bg-white shadow-sm overflow-hidden flex flex-col">
            <Image
              src={p.image_url || "/placeholder-treat.svg"}
              alt={p.name}
              width={400}
              height={300}
              className="w-full h-auto"
            />
            <div className="p-4 space-y-3 flex-1 flex flex-col">
              <div className="space-y-1 flex-1">
                <div className="flex justify-between font-semibold">
                  <span>{p.name}</span>
                  <span>{formatPrice(p.price_cents)}</span>
                </div>
                <p className="text-sm opacity-75">{p.description}</p>
                {p.stock > 0 && p.stock <= 10 && <p className="text-xs opacity-60">Only {p.stock} left</p>}
              </div>
              <ProductActions productId={p.id} slug={p.slug} stock={p.stock} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
