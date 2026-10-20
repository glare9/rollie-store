"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-session";

export type FormResult = { ok: boolean; message: string } | null;

const BUCKET = "product-images";
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "treat";

function parseFields(formData: FormData): { error: string; fields?: undefined } | { error?: undefined; fields: ProductFields } {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const price = Number(String(formData.get("price") ?? "").replace(/[$,\s]/g, ""));
  const stock = Number(formData.get("stock"));
  const sortOrder = Number(formData.get("sort_order") ?? 0);
  if (!name) return { error: "Please give the treat a name." };
  if (!Number.isFinite(price) || price < 0) return { error: "Please enter a price like 12.50." };
  if (!Number.isInteger(stock) || stock < 0) return { error: "Stock must be a whole number, 0 or more." };
  return {
    fields: {
      name,
      description,
      price_cents: Math.round(price * 100),
      stock,
      is_active: formData.get("is_active") === "on",
      sort_order: Number.isFinite(sortOrder) ? Math.trunc(sortOrder) : 0,
    },
  };
}

// Uploads a photo to Supabase Storage (creating the public bucket the first time) and returns its URL.
async function uploadPhoto(file: File, slug: string): Promise<{ url?: string; error?: string }> {
  if (!file.type.startsWith("image/")) return { error: "The photo must be an image file (JPG, PNG or WebP)." };
  if (file.size > MAX_PHOTO_BYTES) return { error: "The photo is over 4 MB. Please use a smaller one." };
  const supabase = createAdminClient();
  const { error: bucketError } = await supabase.storage.getBucket(BUCKET);
  if (bucketError) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error && !/already exists/i.test(error.message)) return { error: `Couldn't set up photo storage: ${error.message}` };
  }
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${slug}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (error) return { error: `Photo upload failed: ${error.message}` };
  return { url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
}

type ProductFields = {
  name: string;
  description: string | null;
  price_cents: number;
  stock: number;
  is_active: boolean;
  sort_order: number;
};

const photoFrom = (formData: FormData) => {
  const f = formData.get("photo");
  return f instanceof File && f.size > 0 ? f : null;
};

export async function updateProduct(_prev: FormResult, formData: FormData): Promise<FormResult> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const loadedStock = Number(formData.get("loaded_stock"));
  const parsed = parseFields(formData);
  if (!parsed.fields) return { ok: false, message: parsed.error };

  const update: Record<string, unknown> = { ...parsed.fields };
  const photo = photoFrom(formData);
  if (photo) {
    const up = await uploadPhoto(photo, String(formData.get("slug") || "treat"));
    if (up.error) return { ok: false, message: up.error };
    update.image_url = up.url;
  } else if (formData.get("remove_photo") === "on") {
    update.image_url = null;
  }

  // Only save stock if no order changed it since this page loaded, so a sale isn't overwritten.
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("products")
    .update(update)
    .eq("id", id)
    .eq("stock", loadedStock)
    .select("id");
  if (error) return { ok: false, message: error.message };
  if (!data?.length) {
    return { ok: false, message: "Stock changed since you opened this page (an order came in or was cancelled). Reload and try again." };
  }
  revalidatePath("/admin/products");
  revalidatePath("/");
  return { ok: true, message: "Saved." };
}

export async function createProduct(_prev: FormResult, formData: FormData): Promise<FormResult> {
  await requireAdmin();
  const parsed = parseFields(formData);
  if (!parsed.fields) return { ok: false, message: parsed.error };

  const supabase = createAdminClient();
  let slug = slugify(parsed.fields.name);
  const { data: clash } = await supabase.from("products").select("id").eq("slug", slug).maybeSingle();
  if (clash) slug = `${slug}-${Date.now().toString(36)}`;

  let image_url: string | null = null;
  const photo = photoFrom(formData);
  if (photo) {
    const up = await uploadPhoto(photo, slug);
    if (up.error) return { ok: false, message: up.error };
    image_url = up.url!;
  }

  const { error } = await supabase.from("products").insert({ ...parsed.fields, slug, image_url });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/products");
  revalidatePath("/");
  return { ok: true, message: `Added ${parsed.fields.name}.` };
}
