import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, isValidAdminCookie } from "./admin-auth";

// Every admin server action calls this first. Middleware already guards /admin pages,
// but server actions can be posted to directly, so check again here.
export async function requireAdmin() {
  const cookieStore = await cookies();
  if (!(await isValidAdminCookie(cookieStore.get(ADMIN_COOKIE)?.value))) redirect("/admin/login");
}
