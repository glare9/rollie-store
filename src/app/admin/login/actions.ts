"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, ADMIN_COOKIE_MAX_AGE, adminToken, safeEqual } from "@/lib/admin-auth";

export async function signIn(_prev: string, formData: FormData): Promise<string> {
  const password = String(formData.get("password") ?? "");
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return "Admin sign-in isn't set up yet. Add ADMIN_PASSWORD in Vercel and redeploy.";
  if (!safeEqual(password, expected)) return "That password isn't right.";

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, (await adminToken())!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  const next = String(formData.get("next") ?? "");
  redirect(next.startsWith("/admin/") ? next : "/admin");
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}
