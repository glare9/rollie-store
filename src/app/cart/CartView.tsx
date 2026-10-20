"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { formatPrice, type Product } from "@/lib/types";
import { QuantityInput } from "@/components/QuantityInput";

export function CartView({ products }: { products: Product[] }) {
  const { lines, ready, setQuantity, remove } = useCart();
  if (!ready) return null;

  const rows = lines
    .map((l) => ({ ...l, product: products.find((p) => p.id === l.productId) }))
    .filter((r) => r.product);
  const subtotal = rows.reduce((sum, r) => sum + r.product!.price_cents * r.quantity, 0);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl bg-white shadow-sm p-8 text-center space-y-4">
        <p>Your cart is empty.</p>
        <Link href="/" className="inline-block rounded-full bg-brand-dark text-white font-semibold px-6 py-2">
          See the treats
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ul className="rounded-xl bg-white shadow-sm divide-y divide-black/5">
        {rows.map(({ product: p, quantity }) => (
          <li key={p!.id} className="p-4 flex gap-4 items-center">
            <Image src={p!.image_url || "/placeholder-treat.svg"} alt="" width={80} height={60} className="rounded-md" />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between font-semibold">
                <span>{p!.name}</span>
                <span>{formatPrice(p!.price_cents * quantity)}</span>
              </div>
              <div className="flex items-center justify-between">
                <QuantityInput value={quantity} max={Math.max(1, p!.stock)} onChange={(n) => setQuantity(p!.id, n)} />
                <button type="button" onClick={() => remove(p!.id)} className="text-sm underline opacity-70">
                  Remove
                </button>
              </div>
              {quantity > p!.stock && (
                <p className="text-xs text-red-700">
                  {p!.stock > 0 ? `Only ${p!.stock} left, please lower the quantity.` : "Sold out, please remove it."}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between text-lg font-semibold">
        <span>Subtotal</span>
        <span>{formatPrice(subtotal)}</span>
      </div>
      <div className="flex gap-3">
        <Link href="/" className="flex-1 text-center rounded-full border-2 border-brand-dark text-brand-dark font-semibold py-2">
          Keep shopping
        </Link>
        <Link href="/checkout" className="flex-1 text-center rounded-full bg-brand-dark text-white font-semibold py-2">
          Checkout
        </Link>
      </div>
    </div>
  );
}
