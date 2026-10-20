import "server-only";
import { formatPrice } from "./types";

// Sends email through Resend's HTTP API (free plan: 100 emails a day).
// Until a domain is verified in Resend, it only delivers to the Resend account's own address.

export type EmailResult = { ok: true } | { ok: false; error: string };

export async function sendEmail(msg: { to: string; subject: string; html: string; text: string; replyTo?: string }): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY isn't set in Vercel, so no email was sent." };
  const from = process.env.EMAIL_FROM || "Rollie <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
      }),
    });
    if (res.ok) return { ok: true };
    const body = await res.json().catch(() => null);
    return { ok: false, error: `Resend said: ${body?.message ?? res.statusText}` };
  } catch (e) {
    return { ok: false, error: `Couldn't reach Resend: ${(e as Error).message}` };
  }
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const formatDeliveryDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-SG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

export function paymentConfirmedEmail(o: {
  storeName: string;
  orderRef: string;
  firstName: string;
  petName: string | null;
  deliveryDate: string;
  slotLabel: string;
  address: string;
  items: { product_name: string; quantity: number; unit_price_cents: number }[];
  subtotalCents: number;
  orderUrl?: string;
}) {
  const day = formatDeliveryDay(o.deliveryDate);
  const forPet = o.petName ? ` for ${o.petName}` : "";
  const subject = `${o.storeName} order ${o.orderRef}: payment received`;

  const lines = o.items.map((i) => `${i.product_name} × ${i.quantity}  ${formatPrice(i.unit_price_cents * i.quantity)}`);
  const text = [
    `Hi ${o.firstName},`,
    "",
    `We've received your PayNow payment for order ${o.orderRef}. Your treats${forPet} are confirmed!`,
    "",
    `Delivery: ${day}, ${o.slotLabel}`,
    `Address: ${o.address}`,
    "",
    ...lines,
    `Total paid: ${formatPrice(o.subtotalCents)}`,
    "",
    ...(o.orderUrl ? [`Your order: ${o.orderUrl}`, ""] : []),
    "Just reply to this email if anything needs changing.",
    "",
    o.storeName,
  ].join("\n");

  const e = escapeHtml;
  const rows = o.items
    .map(
      (i) =>
        `<tr><td style="padding:4px 0">${e(i.product_name)} × ${i.quantity}</td><td style="padding:4px 0;text-align:right">${formatPrice(i.unit_price_cents * i.quantity)}</td></tr>`,
    )
    .join("");
  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#3d2c1e;max-width:480px;margin:0 auto;padding:24px;background:#fffaf3">
<h1 style="font-size:20px;margin:0 0 12px">Payment received, thank you!</h1>
<p>Hi ${e(o.firstName)},</p>
<p>We've received your PayNow payment for order <strong>${e(o.orderRef)}</strong>. Your treats${e(forPet)} are confirmed.</p>
<div style="background:#fff;border-radius:12px;padding:16px;margin:16px 0">
<p style="margin:0 0 4px"><strong>Delivery</strong></p>
<p style="margin:0">${e(day)}, ${e(o.slotLabel)}</p>
<p style="margin:0 0 12px">${e(o.address)}</p>
<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}
<tr><td style="padding:8px 0 0;border-top:1px solid #eee"><strong>Total paid</strong></td><td style="padding:8px 0 0;border-top:1px solid #eee;text-align:right"><strong>${formatPrice(o.subtotalCents)}</strong></td></tr>
</table>
</div>
${o.orderUrl ? `<p><a href="${e(o.orderUrl)}" style="color:#c9772f">View your order</a></p>` : ""}
<p>Just reply to this email if anything needs changing.</p>
<p>${e(o.storeName)}</p>
</div>`;

  return { subject, html, text };
}
