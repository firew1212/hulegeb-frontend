"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";
import { useDictionary, useLocale } from "@/i18n/provider";
import { getDashboardPath } from "@/lib/dashboard";
import type { AuthRole } from "@/types/auth";
import { Button } from "@/components/ui/button";

export function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: AuthRole[];
}) {
  const { status, user, error, refreshSession } = useAuth();
  const dict = useDictionary();
  const locale = useLocale();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated" || status === "expired") {
      router.replace(`/${locale}/login`);
    }
  }, [status, locale, router]);

  if (status === "initializing") {
    return (
      <div
        className="p-8 text-center text-muted-foreground"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        {dict.common.loading}
      </div>
    );
  }
  if (status === "unauthenticated" || status === "expired") {
    return (
      <section
        className="mx-auto my-12 max-w-lg rounded-3xl border border-border bg-background p-8 text-center shadow-sm"
        role="status"
        aria-live="polite"
      >
        <p className="text-muted-foreground">{dict.apiErrors.unauthorized}</p>
        <Button className="mt-5" href={`/${locale}/login`}>
          {dict.auth.signIn}
        </Button>
      </section>
    );
  }
  if (status === "error") {
    return (
      <section
        className="mx-auto my-12 max-w-lg rounded-3xl border border-border bg-background p-8 text-center shadow-sm"
        role="alert"
      >
        <p className="text-danger">
          {error === "network" ? dict.apiErrors.network : dict.apiErrors.server}
        </p>
        <button
          type="button"
          className="mt-4 rounded-full bg-brand px-4 py-2 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => void refreshSession()}
        >
          {dict.auth.retry}
        </button>
      </section>
    );
  }
  if (status !== "authenticated" || !user) return null;

  if (roles && roles.length > 0) {
    const userRoles = user.roles ?? [];
    const hasRole = roles.some((role) => userRoles.includes(role));
    const needsSellerApproval =
      hasRole &&
      roles.includes("SELLER") &&
      user.sellerStatus !== "APPROVED";
    if (!hasRole || needsSellerApproval) {
      const dashboardPath = getDashboardPath(user);
      return (
        <section
          className="mx-auto my-12 max-w-lg rounded-3xl border border-border bg-background p-8 text-center shadow-sm"
          role="alert"
          aria-labelledby="access-denied-title"
        >
          <h1
            id="access-denied-title"
            className="text-xl font-semibold tracking-tight text-foreground"
          >
            {dict.dashboard.accessDeniedTitle}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {needsSellerApproval
              ? dict.dashboard.sellerApprovalRequired
              : dict.dashboard.accessDenied}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {dashboardPath ? (
              <Button href={`/${locale}${dashboardPath}`}>
                {dict.dashboard.returnToDashboard}
              </Button>
            ) : null}
            <Button
              href={`/${locale}`}
              variant={dashboardPath ? "secondary" : "primary"}
            >
              {dict.common.returnHome}
            </Button>
          </div>
        </section>
      );
    }
  }
  return (
    <>
      {error ? (
        <div className="p-3 text-center" role="status" aria-live="polite">
          <p className="text-sm text-danger">
            {error === "network" ? dict.apiErrors.network : dict.apiErrors.server}
          </p>
          <button
            type="button"
            className="mt-2 text-sm font-medium text-brand underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => void refreshSession()}
          >
            {dict.auth.retry}
          </button>
        </div>
      ) : null}
      {children}
    </>
  );
}
