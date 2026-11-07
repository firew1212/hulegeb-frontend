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
      setLogoutError(
        getLocalizedApiErrorMessage(err, dict.apiErrors, dict.auth.logoutFailed),
      );
    }
  }

  const userInitial = (
    user?.firstName?.[0] ??
    user?.email?.[0] ??
    "U"
  ).toUpperCase();

  const userDisplayName = user?.firstName ?? user?.email ?? "";

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 ease-apple motion-reduce:transition-none ${
        scrolled
          ? "border-b border-border/90 bg-surface/95 shadow-soft backdrop-blur-xl supports-[backdrop-filter]:bg-surface/90"
          : "border-b border-border-subtle/90 bg-background/90 backdrop-blur-lg supports-[backdrop-filter]:bg-background/85 shadow-none"
      }`}
    >
      <div className="container-page relative flex h-14 items-center justify-between gap-2 lg:gap-4">
        {/* Brand Logo & Wordmark */}
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}`}
            className="group flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-active text-sm font-bold text-primary-foreground shadow-xs transition-transform duration-200 group-hover:scale-105 active-press motion-reduce:transition-none">
              H
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-foreground transition-colors group-hover:text-brand">
                Hulegeb
              </span>
              <span className="hidden xl:inline-flex items-center rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand border border-brand/15">
                Injibara
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Primary Navigation */}
        <nav
          aria-label={dict.nav.primaryNavigation}
          className="hidden items-center gap-1 lg:flex"
        >
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none ${
                  active
                    ? "bg-accent-soft text-brand font-semibold shadow-xs border border-brand/10"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Right Controls: Search, Auth / Profile, Language */}
        <div className="hidden items-center gap-2.5 lg:flex xl:gap-3">
          {/* Quick Search Pill Button */}
          <Link
            href={`/${locale}/catalog`}
            aria-label={dict.catalog.searchLabel}
            className="group inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground transition-all duration-200 hover:border-brand/40 hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-brand"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
            <span className="hidden xl:inline">{dict.catalog.searchLabel}</span>
            <span className="xl:hidden">{dict.nav.search}</span>
          </Link>

          {/* Authentication & Profile Controls */}
          {status === "initializing" ? (
            <div className="flex items-center gap-2 animate-pulse" role="status">
              <div className="h-8 w-20 rounded-full bg-muted/70" />
            </div>
          ) : status === "error" ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-danger" role="alert">
                {sessionError === "network"
                  ? dict.apiErrors.network
                  : dict.apiErrors.server}
              </span>
              <button
                type="button"
                onClick={() => void refreshSession()}
                className="rounded-full border border-control-border bg-surface px-3 py-1 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {dict.auth.retry}
              </button>
            </div>
          ) : status === "authenticated" ? (
            <div className="flex items-center gap-2">
              {/* Profile Link with Avatar */}
              <Link
                href={`/${locale}/profile`}
                aria-label={dict.auth.profileTitle}
                title={dict.auth.profileTitle}
                className="group flex max-w-44 items-center gap-1.5 rounded-full border border-border/80 bg-surface/80 px-2 py-1 text-xs font-medium text-foreground transition-all duration-200 hover:border-brand/40 hover:bg-accent-soft active-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[11px] font-bold text-brand group-hover:bg-brand group-hover:text-primary-foreground transition-colors">
                  {userInitial}
                </span>
                <span className="truncate text-xs font-medium text-foreground">
                  {userDisplayName}
                </span>
              </Link>

              {/* Sign Out Action */}
              <button
                type="button"
                onClick={handleSignOut}
                aria-label={dict.auth.logoutTitle}
                className="shrink-0 rounded-full border border-border/80 bg-surface/80 px-3 py-1 text-xs font-medium text-muted-foreground transition-all duration-200 hover:border-danger/30 hover:bg-danger-soft hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none"
              >
                {dict.auth.logoutTitle}
              </button>
              {logoutError ? (
                <span className="text-xs text-danger" role="alert">
                  {logoutError}
                </span>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href={`/${locale}/login`}
                className="rounded-full px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none"
              >
                {dict.auth.signIn}
              </Link>
              <Link
                href={`/${locale}/register`}
                className="rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-xs transition-all duration-200 hover:bg-brand-hover hover:shadow-soft active-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none"
              >
                {dict.auth.createAccount}
              </Link>
            </div>
          )}

          {/* Language Switcher */}
          <LanguageSwitcher size="sm" />
        </div>

        {/* Mobile Header Actions (Search + Language + Menu) */}
        <div className="flex items-center gap-1.5 lg:hidden">
          {/* Quick Mobile Search Button */}
          <Link
            href={`/${locale}/catalog`}
            aria-label={dict.catalog.searchLabel}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border/80 bg-surface/80 text-muted-foreground transition-all duration-200 hover:border-brand/40 hover:bg-surface hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active-press motion-reduce:transition-none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
          </Link>

          {/* Compact Language Switcher on Mobile/Tablet */}
          <LanguageSwitcher size="sm" className="hidden sm:inline-flex" />

          {/* Accessible Mobile Slide-Over Trigger */}
          <MobileNav locale={locale} />
        </div>
      </div>
    </header>
  );
}
