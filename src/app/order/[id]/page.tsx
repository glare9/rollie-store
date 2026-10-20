import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { paynowPayload } from "@/lib/paynow";
import { formatPrice } from "@/lib/types";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Shown when no PayNow UEN or QR image has been set in store_settings yet.
const SAMPLE_UEN = "T00XX0000X";

type OrderView = {
  order_ref: string;
  status: string;
  delivery_date: string | null;
  subtotal_cents: number;
  pet_name: string | null;
  delivery_time_slots: unknown;
  order_items: unknown;
  customers: unknown;
};

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ref?: string; amt?: string }>;
}) {
  const { id } = await params;
  const { ref, amt } = await searchParams;
  if (!UUID.test(id)) notFound();

  // Orders are private, so read with the service role. The order id in the URL is
  // a random UUID that only the customer who placed the order has.
  const supabase = createAdminClient();
  const [{ data: found, error }, { data: settings }] = await Promise.all([
    supabase
      .from("orders")
      .select("order_ref, status, delivery_date, subtotal_cents, pet_name, delivery_time_slots(label), order_items(product_name, quantity, unit_price_cents), customers(full_name, email)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("store_settings").select("store_name, paynow_uen, paynow_qr_url").maybeSingle(),
  ]);

  // If the order can't be read (usually SUPABASE_SERVICE_ROLE_KEY holds the wrong key in
  // Vercel), still show the payment QR from the ref and amount the checkout passed along.
  let order: OrderView | null = found;
  let problem = "";
  if (!order) {
    problem = error
      ? `${error.code ?? "error"}: ${error.message}`
      : process.env.SUPABASE_SERVICE_ROLE_KEY === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
          process.env.SUPABASE_SERVICE_ROLE_KEY?.startsWith("sb_publishable_")
        ? "service key is the public key"
        : "order not readable";
    console.error(`Order page could not load order ${id}: ${problem}`);
    const amount = parseInt(amt ?? "", 10);
    if (!ref || !/^RL\d+$/.test(ref) || !Number.isFinite(amount) || amount < 0) notFound();
    order = {
      order_ref: ref,
      status: "pending_payment",
      delivery_date: null,
      subtotal_cents: amount,
      pet_name: null,
      delivery_time_slots: null,
      order_items: [],
      customers: null,
    };
  }

  const uen = settings?.paynow_uen?.trim();
  const isSample = !uen && !settings?.paynow_qr_url;
  const qrSrc =
    uen || isSample
      ? await QRCode.toDataURL(
          paynowPayload({
            proxy: uen || SAMPLE_UEN,
            amountCents: order.subtotal_cents,
            reference: order.order_ref,
            merchantName: settings?.store_name || "Rollie",
          }),
          { margin: 1, width: 320, color: { dark: "#7a1fa2" } },
        )
      : settings!.paynow_qr_url!;

  const slot = order.delivery_time_slots as unknown as { label: string } | null;
  const customer = order.customers as unknown as { full_name: string; email: string } | null;
  const items = (order.order_items ?? []) as { product_name: string; quantity: number; unit_price_cents: number }[];
  const deliveryDay = order.delivery_date
    ? new Date(`${order.delivery_date}T00:00:00Z`).toLocaleDateString("en-SG", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      })
    : null;

  return (
    <div className="max-w-md mx-auto space-y-6">
      <section className="text-center space-y-1">
        <p className="text-sm opacity-70">Thank you{customer ? `, ${customer.full_name.split(" ")[0]}` : ""}!</p>
        <h1 className="text-2xl font-bold">Order {order.order_ref}</h1>
        {order.status === "pending_payment" && <p className="opacity-75">Your treats are reserved. Please pay to confirm.</p>}
        {order.status === "paid" && <p className="text-green-700 font-medium">Payment received. See you on delivery day!</p>}
        {order.status === "delivered" && <p className="text-green-700 font-medium">Delivered. Enjoy!</p>}
        {order.status === "cancelled" && <p className="text-red-700 font-medium">This order was cancelled.</p>}
      </section>

      {order.status === "pending_payment" && (
        <section className="rounded-xl bg-white shadow-sm p-5 space-y-4 text-center">
          <h2 className="font-semibold">Pay {formatPrice(order.subtotal_cents)} by PayNow</h2>
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc} alt="PayNow QR code" width={260} height={260} className="mx-auto" />
            {isSample && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="rotate-[-12deg] rounded bg-red-600/90 text-white text-sm font-bold px-3 py-1">
                  SAMPLE · DO NOT PAY
                </span>
              </span>
            )}
          </div>
          <ol className="text-sm text-left space-y-1 list-decimal list-inside">
            <li>Open your banking app and scan this QR code. On a phone, screenshot it and scan it from your photos.</li>
            <li>
              Check the amount is <strong>{formatPrice(order.subtotal_cents)}</strong>
              {uen ? " (filled in for you)" : ""}.
            </li>
            <li>
              Put <strong>{order.order_ref}</strong> in the reference or comments field.
            </li>
          </ol>
          {uen && <p className="text-xs opacity-60">PayNow UEN / number: {uen}</p>}
          {isSample && (
            <p className="rounded-lg bg-amber-100 text-amber-900 px-3 py-2 text-xs">
              Our PayNow details are still being set up. Please hold off paying, and we&apos;ll be in touch.
            </p>
          )}
          <p className="text-xs opacity-70">
            Once we&apos;ve checked your payment, we&apos;ll email a confirmation{customer ? ` to ${customer.email}` : ""}.
          </p>
        </section>
      )}

      {deliveryDay ? (
        <section className="rounded-xl bg-white shadow-sm p-5 space-y-3 text-sm">
          <h2 className="font-semibold">Delivery</h2>
          <p>
            {deliveryDay}
            {slot ? `, ${slot.label}` : ""}
          </p>
          <h2 className="font-semibold pt-2">Treats{order.pet_name ? ` for ${order.pet_name}` : ""}</h2>
          <ul className="space-y-1">
            {items.map((i) => (
              <li key={i.product_name} className="flex justify-between">
                <span>
                  {i.product_name} × {i.quantity}
                </span>
                <span>{formatPrice(i.unit_price_cents * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between font-semibold border-t border-black/5 pt-2">
            <span>Total</span>
            <span>{formatPrice(order.subtotal_cents)}</span>
          </div>
        </section>
      ) : (
        <p className="text-center text-sm opacity-75">
          Your delivery day and treats are saved with your order.
          {problem && <span className="block text-xs opacity-50 pt-1">({problem})</span>}
        </p>
      )}

      <p className="text-center text-xs opacity-60">Bookmark or screenshot this page to come back to it.</p>
    </div>
  );
}
