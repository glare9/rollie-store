"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef } from "react";
import type { Product } from "@/lib/types";
import { createProduct, updateProduct, type FormResult } from "./actions";

const input = "w-full rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm";

export function ProductForm({ product, nextSortOrder = 0 }: { product?: Product; nextSortOrder?: number }) {
  const [result, action, pending] = useActionState<FormResult, FormData>(product ? updateProduct : createProduct, null);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the "add a treat" form after a successful add.
  useEffect(() => {
    if (!product && result?.ok) formRef.current?.reset();
  }, [product, result]);

  return (
    <form ref={formRef} action={action} className="rounded-xl bg-white shadow-sm p-4">
      {product && (
        <>
          <input type="hidden" name="id" value={product.id} />
          <input type="hidden" name="slug" value={product.slug} />
          <input type="hidden" name="loaded_stock" value={product.stock} />
        </>
      )}
      {/* Re-keyed on save or sale so the fields refill with fresh values, while the save message stays. */}
      <div key={product ? `${product.stock}-${product.updated_at}` : "new"} className="grid gap-4 sm:grid-cols-[120px_1fr]">
        <div className="space-y-2">
          <Image
            src={product?.image_url || "/placeholder-treat.svg"}
            alt=""
            width={120}
            height={90}
            className="rounded-lg w-full h-auto"
          />
          <label className="block text-xs">
            <span className="opacity-70">{product?.image_url ? "Replace photo" : "Add photo"}</span>
            <input type="file" name="photo" accept="image/*" className="w-full text-xs" />
          </label>
          {product?.image_url && (
            <label className="flex items-center gap-1 text-xs opacity-70">
              <input type="checkbox" name="remove_photo" /> Remove photo
            </label>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="sm:col-span-4 space-y-1">
            <span className="text-xs opacity-70">Name</span>
            <input name="name" required defaultValue={product?.name} className={input} />
          </label>
          <label className="sm:col-span-4 space-y-1">
            <span className="text-xs opacity-70">Description</span>
            <textarea name="description" rows={2} defaultValue={product?.description ?? ""} className={input} />
          </label>
          <label className="space-y-1">
            <span className="text-xs opacity-70">Price ($)</span>
            <input
              name="price"
              required
              inputMode="decimal"
              defaultValue={product ? (product.price_cents / 100).toFixed(2) : ""}
              className={input}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs opacity-70">In stock</span>
            <input name="stock" type="number" min={0} step={1} required defaultValue={product?.stock ?? 0} className={input} />
          </label>
          <label className="space-y-1">
            <span className="text-xs opacity-70">Display order</span>
            <input name="sort_order" type="number" step={1} defaultValue={product?.sort_order ?? nextSortOrder} className={input} />
          </label>
          <label className="flex items-center gap-2 self-end pb-1.5 text-sm">
            <input type="checkbox" name="is_active" defaultChecked={product?.is_active ?? true} /> On sale
          </label>
          <div className="sm:col-span-4 flex items-center gap-3">
            <button
              disabled={pending}
              className="rounded-lg bg-brand-dark text-white text-sm font-medium px-4 py-1.5 disabled:opacity-60"
            >
              {pending ? "Saving…" : product ? "Save" : "Add treat"}
            </button>
            {result && <p className={`text-xs ${result.ok ? "text-green-700" : "text-red-700"}`}>{result.message}</p>}
          </div>
        </div>
      </div>
    </form>
  );
}
