"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { useDictionary, useLocale } from "@/i18n/provider";
import { setAuthTokens } from "@/lib/auth-tokens";
import { loginUser, verifyAdminMfa } from "@/lib/auth-api";
import { useAuth } from "@/lib/auth-context";
import { getDashboardPath } from "@/lib/dashboard";
import { getLocalizedApiErrorMessage } from "@/i18n/errors";
import { AuthShell, FieldError, inputClass } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

export default function VerifyAdminMfaPage() {
  const dict = useDictionary();
  const locale = useLocale();
  const router = useRouter();
  const { refreshSession, setAuthenticatedUser } = useAuth();
  const a = dict.auth;

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await loginUser(identifier.trim(), password);
      if ("mfaRequired" in result && result.mfaRequired) {
        setEmail(result.mfaEmail);
        setPassword("");
      } else if ("accessToken" in result) {
        setAuthTokens({ accessToken: result.accessToken });
        if (result.user) setAuthenticatedUser(result.user);
        else await refreshSession();
        router.push(
          `/${locale}${getDashboardPath(result.user) ?? ""}`,
        );
      }
    } catch (err) {
      setError(getLocalizedApiErrorMessage(err, dict.apiErrors, a.error));
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setError(null);
    setLoading(true);
    try {
      const result = await verifyAdminMfa(email, code.trim());
      setAuthTokens({ accessToken: result.accessToken });
      if (result.user) setAuthenticatedUser(result.user);
      else await refreshSession();
      router.push(`/${locale}${getDashboardPath(result.user) ?? ""}`);
    } catch (err) {
      setError(getLocalizedApiErrorMessage(err, dict.apiErrors, a.error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title={a.verifyAdminMfaTitle} description={a.verifyAdminMfaDescription}>
      {email ? (
        <form onSubmit={onSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">{email}</p>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="code">
              {a.codeLabel}
            </label>
            <input id="code" className={inputClass()} inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} required />
          </div>
          {error ? <FieldError message={error} /> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? a.loading : a.submit}
          </Button>
        </form>
      ) : (
        <form onSubmit={onLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="identifier">
              {a.emailLabel} / {a.phoneLabel}
            </label>
            <input id="identifier" className={inputClass()} autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="password">
              {a.passwordLabel}
            </label>
            <input id="password" type="password" className={inputClass()} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error ? <FieldError message={error} /> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? a.loading : a.signIn}
          </Button>
        </form>
      )}
      <p className="mt-4 text-sm">
        <a className="text-accent" href={`/${locale}/login`}>
          {a.backToLogin}
        </a>
      </p>
    </AuthShell>
  );
}
