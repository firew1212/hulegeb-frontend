"use client";
import { useState } from "react";

import { useDictionary, useLocale } from "@/i18n/provider";
import { registerUser } from "@/lib/auth-api";
import { getLocalizedApiErrorMessage } from "@/i18n/errors";
import { AuthShell, FieldError, inputClass } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const dict = useDictionary();
  const locale = useLocale();
  const a = dict.auth;

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [termsVersion, setTermsVersion] = useState("1.0");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!acceptedTerms) {
      setError(a.termsRequired);
      return;
    }
    setLoading(true);
    try {
      await registerUser({
        email: email.trim(),
        phone: phone.trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        termsVersion: termsVersion.trim(),
        acceptedTerms: true,
      });
      setSuccess(a.registrationSuccess);
    } catch (err) {
      setError(getLocalizedApiErrorMessage(err, dict.apiErrors, a.error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title={a.registerTitle}
      description={a.registerDescription}
      footer={
        <>
          <p>
            {a.haveAccount}{" "}
            <a className="text-accent" href={`/${locale}/login`}>
              {a.signIn}
            </a>
          </p>
          {success ? (
            <p className="mt-2">
              <a
                className="text-accent"
                href={`/${locale}/verify-email?email=${encodeURIComponent(email.trim())}`}
              >
                {a.resendVerification}
              </a>
            </p>
          ) : null}
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="firstName">
              {a.firstNameLabel}
            </label>
            <input id="firstName" className={inputClass()} value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={80} autoComplete="given-name" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="lastName">
              {a.lastNameLabel}
            </label>
            <input id="lastName" className={inputClass()} value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={80} autoComplete="family-name" required />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="email">
            {a.emailLabel}
          </label>
          <input id="email" type="email" className={inputClass()} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="phone">
            {a.phoneLabel}
          </label>
          <input id="phone" type="tel" className={inputClass()} autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} required />
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={12}
              maxLength={128}
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
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="termsVersion">
            {a.termsVersionLabel}
          </label>
          <input id="termsVersion" className={inputClass()} value={termsVersion} onChange={(e) => setTermsVersion(e.target.value)} maxLength={40} required />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="h-4 w-4 accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          {a.acceptTerms}
        </label>
        {error ? <FieldError message={error} /> : null}
        {success ? <p className="text-sm text-success" role="status">{success}</p> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? a.loading : a.submit}
        </Button>
      </form>
    </AuthShell>
  );
}