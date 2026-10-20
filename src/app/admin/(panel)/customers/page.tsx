import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatShortDay } from "@/lib/admin-format";
import { formatPrice } from "@/lib/types";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  pet_name: string | null;
  postal_code: string | null;
  notes: string | null;
  orders: { status: string; subtotal_cents: number; delivery_date: string }[];
};

export default async function AdminCustomers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const supabase = createAdminClient();
  let query = supabase
    .from("customers")
    .select("id, full_name, email, phone, pet_name, postal_code, notes, orders(status, subtotal_cents, delivery_date)")
    .order("created_at", { ascending: false })
    .limit(500);
  const term = q.trim().replace(/[,()*%\\]/g, " ").trim();
  if (term) {
    const like = `%${term}%`;
    query = query.or(`full_name.ilike.${like},email.ilike.${like},phone.ilike.${like},pet_name.ilike.${like},postal_code.ilike.${like}`);
  }
  const { data, error } = await query;
  const customers = (data ?? []) as Row[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">Customers</h1>
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Name, pet, email, phone or postal code"
            className="w-72 max-w-full rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm"
          />
          <button className="rounded-lg bg-white shadow-sm px-3 py-1.5 text-sm">Search</button>
        </form>
      </div>
      {error && <p className="rounded-lg bg-red-100 text-red-900 px-4 py-3 text-sm">Couldn&apos;t load customers: {error.message}</p>}
      {!error && customers.length === 0 && <p className="opacity-70">{term ? "No customers match that search." : "No customers yet."}</p>}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="text-left text-xs opacity-60">
            <tr>
              <th className="px-4 py-2 font-medium">Customer</th>
              <th className="px-4 py-2 font-medium">Pet</th>
              <th className="px-4 py-2 font-medium">Contact</th>
              <th className="px-4 py-2 font-medium text-right">Orders</th>
              <th className="px-4 py-2 font-medium text-right">Spent</th>
              <th className="px-4 py-2 font-medium">Last delivery</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => {
              const live = c.orders.filter((o) => o.status !== "cancelled");
              const spent = live.filter((o) => o.status !== "pending_payment").reduce((s, o) => s + o.subtotal_cents, 0);
              const last = live.map((o) => o.delivery_date).sort().at(-1);
              return (
                <tr key={c.id} className="border-t border-black/5 align-top">
                  <td className="px-4 py-2">
                    <Link href={`/admin/customers/${c.id}`} className="font-medium underline-offset-2 hover:underline">
                      {c.full_name}
                    </Link>
                    {c.notes && <p className="text-xs opacity-60 line-clamp-1">{c.notes}</p>}
                  </td>
                  <td className="px-4 py-2">{c.pet_name}</td>
                  <td className="px-4 py-2">
                    <p>{c.email}</p>
                    <p className="opacity-70">{c.phone}</p>
                  </td>
                  <td className="px-4 py-2 text-right">{live.length}</td>
                  <td className="px-4 py-2 text-right">{formatPrice(spent)}</td>
                  <td className="px-4 py-2">{last ? formatShortDay(last) : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs opacity-60">&ldquo;Spent&rdquo; counts paid and delivered orders.</p>
    </div>
  );
}
