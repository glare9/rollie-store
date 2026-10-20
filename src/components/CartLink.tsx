"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";

export function CartLink() {
  const { count } = useCart();
  return (
    <Link href="/cart" className="relative rounded-full bg-white shadow-sm px-4 py-1.5 text-sm font-medium">
      Cart
      {count > 0 && (
        <span className="ml-2 inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-brand-dark text-white text-xs px-1.5">
          {count}
        </span>
      )}
    </Link>
  );
}
