"use client";

import { useActionState, useState } from "react";
import { signIn } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [error, action, pending] = useActionState(signIn, "");
  const [showPassword, setShowPassword] = useState(false);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="space-y-1">
        <label htmlFor="admin-password" className="block text-sm font-medium">
          Password
        </label>
        <div className="relative">
          <input
            id="admin-password"
            type={showPassword ? "text" : "password"}
            name="password"
            required
            autoFocus
            autoComplete="current-password"
            className="w-full rounded-lg border border-black/10 bg-white py-2 pl-3 pr-16"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 px-3 text-sm font-medium text-brand-dark"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button disabled={pending} className="w-full rounded-lg bg-brand-dark text-white font-medium py-2 disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
