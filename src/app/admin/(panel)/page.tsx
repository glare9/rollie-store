import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatShortDay, statusClass, statusLabel, todaySG } from "@/lib/admin-format";
import { formatPrice, type OrderStatus } from "@/lib/types";
import { OrderActions } from "./orders/OrderActions";

export const dynamic = "force-dynamic";

const views = {
  open: { label: "To do", statuses: ["pending_payment", "paid"] },
  pending_payment: { label: "Awaiting payment", statuses: ["pending_payment"] },
  paid: { label: "To deliver", statuses: ["paid"] },
  delivered: { label: "Delivered", statuses: ["delivered"] },
  cancelled: { label: "Cancelled", statuses: ["cancelled"] },
  all: { label: "All", statuses: ["pending_payment", "paid", "delivered", "cancelled"] },
} satisfies Record<string, { label: string; statuses: OrderStatus[] }>;
type View = keyof typeof views;

type Row = {
  id: string;
  order_ref: string;
  status: OrderStatus;
  delivery_date: string;
  delivery_address: string;
  pet_name: string | null;
  subtotal_cents: number;
  confirmation_email_sent_at: string | null;
  delivery_time_slots: { label: string; sort_order: number } | null;
  customers: { id: string; full_name: string; phone: string } | null;
  order_items: { product_name: string; quantity: number }[];
};

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view: rawView } = await searchParams;
  const view: View = rawView && rawView in views ? (rawView as View) : "open";

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_ref, status, delivery_date, delivery_address, pet_name, subtotal_cents, confirmation_email_sent_at, delivery_time_slots(label, sort_order), customers(id, full_name, phone), order_items(product_name, quantity)")
    .in("status", views[view].statuses)
    .order("delivery_date", { ascending: view === "open" || view === "pending_payment" || view === "paid" })
    .order("created_at")
    .limit(500);
  const orders = (data ?? []) as unknown as Row[];

  // Group by delivery day, slots in order, so this doubles as the delivery run sheet.
  const days = new Map<string, Row[]>();
  for (const o of orders) days.set(o.delivery_date, [...(days.get(o.delivery_date) ?? []), o]);
  for (const list of days.values())
    list.sort((a, b) => (a.delivery_time_slots?.sort_order ?? 0) - (b.delivery_time_slots?.sort_order ?? 0));
  const today = todaySG();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 text-sm">
        {(Object.keys(views) as View[]).map((v) => (
          <Link
            key={v}
            href={v === "open" ? "/admin" : `/admin?view=${v}`}
            className={`rounded-lg px-3 py-1 ${v === view ? "bg-foreground text-white" : "bg-white shadow-sm"}`}
          >
            {views[v].label}
          </Link>
        ))}
      </div>

      {error && <p className="rounded-lg bg-red-100 text-red-900 px-4 py-3 text-sm">Couldn&apos;t load orders: {error.message}</p>}
      {!error && orders.length === 0 && <p className="opacity-70">No orders here.</p>}

      {[...days.entries()].map(([day, list]) => {
        const live = list.filter((o) => o.status !== "cancelled");
        const totals = new Map<string, number>();
        for (const o of live) for (const i of o.order_items) totals.set(i.product_name, (totals.get(i.product_name) ?? 0) + i.quantity);
        return (
          <section key={day} className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">
                {formatShortDay(day)}
                {day < today && <span className="ml-2 text-xs font-normal opacity-60">past</span>}
              </h2>
              <p className="text-xs opacity-70">
                {live.length} order{live.length === 1 ? "" : "s"}
                {totals.size > 0 && ` · ${[...totals].map(([n, q]) => `${q} × ${n}`).join(", ")}`}
              </p>
            </div>
            <ul className="space-y-2">
              {list.map((o) => (
                <li key={o.id} className="rounded-xl bg-white shadow-sm p-4 flex flex-wrap gap-3 justify-between">
                  <div className="space-y-1 text-sm min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/orders/${o.id}`} className="font-semibold underline-offset-2 hover:underline">
                        {o.order_ref}
                      </Link>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass[o.status]}`}>{statusLabel[o.status]}</span>
                      <span className="opacity-70">{o.delivery_time_slots?.label}</span>
                      {o.status === "paid" && !o.confirmation_email_sent_at && (
                        <span className="rounded-full px-2 py-0.5 text-xs bg-red-100 text-red-900">Email not sent</span>
                      )}
                    </div>
                    <p>
                      {o.customers?.full_name}
                      {o.pet_name && <span className="opacity-70"> · for {o.pet_name}</span>}
                      {o.customers?.phone && <span className="opacity-70"> · {o.customers.phone}</span>}
                    </p>
                    <p className="opacity-70">{o.delivery_address}</p>
                    <p className="opacity-70">
                      {o.order_items.map((i) => `${i.product_name} × ${i.quantity}`).join(", ")} · <strong>{formatPrice(o.subtotal_cents)}</strong>
                    </p>
                  </div>
                  <div className="self-center">
                    <OrderActions
                      orderId={o.id}
                      orderRef={o.order_ref}
                      status={o.status}
                      emailSent={Boolean(o.confirmation_email_sent_at)}
                      compact
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
