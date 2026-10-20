// Admin sign-in: one shared password in the ADMIN_PASSWORD environment variable.
// The cookie holds an HMAC of the password, so changing the password signs everyone out.
// Uses Web Crypto so it also runs in middleware.

export const ADMIN_COOKIE = "rollie_admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export const isAdminPasswordSet = () => Boolean(process.env.ADMIN_PASSWORD);

export async function adminToken(): Promise<string | null> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("rollie-admin-v1"));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

// Constant-time string comparison.
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function isValidAdminCookie(value: string | undefined) {
  const token = await adminToken();
  return Boolean(token && value && safeEqual(value, token));
}
