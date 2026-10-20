"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCart, type CartLine } from "@/lib/cart";
import { formatPrice, type DeliveryDay, type DeliverySlot, type Product } from "@/lib/types";
import { placeOrder, type CheckoutDetails } from "./actions";

const DETAILS_KEY = "rollie-details";
const emptyDetails: CheckoutDetails = {
  full_name: "",
  pet_name: "",
  email: "",
  phone: "",
  address: "",
  postal_code: "",
  note: "",
};

const formatDay = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return {
    weekday: date.toLocaleDateString("en-SG", { weekday: "short", timeZone: "UTC" }),
    day: date.toLocaleDateString("en-SG", { day: "numeric", month: "short", timeZone: "UTC" }),
  };
};

export function CheckoutForm({
  products,
  days,
  slots,
  buyNow,
}: {
  products: Product[];
  days: DeliveryDay[];
  slots: DeliverySlot[];
  buyNow?: CartLine[];
}) {
  const router = useRouter();
  const cart = useCart();
  const [details, setDetails] = useState<CheckoutDetails>(emptyDetails);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliverySlot, setDeliverySlot] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  // Remember returning customers' details on this device (never the note).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(DETAILS_KEY) ?? "null");
      if (saved) setDetails((d) => ({ ...d, ...saved, note: "" }));
    } catch {}
  }, []);

  const items = buyNow ?? cart.lines;
  const rows = items
    .map((l) => ({ ...l, product: products.find((p) => p.id === l.productId) }))
    .filter((r) => r.product);
  const subtotal = rows.reduce((sum, r) => sum + r.product!.price_cents * r.quantity, 0);

  if (!buyNow && !cart.ready) return null;
  if (rows.length === 0) {
    return (
      <div className="rounded-xl bg-white shadow-sm p-8 text-center space-y-4">
        <p>Your cart is empty.</p>
        <Link href="/" className="inline-block rounded-full bg-brand-dark text-white font-semibold px-6 py-2">
          See the treats
        </Link>
      </div>
    );
  }

  const field = (key: keyof CheckoutDetails) => ({
    value: details[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDetails((d) => ({ ...d, [key]: e.target.value })),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await placeOrder({
        details,
        items: rows.map((r) => ({ productId: r.productId, quantity: r.quantity })),
        deliveryDate,
        deliverySlot,
      });
      if (!result.ok) {
        setError(result.error);
        router.refresh(); // pick up any day that just filled up or stock that just ran out
        return;
      }
      try {
        localStorage.setItem(DETAILS_KEY, JSON.stringify({ ...details, note: undefined }));
      } catch {}
      if (!buyNow) cart.clear();
      // Ref and amount ride along so the payment QR still shows if the order can't be read back.
      router.push(`/order/${result.orderId}?ref=${encodeURIComponent(result.orderRef)}&amt=${result.subtotalCents}`);
    });
  };

  const input = "w-full rounded-lg border border-black/15 bg-white px-3 py-2";
  const section = "rounded-xl bg-white shadow-sm p-5 space-y-4";

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className={section}>
        <h2 className="font-semibold">Your order</h2>
        <ul className="space-y-1 text-sm">
          {rows.map(({ product: p, quantity }) => (
            <li key={p!.id} className="flex justify-between">
              <span>
                {p!.name} × {quantity}
              </span>
              <span>{formatPrice(p!.price_cents * quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between font-semibold border-t border-black/5 pt-3">
          <span>Total</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        {buyNow ? (
          <p className="text-xs opacity-60">Buying this treat on its own. Your cart is kept for later.</p>
        ) : (
          <Link href="/cart" className="text-xs underline opacity-70">
            Edit cart
          </Link>
        )}
      </section>

      <section className={section}>
        <h2 className="font-semibold">Your details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span>Your name</span>
            <input required autoComplete="name" className={input} {...field("full_name")} />
          </label>
          <label className="space-y-1 text-sm">
            <span>Pet&apos;s name</span>
            <input className={input} {...field("pet_name")} placeholder="Optional" />
          </label>
          <label className="space-y-1 text-sm">
            <span>Email</span>
            <input required type="email" autoComplete="email" className={input} {...field("email")} />
          </label>
          <label className="space-y-1 text-sm">
            <span>Phone</span>
            <input required type="tel" autoComplete="tel" inputMode="tel" className={input} {...field("phone")} placeholder="9123 4567" />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span>Delivery address</span>
            <input required autoComplete="street-address" className={input} {...field("address")} placeholder="Block, street, unit number" />
          </label>
          <label className="space-y-1 text-sm">
            <span>Postal code</span>
            <input required autoComplete="postal-code" inputMode="numeric" maxLength={6} className={input} {...field("postal_code")} />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span>Note for us</span>
            <textarea rows={2} className={input} {...field("note")} placeholder="Optional, e.g. allergies or delivery instructions" />
          </label>
        </div>
      </section>

      <section className={section}>
        <h2 className="font-semibold">Delivery day</h2>
        {days.length === 0 ? (
          <p className="text-sm opacity-75">No delivery days are open right now. Please check back soon.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {days.map((d) => {
              const { weekday, day } = formatDay(d.delivery_date);
              const selected = deliveryDate === d.delivery_date;
              return (
                <button
                  key={d.delivery_date}
                  type="button"
                  disabled={d.is_full}
                  onClick={() => setDeliveryDate(d.delivery_date)}
                  aria-pressed={selected}
                  className={`rounded-lg border px-2 py-2 text-sm text-center ${
                    d.is_full
                      ? "border-black/5 bg-black/5 opacity-50 cursor-not-allowed"
                      : selected
                        ? "border-brand-dark bg-brand-dark text-white"
                        : "border-black/15 hover:border-brand-dark"
                  }`}
                >
                  <span className="block font-semibold">{weekday}</span>
                  <span className="block">{day}</span>
                  {d.is_full && <span className="block text-xs">Full</span>}
                </button>
              );
            })}
          </div>
        )}

        <h2 className="font-semibold pt-2">Delivery time</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {slots.map((s) => (
            <label
              key={s.code}
              className={`rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                deliverySlot === s.code ? "border-brand-dark bg-brand-dark text-white" : "border-black/15 hover:border-brand-dark"
              }`}
            >
              <input
                type="radio"
                name="slot"
                value={s.code}
                checked={deliverySlot === s.code}
                onChange={() => setDeliverySlot(s.code)}
                className="sr-only"
              />
              {s.label}
            </label>
          ))}
        </div>
      </section>

      {error && <p className="rounded-lg bg-red-50 text-red-800 px-4 py-3 text-sm" role="alert">{error}</p>}

      <button
        type="submit"
        disabled={pending || !deliveryDate || !deliverySlot}
        className="w-full rounded-full bg-brand-dark text-white font-semibold py-3 disabled:opacity-40"
      >
        {pending ? "Placing order…" : `Place order and pay ${formatPrice(subtotal)} by PayNow`}
      </button>
      {(!deliveryDate || !deliverySlot) && (
        <p className="text-center text-xs opacity-60">Choose a delivery day and time to continue.</p>
      )}
    </form>
  );
}
