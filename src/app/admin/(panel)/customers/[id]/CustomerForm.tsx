"use client";

import { useActionState } from "react";
import type { Customer } from "@/lib/types";
import { updateCustomer, type FormResult } from "../actions";

const input = "w-full rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm";

export function CustomerForm({ customer }: { customer: Customer }) {
  const [result, action, pending] = useActionState<FormResult, FormData>(updateCustomer, null);
  return (
    <form action={action} className="rounded-xl bg-white shadow-sm p-5 grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={customer.id} />
      <label className="space-y-1">
        <span className="text-xs opacity-70">Name</span>
        <input name="full_name" required defaultValue={customer.full_name} className={input} />
      </label>
      <label className="space-y-1">
        <span className="text-xs opacity-70">Pet name</span>
        <input name="pet_name" defaultValue={customer.pet_name ?? ""} className={input} />
      </label>
      <label className="space-y-1">
        <span className="text-xs opacity-70">Email (used to recognise returning customers)</span>
        <input value={customer.email} readOnly className={`${input} opacity-60`} />
      </label>
      <label className="space-y-1">
        <span className="text-xs opacity-70">Phone</span>
        <input name="phone" required defaultValue={customer.phone} className={input} />
      </label>
      <label className="space-y-1">
        <span className="text-xs opacity-70">Address</span>
        <input name="address" required defaultValue={customer.address} className={input} />
      </label>
      <label className="space-y-1">
        <span className="text-xs opacity-70">Postal code</span>
        <input name="postal_code" defaultValue={customer.postal_code ?? ""} className={input} />
      </label>
      <label className="sm:col-span-2 space-y-1">
        <span className="text-xs opacity-70">Notes (only you see these: allergies, preferences, birthdays…)</span>
        <textarea name="notes" rows={3} defaultValue={customer.notes ?? ""} className={input} />
      </label>
      <div className="sm:col-span-2 flex items-center gap-3">
        <button disabled={pending} className="rounded-lg bg-brand-dark text-white text-sm font-medium px-4 py-1.5 disabled:opacity-60">
          {pending ? "Saving…" : "Save"}
        </button>
        {result && <p className={`text-xs ${result.ok ? "text-green-700" : "text-red-700"}`}>{result.message}</p>}
      </div>
    </form>
  );
}
