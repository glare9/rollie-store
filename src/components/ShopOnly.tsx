"use client";

import { usePathname } from "next/navigation";

// Hides shop-only header bits (cart, delivery note) on the admin pages.
export function ShopOnly({ children }: { children: React.ReactNode }) {
  return usePathname().startsWith("/admin") ? null : <>{children}</>;
}
