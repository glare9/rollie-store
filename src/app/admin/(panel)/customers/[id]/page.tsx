import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatShortDay, statusClass, statusLabel } from "@/lib/admin-format";
import { formatPrice, type Customer, type OrderStatus } from "@/lib/types";
import { CustomerForm } from "./CustomerForm";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminCustomer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = createAdminClient();
  const [{ data: customer }, { data: orders }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("orders")
      .select("id, order_ref, status, delivery_date, subtotal_cents, pet_name, order_items(product_name, quantity)")
      .eq("customer_id", id)
      .order("delivery_date", { ascending: false }),
  ]);
  if (!customer) notFound();
  const c = customer as Customer;

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/admin/customers" className="text-sm opacity-70 hover:opacity-100">
        ← All customers
      </Link>
      <div>
        <h1 className="text-2xl font-bold">{c.full_name}</h1>
        <p className="text-sm opacity-70">
          {c.pet_name ? `${c.pet_name}'s human · ` : ""}
          <a href={`mailto:${c.email}`} className="underline underline-offset-2">
            {c.email}
          </a>{" "}
          ·{" "}
          <a href={`https://wa.me/65${c.phone}`} className="underline underline-offset-2" target="_blank" rel="noreferrer">
            WhatsApp {c.phone}
          </a>
        </p>
      </div>

      <CustomerForm customer={c} />

      <section className="space-y-2">
        <h2 className="font-semibold">Orders</h2>
        {!orders?.length && <p className="text-sm opacity-70">No orders.</p>}
        <ul className="space-y-2">
          {(orders ?? []).map((o) => (
            <li key={o.id} className="rounded-xl bg-white shadow-sm px-4 py-3 text-sm flex flex-wrap justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Link href={`/admin/orders/${o.id}`} className="font-semibold underline-offset-2 hover:underline">
                    {o.order_ref}
                  </Link>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass[o.status as OrderStatus]}`}>
                    {statusLabel[o.status as OrderStatus]}
                  </span>
                  <span className="opacity-70">{formatShortDay(o.delivery_date)}</span>
                </div>
                <p className="opacity-70">
                  {(o.order_items as { product_name: string; quantity: number }[]).map((i) => `${i.product_name} × ${i.quantity}`).join(", ")}
                </p>
              </div>
              <span className="font-medium">{formatPrice(o.subtotal_cents)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
