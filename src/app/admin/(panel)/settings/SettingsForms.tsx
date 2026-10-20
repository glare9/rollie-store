"use client";

import { useActionState } from "react";
import { addClosedDate, updateSettings, type FormResult } from "./actions";

const input = "w-full rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm";

export type Settings = {
  store_name: string;
  daily_order_cap: number;
  min_lead_days: number;
  max_advance_days: number;
  paynow_uen: string | null;
  paynow_qr_url: string | null;
  admin_email: string | null;
};

function Result({ result }: { result: FormResult }) {
  return result ? <p className={`text-xs ${result.ok ? "text-green-700" : "text-red-700"}`}>{result.message}</p> : null;
}

export function SettingsForm({ settings }: { settings: Settings }) {
  const [result, action, pending] = useActionState<FormResult, FormData>(updateSettings, null);
  return (
    <form action={action} className="rounded-xl bg-white shadow-sm p-5 grid gap-4 sm:grid-cols-3">
      <h2 className="sm:col-span-3 font-semibold">Payment</h2>
      <label className="space-y-1">
        <span className="text-xs opacity-70">PayNow UEN or mobile number</span>
        <input name="paynow_uen" defaultValue={settings.paynow_uen ?? ""} placeholder="e.g. 53412345A or 91234567" className={input} />
      </label>
      <label className="sm:col-span-2 space-y-1">
        <span className="text-xs opacity-70">Or a fixed PayNow QR image link (only used if UEN is empty)</span>
        <input name="paynow_qr_url" defaultValue={settings.paynow_qr_url ?? ""} className={input} />
      </label>

      <h2 className="sm:col-span-3 font-semibold pt-2">Delivery</h2>
      <label className="space-y-1">
        <span className="text-xs opacity-70">Orders per delivery day</span>
        <input name="daily_order_cap" type="number" min={0} required defaultValue={settings.daily_order_cap} className={input} />
      </label>
      <label className="space-y-1">
        <span className="text-xs opacity-70">Earliest booking (days from today)</span>
        <input name="min_lead_days" type="number" min={0} required defaultValue={settings.min_lead_days} className={input} />
      </label>
      <label className="space-y-1">
        <span className="text-xs opacity-70">Latest booking (days from today)</span>
        <input name="max_advance_days" type="number" min={1} required defaultValue={settings.max_advance_days} className={input} />
      </label>

      <h2 className="sm:col-span-3 font-semibold pt-2">Store</h2>
      <label className="space-y-1">
        <span className="text-xs opacity-70">Store name (on the PayNow QR and emails)</span>
        <input name="store_name" defaultValue={settings.store_name} className={input} />
      </label>
      <label className="sm:col-span-2 space-y-1">
        <span className="text-xs opacity-70">Your email (customers&apos; replies to confirmation emails go here)</span>
        <input name="admin_email" type="email" defaultValue={settings.admin_email ?? ""} className={input} />
      </label>

      <div className="sm:col-span-3 flex items-center gap-3">
        <button disabled={pending} className="rounded-lg bg-brand-dark text-white text-sm font-medium px-4 py-1.5 disabled:opacity-60">
          {pending ? "Saving…" : "Save settings"}
        </button>
        <Result result={result} />
      </div>
    </form>
  );
}

export function ClosedDateForm() {
  const [result, action, pending] = useActionState<FormResult, FormData>(addClosedDate, null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <label className="space-y-1">
        <span className="block text-xs opacity-70">Weekend day</span>
        <input name="date" type="date" required className={input} />
      </label>
      <label className="space-y-1 flex-1 min-w-40">
        <span className="block text-xs opacity-70">Reason (only you see this)</span>
        <input name="reason" className={input} />
      </label>
      <button disabled={pending} className="rounded-lg bg-white shadow-sm text-sm font-medium px-4 py-1.5 disabled:opacity-60">
        Close day
      </button>
      <div className="w-full">
        <Result result={result} />
      </div>
    </form>
  );
}
