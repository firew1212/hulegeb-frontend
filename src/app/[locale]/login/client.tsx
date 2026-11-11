"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { useDictionary, useLocale } from "@/i18n/provider";
import { setAuthTokens } from "@/lib/auth-tokens";
import { getMe, loginUser } from "@/lib/auth-api";
import { getLocalizedApiErrorMessage } from "@/i18n/errors";
import { useAuth } from "@/lib/auth-context";
import {
  getAuthorizedReturnTo,
  getDashboardPath,
} from "@/lib/dashboard";
import { AuthShell, FieldError, inputClass } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

export default function LoginPage({ returnTo }: { returnTo?: string }) {
  const dict = useDictionary();
  const locale = useLocale();
  const router = useRouter();
  const { setAuthenticatedUser } = useAuth();
  const a = dict.auth;

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mfaEmail, setMfaEmail] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await loginUser(identifier.trim(), password);
      if ("mfaRequired" in result && result.mfaRequired) {
        setMfaEmail(result.mfaEmail);
        setError(null);
      } else if ("accessToken" in result) {
        setAuthTokens({
          accessToken: result.accessToken,
        });
        const user = result.user ?? await getMe();
        setAuthenticatedUser(user);
        const destination =
          getAuthorizedReturnTo(returnTo, user, locale) ??
          `/${locale}${getDashboardPath(user) ?? ""}`;
        router.push(destination);
      }
    } catch (err) {
      setError(getLocalizedApiErrorMessage(err, dict.apiErrors, a.error));
    } finally {
      setLoading(false);
    }
  }

  async function onMfaSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaEmail) return;
    setError(null);
    setLoading(true);
    try {
      const result = await (await import("@/lib/auth-api")).verifyAdminMfa(
        mfaEmail,
        mfaCode,
      );
      setAuthTokens({ accessToken: result.accessToken });
      const user = result.user ?? await getMe();
      setAuthenticatedUser(user);
      const destination =
        getAuthorizedReturnTo(returnTo, user, locale) ??
        `/${locale}${getDashboardPath(user) ?? ""}`;
      router.push(destination);
    } catch (err) {
      setError(getLocalizedApiErrorMessage(err, dict.apiErrors, a.error));
    } finally {
      setLoading(false);
    }
  }

  if (mfaEmail) {
    return (
      <AuthShell title={a.verifyAdminMfaTitle} description={a.verifyAdminMfaDescription}>
        <form onSubmit={onMfaSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="mfa-code">
              {a.codeLabel}
            </label>
            <input
              id="mfa-code"
              className={inputClass()}
              inputMode="numeric"
              autoComplete="one-time-code"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              required
            />
          </div>
          {error ? <FieldError message={error} /> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? a.loading : a.submit}
          </Button>
          <button
            type="button"
            className="text-sm text-accent"
            onClick={() => setMfaEmail(null)}
          >
            {a.backToLogin}
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={a.loginTitle}
      description={a.loginDescription}
      footer={
        <>
          <p>
            {a.noAccount}{" "}
            <a className="text-accent" href={`/${locale}/register`}>
              {a.createAccount}
            </a>
          </p>
          <p className="mt-2">
            <a className="text-accent" href={`/${locale}/forgot-password`}>
              {a.forgotPassword}
            </a>
          </p>
          <p className="mt-2">
            <a className="text-accent" href={`/${locale}/verify-email`}>
              {a.resendVerification}
            </a>
          </p>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="identifier">
            {a.emailLabel} / {a.phoneLabel}
          </label>
          <input
            id="identifier"
            className={inputClass()}
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="password">
            {a.passwordLabel}
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className={inputClass()}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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
        {error ? <FieldError message={error} /> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? a.loading : a.signIn}
        </Button>
      </form>
    </AuthShell>
  );
}
