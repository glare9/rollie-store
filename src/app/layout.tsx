import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CartProvider } from "@/lib/cart";
import { CartLink } from "@/components/CartLink";
import { ShopOnly } from "@/components/ShopOnly";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rollie · Seasonal pet treats",
  description: "Small-batch seasonal treats for your pets, delivered on weekends.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col">
        <CartProvider>
          <header className="border-b border-black/5">
            <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
              <Link href="/">
                <Image src="/rollie-logo.svg" alt="Rollie" width={120} height={36} priority />
              </Link>
              <ShopOnly>
                <div className="flex items-center gap-4">
                  <span className="hidden sm:inline text-sm opacity-70">Weekend delivery only</span>
                  <CartLink />
                </div>
              </ShopOnly>
            </div>
          </header>
          <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8">{children}</main>
          <footer className="text-center text-xs opacity-60 py-6">© {new Date().getFullYear()} Rollie</footer>
        </CartProvider>
      </body>
    </html>
  );
}
