"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-session";

export type FormResult = { ok: boolean; message: string } | null;

export async function updateCustomer(_prev: FormResult, formData: FormData): Promise<FormResult> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const field = (k: string) => String(formData.get(k) ?? "").trim();
  const update = {
    full_name: field("full_name"),
    phone: field("phone"),
    pet_name: field("pet_name") || null,
    address: field("address"),
    postal_code: field("postal_code") || null,
    notes: field("notes") || null,
  };
  if (!update.full_name || !update.phone || !update.address) {
    return { ok: false, message: "Name, phone and address can't be empty." };
  }
  const supabase = createAdminClient();
  const { error } = await supabase.from("customers").update(update).eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/admin/customers/${id}`);
  revalidatePath("/admin/customers");
  return { ok: true, message: "Saved." };
}
