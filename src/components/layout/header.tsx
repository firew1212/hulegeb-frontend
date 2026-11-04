"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useDictionary, useLocale } from "@/i18n/provider";
import { useAuth } from "@/lib/auth-context";
import { getLocalizedApiErrorMessage } from "@/i18n/errors";
import { getDashboardPath } from "@/lib/dashboard";
import { MobileNav } from "@/components/layout/mobile-nav";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export function Header() {
  const dict = useDictionary();
  const locale = useLocale();
  const { status, user, error: sessionError, refreshSession, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);



  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const dashboardPath =
    status === "authenticated" ? getDashboardPath(user) : null;
  const navLinks = [
    { href: `/${locale}`, label: dict.nav.home },
    { href: `/${locale}/catalog`, label: dict.nav.catalog },
    ...(dashboardPath
      ? [{ href: `/${locale}${dashboardPath}`, label: dict.dashboard.title }]
      : []),
  ];

  function isActive(href: string) {
    if (href === `/${locale}`) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  async function handleSignOut() {
    setLogoutError(null);
    try {
      await signOut();
      router.push(`/${locale}`);
    } catch (err) {
      setLogoutError(getLocalizedApiErrorMessage(err, dict.apiErrors, dict.auth.logoutFailed));
    }
  }

  return (
    <header className={`sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur transition-shadow duration-200 supports-[backdrop-filter]:bg-background/80 motion-reduce:transition-none ${scrolled ? "shadow-md shadow-black/5" : "shadow-none"}`}>
      <div className="container-page relative flex h-16 items-center justify-between gap-3 lg:h-20">
        <Link href={`/${locale}`} className="group flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-base font-bold text-primary-foreground shadow-sm transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none">H</span>
          <span className="text-lg font-semibold tracking-tight text-foreground">Hulegeb</span>
        </Link>

        <nav aria-label={dict.nav.primaryNavigation} className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none ${active ? "text-brand" : "text-muted-foreground hover:text-foreground"}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex xl:gap-3">
          <Link href={`/${locale}/catalog`} aria-label={dict.catalog.searchLabel} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-control-border bg-surface text-muted-foreground transition-colors duration-200 hover:border-brand/40 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
          </Link>

          {status === "initializing" ? (
            <span className="text-sm text-muted-foreground">{dict.common.loading}</span>
          ) : status === "error" ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-danger" role="alert">
                {sessionError === "network" ? dict.apiErrors.network : dict.apiErrors.server}
              </span>
              <button
                type="button"
                onClick={() => void refreshSession()}
                className="rounded-full border border-control-border px-3 py-2 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {dict.auth.retry}
              </button>
            </div>
          ) : status === "authenticated" ? (
            <>
              <span className="hidden max-w-36 truncate text-sm font-medium text-foreground xl:block">{user?.firstName ?? user?.email ?? ""}</span>
              <button type="button" onClick={handleSignOut} className="shrink-0 rounded-full border border-control-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:border-brand/40 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none">{dict.auth.logoutTitle}</button>
              {logoutError ? <span className="text-sm text-danger" role="alert">{logoutError}</span> : null}
            </>
          ) : (
            <>
              <Link href={`/${locale}/login`} className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none">{dict.auth.signIn}</Link>
              <Link href={`/${locale}/register`} className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors duration-200 hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none">{dict.auth.createAccount}</Link>
            </>
          )}
          <LanguageSwitcher />
        </div>

        <MobileNav locale={locale} />
      </div>
    </header>
  );
}
