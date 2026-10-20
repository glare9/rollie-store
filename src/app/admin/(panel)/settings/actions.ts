"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-session";

export type FormResult = { ok: boolean; message: string } | null;

const wholeNumber = (v: FormDataEntryValue | null) => {
  const n = Number(v);
  return Number.isInteger(n) ? n : NaN;
};

export async function updateSettings(_prev: FormResult, formData: FormData): Promise<FormResult> {
  await requireAdmin();
  const text = (k: string) => String(formData.get(k) ?? "").trim();
  const update = {
    store_name: text("store_name") || "Rollie",
    daily_order_cap: wholeNumber(formData.get("daily_order_cap")),
    min_lead_days: wholeNumber(formData.get("min_lead_days")),
    max_advance_days: wholeNumber(formData.get("max_advance_days")),
    paynow_uen: text("paynow_uen").replace(/\s+/g, "").toUpperCase() || null,
    paynow_qr_url: text("paynow_qr_url") || null,
    admin_email: text("admin_email") || null,
  };
  if (!(update.daily_order_cap >= 0)) return { ok: false, message: "Orders per day must be 0 or more." };
  if (!(update.min_lead_days >= 0)) return { ok: false, message: "Earliest booking must be 0 days or more." };
  if (!(update.max_advance_days > update.min_lead_days)) {
    return { ok: false, message: "Latest booking must be further ahead than the earliest booking." };
  }
  const supabase = createAdminClient();
  const { error } = await supabase.from("store_settings").update(update).eq("id", true);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/settings");
  return { ok: true, message: "Saved." };
}

export async function addClosedDate(_prev: FormResult, formData: FormData): Promise<FormResult> {
  await requireAdmin();
  const date = String(formData.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, message: "Please pick a date." };
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (day !== 0 && day !== 6) return { ok: false, message: "That's a weekday. Deliveries only happen on weekends anyway." };
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("delivery_closed_dates")
    .upsert({ date, reason: String(formData.get("reason") ?? "").trim() || null });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/settings");
  return { ok: true, message: "Closed. Customers can no longer pick that day." };
}

export async function removeClosedDate(date: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  await supabase.from("delivery_closed_dates").delete().eq("date", date);
  revalidatePath("/admin/settings");
}
