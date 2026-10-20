"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Orders", match: (p: string) => p === "/admin" || p.startsWith("/admin/orders") },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1">
      {links.map((l) => {
        const active = l.match ? l.match(pathname) : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${active ? "bg-brand-dark text-white" : "bg-white shadow-sm"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
