import type { OrderStatus } from "./types";

export const statusLabel: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const statusClass: Record<OrderStatus, string> = {
  pending_payment: "bg-amber-100 text-amber-900",
  paid: "bg-green-100 text-green-900",
  delivered: "bg-sky-100 text-sky-900",
  cancelled: "bg-black/5 text-black/50",
};

export const formatShortDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-SG", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-SG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Singapore" });

export const todaySG = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" }); // YYYY-MM-DD
