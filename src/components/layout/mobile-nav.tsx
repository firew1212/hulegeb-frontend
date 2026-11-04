"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useDictionary, useLocale } from "@/i18n/provider";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useAuth } from "@/lib/auth-context";
import { getDashboardPath } from "@/lib/dashboard";
import { getLocalizedApiErrorMessage } from "@/i18n/errors";

export function MobileNav({ locale }: { locale?: string }) {
  const dict = useDictionary();
  const currentLocale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { status, user, error: sessionError, refreshSession, signOut } = useAuth();
  const loc = locale ?? currentLocale;
  const dashboardPath =
    status === "authenticated" ? getDashboardPath(user) : null;
  const links = [
    { href: `/${loc}`, label: dict.nav.home },
    { href: `/${loc}/catalog`, label: dict.nav.catalog },
  ];

  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      panelRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    }
  }, [open]);

  function isActive(href: string) {
    if (href === `/${loc}`) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  async function handleSignOut() {
    setSigningOut(true);
    setLogoutError(null);
    try {
      await signOut();
      setOpen(false);
      router.push(`/${loc}`);
    } catch (err) {
      setLogoutError(getLocalizedApiErrorMessage(err, dict.apiErrors, dict.auth.logoutFailed));
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-navigation"
        aria-label={open ? dict.mobileNav.closeMenu : dict.mobileNav.openMenu}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-control-border bg-surface px-4 text-sm font-medium text-foreground transition-colors duration-200 hover:border-brand/40 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
          {open ? (
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          ) : (
            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          )}
        </svg>
        {open ? dict.mobileNav.close : dict.mobileNav.menu}
      </button>
      {open ? (
        <div id="mobile-navigation" ref={panelRef} className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-border bg-background/95 shadow-lg backdrop-blur">
          <nav aria-label={dict.nav.mobileNavigation} className="container-page flex flex-col gap-1 py-4">
            {links.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href + link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${active ? "bg-accent-soft text-brand" : "text-foreground hover:bg-muted"}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full transition-colors ${active ? "bg-brand" : "bg-transparent"}`} />
                  {link.label}
                </Link>
              );
            })}
            <div className="mt-2 border-t border-border px-4 pt-4">
              {dashboardPath ? (
                <div className="flex flex-col gap-2">
                  <Link
                    href={`/${loc}${dashboardPath}`}
                    onClick={() => setOpen(false)}
                    className="rounded-full bg-brand px-4 py-3 text-center text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {dict.dashboard.title}
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    disabled={signingOut}
                    aria-busy={signingOut}
                    className="min-h-11 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-wait disabled:opacity-60"
                  >
                    {signingOut ? dict.auth.loading : dict.auth.logoutTitle}
                  </button>
                  {logoutError ? <p className="text-sm text-danger" role="alert">{logoutError}</p> : null}
                </div>
              ) : status === "initializing" ? (
                <p className="px-1 py-2 text-sm text-muted-foreground" role="status">{dict.common.loading}</p>
              ) : status === "error" ? (
                <div className="space-y-2 px-1">
                  <p className="text-sm text-danger" role="alert">
                    {sessionError === "network" ? dict.apiErrors.network : dict.apiErrors.server}
                  </p>
                  <button
                    type="button"
                    onClick={() => void refreshSession()}
                    className="min-h-11 w-full rounded-full border border-control-border px-4 py-2 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {dict.auth.retry}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    href={`/${loc}/login`}
                    onClick={() => setOpen(false)}
                    className="min-h-11 rounded-full border border-control-border px-4 py-3 text-center text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {dict.auth.signIn}
                  </Link>
                  <Link
                    href={`/${loc}/register`}
                    onClick={() => setOpen(false)}
                    className="min-h-11 rounded-full bg-brand px-4 py-3 text-center text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {dict.auth.createAccount}
                  </Link>
                </div>
              )}
            </div>
            <div className="px-4 py-3">
              <LanguageSwitcher />
            </div>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
