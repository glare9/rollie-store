import { createAdminClient } from "@/lib/supabase/admin";
import { formatShortDay, todaySG } from "@/lib/admin-format";
import type { DeliveryDay } from "@/lib/types";
import { removeClosedDate } from "./actions";
import { ClosedDateForm, SettingsForm, type Settings } from "./SettingsForms";

export const dynamic = "force-dynamic";

export default async function AdminSettings() {
  const supabase = createAdminClient();
  const [{ data: settings, error }, { data: closed }, { data: days }] = await Promise.all([
    supabase.from("store_settings").select("*").single(),
    supabase.from("delivery_closed_dates").select("date, reason").gte("date", todaySG()).order("date"),
    supabase.rpc("delivery_availability"),
  ]);
  if (error || !settings) {
    return <p className="rounded-lg bg-red-100 text-red-900 px-4 py-3 text-sm">Couldn&apos;t load settings: {error?.message}</p>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <SettingsForm settings={settings as Settings} />

      <section className="rounded-xl bg-white shadow-sm p-5 space-y-4">
        <h2 className="font-semibold">Bookable weekend days</h2>
        <ul className="flex flex-wrap gap-2 text-sm">
          {((days ?? []) as DeliveryDay[]).map((d) => (
            <li key={d.delivery_date} className={`rounded-lg px-3 py-1 ${d.is_full ? "bg-red-100 text-red-900" : "bg-black/5"}`}>
              {formatShortDay(d.delivery_date)} · {d.booked}/{d.cap}
            </li>
          ))}
        </ul>

        <h2 className="font-semibold pt-2">Days you&apos;re not delivering</h2>
        {!closed?.length && <p className="text-sm opacity-70">None coming up.</p>}
        <ul className="space-y-1 text-sm">
          {(closed ?? []).map((c) => (
            <li key={c.date} className="flex items-center gap-3">
              <span>
                {formatShortDay(c.date)}
                {c.reason && <span className="opacity-60"> · {c.reason}</span>}
              </span>
              <form action={removeClosedDate.bind(null, c.date)}>
                <button className="text-xs text-red-700 underline underline-offset-2">Reopen</button>
              </form>
            </li>
          ))}
        </ul>
        <ClosedDateForm />
        <p className="text-xs opacity-60">Closing a day doesn&apos;t cancel orders already booked on it.</p>
      </section>
    </div>
  );
}
