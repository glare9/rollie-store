"use server";

import { createClient } from "@/lib/supabase/server";
import type { CartLine } from "@/lib/cart";

export type CheckoutDetails = {
  full_name: string;
  pet_name: string;
  email: string;
  phone: string;
  address: string;
  postal_code: string;
  note: string;
};

export type PlaceOrderResult =
  | { ok: true; orderId: string; orderRef: string; subtotalCents: number }
  | { ok: false; error: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function placeOrder(input: {
  details: CheckoutDetails;
  items: CartLine[];
  deliveryDate: string;
  deliverySlot: string;
}): Promise<PlaceOrderResult> {
  const d = input.details;
  const phoneDigits = d.phone.replace(/[^\d]/g, "").replace(/^65(?=\d{8}$)/, "");

  if (!d.full_name.trim()) return { ok: false, error: "Please enter your name." };
  if (!EMAIL.test(d.email.trim())) return { ok: false, error: "Please enter a valid email address." };
  if (!/^[3689]\d{7}$/.test(phoneDigits)) return { ok: false, error: "Please enter an 8-digit Singapore phone number." };
  if (!d.address.trim()) return { ok: false, error: "Please enter your delivery address." };
  if (!/^\d{6}$/.test(d.postal_code.trim())) return { ok: false, error: "Please enter a 6-digit postal code." };
  if (!input.deliveryDate) return { ok: false, error: "Please choose a delivery day." };
  if (!input.deliverySlot) return { ok: false, error: "Please choose a delivery time." };
  if (input.items.length === 0) return { ok: false, error: "Your cart is empty." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("place_order", {
    p_customer: {
      full_name: d.full_name,
      email: d.email.toLowerCase(),
      phone: phoneDigits,
      pet_name: d.pet_name,
      address: d.address,
      postal_code: d.postal_code,
    },
    p_items: input.items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
    p_delivery_date: input.deliveryDate,
    p_delivery_slot: input.deliverySlot,
    p_note: d.note,
  });

  if (error) {
    // Messages raised by place_order (P0001) are written for customers; hide anything else.
    return { ok: false, error: error.code === "P0001" ? error.message : "Something went wrong placing your order. Please try again." };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.order_id) return { ok: false, error: "Something went wrong placing your order. Please try again." };
  return { ok: true, orderId: row.order_id, orderRef: row.order_ref, subtotalCents: row.subtotal_cents };
}
