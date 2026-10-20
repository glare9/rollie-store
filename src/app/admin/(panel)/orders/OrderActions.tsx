"use client";

import { useState, useTransition } from "react";
import type { OrderStatus } from "@/lib/types";
import { cancelOrder, markDelivered, markPaid, resendConfirmation, type ActionResult } from "./actions";

export function OrderActions({
  orderId,
  orderRef,
  status,
  emailSent,
  compact,
}: {
  orderId: string;
  orderRef: string;
  status: OrderStatus;
  emailSent: boolean;
  compact?: boolean;
}) {
  const [result, setResult] = useState<ActionResult>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: (id: string) => Promise<ActionResult>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setResult(null);
    startTransition(async () => {
      const r = await action(orderId);
      setResult(r);
      // In the orders list the row can drop out of view once its status changes, so don't let a problem go unseen.
      if (compact && r && !r.ok) window.alert(r.message);
    });
  };

  const btn = "rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50";
  return (
    <div className="space-y-2">
      <div className={`flex flex-wrap gap-2 ${compact ? "justify-end" : ""}`}>
        {status === "pending_payment" && (
          <button
            disabled={pending}
            className={`${btn} bg-green-700 text-white`}
            onClick={() => run(markPaid, `Have you received the PayNow payment for ${orderRef}? The customer will be emailed a confirmation.`)}
          >
            Payment validated
          </button>
        )}
        {status === "paid" && (
          <button disabled={pending} className={`${btn} bg-brand-dark text-white`} onClick={() => run(markDelivered)}>
            Mark delivered
          </button>
        )}
        {!compact && status !== "pending_payment" && status !== "cancelled" && (
          <button
            disabled={pending}
            className={`${btn} bg-white shadow-sm`}
            onClick={() => run(resendConfirmation, emailSent ? `Send the confirmation email for ${orderRef} again?` : undefined)}
          >
            {emailSent ? "Resend confirmation email" : "Send confirmation email"}
          </button>
        )}
        {!compact && (status === "pending_payment" || status === "paid") && (
          <button
            disabled={pending}
            className={`${btn} bg-white shadow-sm text-red-700`}
            onClick={() =>
              run(cancelOrder, `Cancel ${orderRef}? Its treats go back into stock and the delivery spot is freed. This can't be undone.`)
            }
          >
            Cancel order
          </button>
        )}
      </div>
      {pending && <p className="text-xs opacity-60">Working…</p>}
      {result && <p className={`text-xs ${result.ok ? "text-green-700" : "text-red-700"}`}>{result.message}</p>}
    </div>
  );
}
