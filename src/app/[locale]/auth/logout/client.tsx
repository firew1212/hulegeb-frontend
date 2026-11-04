"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { useDictionary, useLocale } from "@/i18n/provider";
import { useAuth } from "@/lib/auth-context";
import { getLocalizedApiErrorMessage } from "@/i18n/errors";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

export default function LogoutPage() {
  const dict = useDictionary();
  const locale = useLocale();
  const router = useRouter();
  const { signOut } = useAuth();
  const a = dict.auth;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onLogout() {
    setLoading(true);
    setError(null);
    try {
      await signOut();
      setDone(true);
      router.push(`/${locale}/login`);
    } catch (err) {
      setError(getLocalizedApiErrorMessage(err, dict.apiErrors, a.logoutFailed));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title={a.logoutTitle}>
      {done ? <p className="text-sm text-success" role="status">{a.signedOut}</p> : null}
      {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
      <Button onClick={onLogout} className="w-full" disabled={loading}>
        {loading ? a.loading : a.logoutTitle}
      </Button>
    </AuthShell>
  );
}