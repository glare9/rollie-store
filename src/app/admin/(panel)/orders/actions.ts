"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-session";
import { paymentConfirmedEmail, sendEmail } from "@/lib/email";

export type ActionResult = { ok: boolean; message: string } | null;

async function siteUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return host ? `${h.get("x-forwarded-proto") ?? "https"}://${host}` : undefined;
}

async function sendConfirmation(orderId: string): Promise<ActionResult> {
  const supabase = createAdminClient();
  const [{ data: order, error }, { data: settings }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_ref, status, delivery_date, delivery_address, pet_name, subtotal_cents, delivery_time_slots(label), order_items(product_name, quantity, unit_price_cents), customers(full_name, email)")
      .eq("id", orderId)
      .single(),
    supabase.from("store_settings").select("store_name, admin_email").single(),
  ]);
  if (error || !order) return { ok: false, message: `Couldn't load the order: ${error?.message ?? "not found"}` };

  const customer = order.customers as unknown as { full_name: string; email: string };
  const slot = order.delivery_time_slots as unknown as { label: string } | null;
  const base = await siteUrl();
  const email = paymentConfirmedEmail({
    storeName: settings?.store_name || "Rollie",
    orderRef: order.order_ref,
    firstName: customer.full_name.split(" ")[0],
    petName: order.pet_name,
    deliveryDate: order.delivery_date,
    slotLabel: slot?.label ?? order.delivery_date,
    address: order.delivery_address,
    items: order.order_items as { product_name: string; quantity: number; unit_price_cents: number }[],
    subtotalCents: order.subtotal_cents,
    orderUrl: base ? `${base}/order/${order.id}` : undefined,
  });
  const sent = await sendEmail({ to: customer.email, replyTo: settings?.admin_email || undefined, ...email });
  if (!sent.ok) return { ok: false, message: sent.error };

  await supabase.from("orders").update({ confirmation_email_sent_at: new Date().toISOString() }).eq("id", orderId);
  return { ok: true, message: `Confirmation emailed to ${customer.email}.` };
}

export async function markPaid(orderId: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("mark_order_paid", { p_order_id: orderId });
  if (error) return { ok: false, message: error.message };
  if (!data?.id) return { ok: false, message: "This order isn't waiting for payment any more." };
  revalidatePath("/admin");
  const email = await sendConfirmation(orderId);
  revalidatePath(`/admin/orders/${orderId}`);
  return email!.ok
    ? { ok: true, message: `Marked paid. ${email!.message}` }
    : { ok: false, message: `Marked paid, but the email wasn't sent. ${email!.message}` };
}

export async function resendConfirmation(orderId: string): Promise<ActionResult> {
  await requireAdmin();
  const result = await sendConfirmation(orderId);
  revalidatePath(`/admin/orders/${orderId}`);
  return result;
}

export async function markDelivered(orderId: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .update({ status: "delivered" })
    .eq("id", orderId)
    .eq("status", "paid")
    .select("id");
  if (error) return { ok: false, message: error.message };
  if (!data?.length) return { ok: false, message: "Only paid orders can be marked delivered." };
  revalidatePath("/admin");
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, message: "Marked delivered." };
}

export async function cancelOrder(orderId: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("cancel_order", { p_order_id: orderId });
  if (error) return { ok: false, message: error.message };
  if (!data?.id) return { ok: false, message: "This order can't be cancelled (already delivered or cancelled)." };
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, message: "Cancelled. The treats are back in stock and the delivery spot is free again." };
}
