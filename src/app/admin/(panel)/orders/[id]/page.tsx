import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime, formatShortDay, statusClass, statusLabel } from "@/lib/admin-format";
import { formatPrice, type OrderStatus } from "@/lib/types";
import { OrderActions } from "../OrderActions";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from("orders")
    .select("*, delivery_time_slots(label), order_items(product_name, quantity, unit_price_cents), customers(id, full_name, email, phone, pet_name)")
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();

  const status = order.status as OrderStatus;
  const customer = order.customers as { id: string; full_name: string; email: string; phone: string; pet_name: string | null };
  const items = order.order_items as { product_name: string; quantity: number; unit_price_cents: number }[];
  const slot = order.delivery_time_slots as { label: string } | null;

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/admin" className="text-sm opacity-70 hover:opacity-100">
        ← All orders
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{order.order_ref}</h1>
        <span className={`rounded-full px-2 py-0.5 text-sm ${statusClass[status]}`}>{statusLabel[status]}</span>
        {status === "paid" && !order.confirmation_email_sent_at && (
          <span className="rounded-full px-2 py-0.5 text-sm bg-red-100 text-red-900">Confirmation email not sent</span>
        )}
      </div>

      <OrderActions
        orderId={order.id}
        orderRef={order.order_ref}
        status={status}
        emailSent={Boolean(order.confirmation_email_sent_at)}
      />

      <section className="rounded-xl bg-white shadow-sm p-5 grid gap-4 sm:grid-cols-2 text-sm">
        <div className="space-y-1">
          <h2 className="font-semibold">Customer</h2>
          <p>
            <Link href={`/admin/customers/${customer.id}`} className="underline underline-offset-2">
              {customer.full_name}
            </Link>
          </p>
          <p>
            <a href={`mailto:${customer.email}`} className="underline underline-offset-2">
              {customer.email}
            </a>
          </p>
          <p>
            <a href={`tel:${customer.phone}`}>{customer.phone}</a> ·{" "}
            <a href={`https://wa.me/65${customer.phone}`} className="underline underline-offset-2" target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          </p>
          {order.pet_name && <p>Pet: {order.pet_name}</p>}
        </div>
        <div className="space-y-1">
          <h2 className="font-semibold">Delivery</h2>
          <p>
            {formatShortDay(order.delivery_date)}, {slot?.label}
          </p>
          <p>{order.delivery_address}</p>
          {order.customer_note && <p className="rounded-lg bg-amber-50 px-2 py-1">Note: {order.customer_note}</p>}
        </div>
      </section>

      <section className="rounded-xl bg-white shadow-sm p-5 space-y-2 text-sm">
        <h2 className="font-semibold">Treats</h2>
        <ul className="space-y-1">
          {items.map((i) => (
            <li key={i.product_name} className="flex justify-between">
              <span>
                {i.product_name} × {i.quantity} <span className="opacity-60">@ {formatPrice(i.unit_price_cents)}</span>
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

      <section className="text-xs opacity-70 space-y-1">
        <p>Placed {formatDateTime(order.created_at)}</p>
        {order.payment_validated_at && <p>Payment validated {formatDateTime(order.payment_validated_at)}</p>}
        {order.confirmation_email_sent_at && <p>Confirmation email sent {formatDateTime(order.confirmation_email_sent_at)}</p>}
        <p>
          <Link href={`/order/${order.id}`} className="underline underline-offset-2" target="_blank">
            Customer&apos;s payment page
          </Link>
        </p>
      </section>
    </div>
  );
}
