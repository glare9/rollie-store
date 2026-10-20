"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/types";
import { createProduct, updateProduct, type FormResult } from "./actions";

const input = "w-full rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm";

// Phone photos are often 3 to 10 MB, over Vercel's 4.5 MB upload limit, so shrink them in the browser first.
const MAX_SIDE = 1600;
async function shrinkPhoto(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("Couldn't convert the photo");
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}

export function ProductForm({ product, nextSortOrder = 0 }: { product?: Product; nextSortOrder?: number }) {
  const save = product ? updateProduct : createProduct;
  const [result, action, pending] = useActionState<FormResult, FormData>(async (prev, formData) => {
    try {
      return await save(prev, formData);
    } catch {
      return { ok: false, message: "Saving failed. If you added a photo, try a smaller one." };
    }
  }, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoNote, setPhotoNote] = useState("");
  const [preparing, setPreparing] = useState(false);

  // Clear the "add a treat" form after a successful add, and drop the photo preview after any save.
  useEffect(() => {
    if (!result?.ok) return;
    if (!product) formRef.current?.reset();
    setPreview(null);
    setPhotoNote("");
  }, [product, result]);

  async function onPhotoChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const inputEl = e.currentTarget;
    const file = inputEl.files?.[0];
    setPreview(null);
    setPhotoNote("");
    if (!file) return;
    setPreparing(true);
    try {
      const small = await shrinkPhoto(file);
      const files = new DataTransfer();
      files.items.add(small);
      inputEl.files = files.files;
      setPreview(URL.createObjectURL(small));
      setPhotoNote("Press Save to upload this photo.");
    } catch {
      // The browser couldn't read it (e.g. some HEIC files): send it as is if it fits.
      if (file.size > 4 * 1024 * 1024) {
        inputEl.value = "";
        setPhotoNote("This photo is too large and couldn't be resized. Please choose a JPG or PNG.");
      } else {
        setPreview(URL.createObjectURL(file));
        setPhotoNote("Press Save to upload this photo.");
      }
    } finally {
      setPreparing(false);
    }
  }

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
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="New photo" className="rounded-lg w-full aspect-[4/3] object-cover ring-2 ring-brand" />
          ) : (
            <Image
              src={product?.image_url || "/placeholder-treat.svg"}
              alt=""
              width={120}
              height={90}
              className="rounded-lg w-full h-auto"
            />
          )}
          <label className="block text-xs">
            <span className="opacity-70">{product?.image_url ? "Replace photo" : "Add photo"}</span>
            <input type="file" name="photo" accept="image/*" onChange={onPhotoChosen} className="w-full text-xs" />
          </label>
          {preparing && <p className="text-xs opacity-60">Preparing photo…</p>}
          {photoNote && <p className="text-xs font-medium text-brand-dark">{photoNote}</p>}
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
            <input
              name="sort_order"
              type="number"
              step={1}
              defaultValue={product?.sort_order ?? nextSortOrder}
              className={input}
            />
          </label>
          <label className="flex items-center gap-2 self-end pb-1.5 text-sm">
            <input type="checkbox" name="is_active" defaultChecked={product?.is_active ?? true} /> On sale
          </label>
          <div className="sm:col-span-4 flex items-center gap-3">
            <button
              disabled={pending || preparing}
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
