"use client";
import { useState } from "react";

import { useDictionary, useLocale } from "@/i18n/provider";
import { requestPasswordReset } from "@/lib/auth-api";
import { getLocalizedApiErrorMessage } from "@/i18n/errors";
import { AuthShell, FieldError, inputClass } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const dict = useDictionary();
  const locale = useLocale();
  const a = dict.auth;

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setStatus(a.passwordResetRequested);
    } catch (err) {
      setError(getLocalizedApiErrorMessage(err, dict.apiErrors, a.error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title={a.forgotPasswordTitle} description={a.forgotPasswordDescription}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="email">
            {a.emailLabel}
          </label>
          <input id="email" type="email" className={inputClass()} value={email} onChange={(e) => setEmail(e.target.value)} required />
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