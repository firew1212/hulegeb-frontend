"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { useDictionary, useLocale } from "@/i18n/provider";
import { resetPassword } from "@/lib/auth-api";
import { getLocalizedApiErrorMessage } from "@/i18n/errors";
import { AuthShell, FieldError, inputClass } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const dict = useDictionary();
  const locale = useLocale();
  const params = useSearchParams();
  const a = dict.auth;

  const [token, setToken] = useState(params.get("token") ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    setLoading(true);
    try {
      await resetPassword(token.trim(), newPassword);
      setStatus(a.passwordResetSuccess);
    } catch (err) {
      setError(getLocalizedApiErrorMessage(err, dict.apiErrors, a.error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title={a.resetPasswordTitle} description={a.resetPasswordDescription}>
      <form onSubmit={onSubmit} className="space-y-4">
        {!params.get("token") ? (
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="token">
              {a.tokenLabel}
            </label>
            <input id="token" className={inputClass()} value={token} onChange={(e) => setToken(e.target.value)} required />
          </div>
        ) : null}
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="newPassword">
            {a.newPasswordLabel}
          </label>
          <div className="relative">
            <input
              id="newPassword"
              type={showPassword ? "text" : "password"}
              className={inputClass()}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={12}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? a.hidePassword : a.showPassword}
            >
              {showPassword ? a.hidePassword : a.showPassword}
            </button>
          </div>
        </div>
        {status ? <p className="text-sm text-success" role="status">{status}</p> : null}
        {error ? <FieldError message={error} /> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? a.loading : a.submit}
        </Button>
      </form>
      <p className="mt-4 text-sm">
        <a className="text-accent" href={`/${locale}/login`}>
          {a.backToLogin}
        </a>
      </p>
    </AuthShell>
  );
}