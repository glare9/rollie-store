"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { QuantityInput } from "./QuantityInput";

export function ProductActions({ productId, slug, stock }: { productId: string; slug: string; stock: number }) {
  const router = useRouter();
  const { lines, add } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const inCart = lines.find((l) => l.productId === productId)?.quantity ?? 0;
  const available = Math.max(0, stock - inCart);

  if (stock <= 0) return <p className="text-sm font-medium opacity-60">Sold out</p>;

  return (
    <div className="space-y-3">
      <QuantityInput value={Math.min(qty, Math.max(1, available))} max={Math.max(1, available)} onChange={setQty} />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={available <= 0}
          onClick={() => {
            add(productId, Math.min(qty, available));
            setQty(1);
            setAdded(true);
            setTimeout(() => setAdded(false), 1500);
          }}
          className="flex-1 rounded-full border-2 border-brand-dark text-brand-dark font-semibold py-2 disabled:opacity-40"
        >
          {added ? "Added ✓" : "Add to cart"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/checkout?buy=${encodeURIComponent(slug)}&qty=${Math.min(qty, stock)}`)}
          className="flex-1 rounded-full bg-brand-dark text-white font-semibold py-2"
        >
          Buy now
        </button>
      </div>
      {inCart > 0 && <p className="text-xs opacity-60">{inCart} in your cart</p>}
    </div>
  );
}
