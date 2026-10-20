import { getProducts } from "@/lib/catalogue";
import { CartView } from "./CartView";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const { products, error } = await getProducts();
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Your cart</h1>
      {error && <p className="rounded-lg bg-amber-100 text-amber-900 px-4 py-3 text-sm">{error}</p>}
      <CartView products={products} />
    </div>
  );
}
