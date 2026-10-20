import { isAdminPasswordSet } from "@/lib/admin-auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="max-w-sm mx-auto rounded-xl bg-white shadow-sm p-6 space-y-4">
      <h1 className="text-xl font-bold">Rollie admin</h1>
      {isAdminPasswordSet() ? (
        <LoginForm next={next} />
      ) : (
        <p className="rounded-lg bg-amber-100 text-amber-900 px-3 py-2 text-sm">
          Admin sign-in isn&apos;t set up yet. In Vercel, add an environment variable called <code>ADMIN_PASSWORD</code>{" "}
          with a password of your choice, then redeploy.
        </p>
      )}
    </div>
  );
}
