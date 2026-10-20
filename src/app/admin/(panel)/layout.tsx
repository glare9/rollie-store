import { signOut } from "../login/actions";
import { AdminNav } from "./AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 pb-3">
        <AdminNav />
        <form action={signOut}>
          <button className="text-sm opacity-60 hover:opacity-100">Sign out</button>
        </form>
      </div>
      {children}
    </div>
  );
}
