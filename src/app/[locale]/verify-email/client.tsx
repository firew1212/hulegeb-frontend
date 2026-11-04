"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useDictionary, useLocale } from "@/i18n/provider";
import { verifyEmail, resendEmailVerification } from "@/lib/auth-api";
import { getLocalizedApiErrorMessage } from "@/i18n/errors";
import { AuthShell, FieldError, inputClass } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const dict = useDictionary();
  const locale = useLocale();
  const params = useSearchParams();
  const a = dict.auth;
  const token = params.get("token") ?? "";

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [canResend, setCanResend] = useState(!token);

  useEffect(() => {
    if (!token) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        await verifyEmail(token);
        if (active) setStatus(a.emailVerified);
      } catch (err) {
        if (active) {
          setError(getLocalizedApiErrorMessage(err, dict.apiErrors, a.error));
          setCanResend(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token, a.error, a.emailVerified, dict.apiErrors]);

  async function onResend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await resendEmailVerification(email.trim());
      setStatus(a.verificationSent);
    } catch (err) {
      setError(getLocalizedApiErrorMessage(err, dict.apiErrors, a.error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title={a.verifyEmailTitle} description={a.verifyEmailDescription}>
      {loading ? <p className="text-sm text-muted-foreground">{a.loading}</p> : null}
      {status ? <p className="text-sm text-success" role="status">{status}</p> : null}
      {error ? <FieldError message={error} /> : null}
      {canResend && !status ? (
        <form onSubmit={onResend} className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">{a.verificationResendHint}</p>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="email">
              {a.emailLabel}
            </label>
            <input id="email" type="email" autoComplete="email" className={inputClass()} value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? a.loading : a.submit}
          </Button>
        </form>
      ) : null}
      <p className="mt-4 text-sm">
        <a className="text-accent" href={`/${locale}/login`}>
          {a.backToLogin}
        </a>
      </p>
    </AuthShell>
  );
}