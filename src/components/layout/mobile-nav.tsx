"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
    ...(dashboardPath
      ? [{ href: `/${loc}${dashboardPath}`, label: dict.dashboard.title }]
      : []),
  ];

  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close drawer helper that restores trigger focus
  const closeDrawer = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus();
  }, []);

  // Lock body scroll and manage focus when open
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus the close button or first focusable element
    const focusTimer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDrawer();
        return;
      }

      // Focus trap within drawer
      if (event.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, closeDrawer]);

  // Close on route navigation (deferred to avoid set state in effect)
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setOpen(false);
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

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
      setLogoutError(
        getLocalizedApiErrorMessage(err, dict.apiErrors, dict.auth.logoutFailed),
      );
    } finally {
      setSigningOut(false);
    }
  }

  const userInitial = (
    user?.firstName?.[0] ??
    user?.email?.[0] ??
    "U"
  ).toUpperCase();

  const userFullName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="lg:hidden">
      {/* Mobile Menu Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-slideover-drawer"
        aria-label={open ? dict.mobileNav.closeMenu : dict.mobileNav.openMenu}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border/80 bg-surface/80 text-foreground transition-all duration-200 hover:border-brand/40 hover:bg-surface hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active-press motion-reduce:transition-none"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
          stroke="currentColor"
          className="h-5 w-5"
          aria-hidden="true"
        >
          {open ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          )}
        </svg>
      </button>

      {/* Accessible Slide-Over Modal Drawer */}
      {open ? (
        <div
          id="mobile-slideover-drawer"
          role="dialog"
          aria-modal="true"
          aria-label={dict.nav.mobileNavigation}
          className="fixed inset-0 z-50 overflow-hidden"
        >
          {/* Backdrop Overlay */}
          <div
            aria-hidden="true"
            onClick={closeDrawer}
            className="fixed inset-0 bg-foreground/40 backdrop-blur-sm transition-opacity duration-300 ease-apple motion-reduce:transition-none animate-fade-in"
          />

          {/* Slide-over Drawer Panel */}
          <div
            ref={panelRef}
            className="fixed inset-y-0 right-0 flex w-full max-w-sm flex-col bg-surface shadow-2xl border-l border-border/80 transition-transform duration-400 ease-apple-in-out motion-reduce:transition-none animate-slide-in-right"
          >
            {/* Drawer Header */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/70 px-4">
              <Link
                href={`/${loc}`}
                onClick={closeDrawer}
                className="group flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-active text-sm font-bold text-primary-foreground shadow-xs transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none">
                  H
                </span>
                <span className="text-base font-semibold tracking-tight text-foreground">
                  Hulegeb
                </span>
              </Link>

              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeDrawer}
                aria-label={dict.mobileNav.closeMenu}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border/80 bg-surface/80 text-muted-foreground transition-all duration-200 hover:border-brand/40 hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active-press motion-reduce:transition-none"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
              {/* Quick Search Action */}
              <div>
                <Link
                  href={`/${loc}/catalog`}
                  onClick={closeDrawer}
                  className="flex items-center gap-2.5 rounded-xl border border-border/80 bg-muted/50 px-3.5 py-2.5 text-sm text-muted-foreground transition-all duration-200 hover:border-brand/40 hover:bg-muted/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="truncate">{dict.catalog.searchLabel}</span>
                </Link>
              </div>

              {/* Primary Navigation Links */}
              <nav
                aria-label={dict.nav.mobileNavigation}
                className="flex flex-col gap-1"
              >
                {links.map((link) => {
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={closeDrawer}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-[44px] items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${
                        active
                          ? "bg-accent-soft text-brand font-semibold shadow-xs border border-brand/10"
                          : "text-foreground hover:bg-muted/60"
                      }`}
                    >
                      <span>{link.label}</span>
                      {active ? (
                        <span className="h-2 w-2 rounded-full bg-brand" />
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-4 w-4 text-muted-foreground/60"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* User Account & Profile Section */}
              <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 space-y-3">
                {status === "initializing" ? (
                  <div
                    className="flex items-center gap-3 py-2 animate-pulse"
                    role="status"
                  >
                    <div className="h-10 w-10 rounded-full bg-muted" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3.5 w-24 rounded bg-muted" />
                      <div className="h-3 w-32 rounded bg-muted/70" />
                    </div>
                  </div>
                ) : status === "error" ? (
                  <div className="space-y-2">
                    <p className="text-xs text-danger" role="alert">
                      {sessionError === "network"
                        ? dict.apiErrors.network
                        : dict.apiErrors.server}
                    </p>
                    <button
                      type="button"
                      onClick={() => void refreshSession()}
                      className="min-h-10 w-full rounded-xl border border-control-border bg-surface px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {dict.auth.retry}
                    </button>
                  </div>
                ) : status === "authenticated" ? (
                  <div className="space-y-3">
                    {/* User Info Card */}
                    <div className="flex items-center gap-3 pb-2 border-b border-border/60">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand font-semibold text-sm">
                        {userInitial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {userFullName || user?.email || ""}
                        </p>
                        {user?.email && userFullName ? (
                          <p className="truncate text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {/* Authenticated Links: Profile & Dashboard */}
                    <div className="flex flex-col gap-1.5">
                      <Link
                        href={`/${loc}/profile`}
                        onClick={closeDrawer}
                        className="flex min-h-10 items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-foreground hover:bg-surface hover:text-brand transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="h-4 w-4 text-muted-foreground"
                            aria-hidden="true"
                          >
                            <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
                          </svg>
                          {dict.auth.profileTitle}
                        </span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-3.5 w-3.5 text-muted-foreground"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </Link>

                      {dashboardPath ? (
                        <Link
                          href={`/${loc}${dashboardPath}`}
                          onClick={closeDrawer}
                          className="flex min-h-10 items-center justify-between rounded-xl bg-brand px-3 py-2 text-xs font-medium text-primary-foreground shadow-xs hover:bg-brand-hover transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="h-4 w-4 text-primary-foreground/80"
                              aria-hidden="true"
                            >
                              <path d="M2 4.25A2.25 2.25 0 014.25 2h2.5A2.25 2.25 0 019 4.25v2.5A2.25 2.25 0 016.75 9h-2.5A2.25 2.25 0 012 6.75v-2.5zM2 13.25A2.25 2.25 0 014.25 11h2.5A2.25 2.25 0 019 13.25v2.5A2.25 2.25 0 016.75 18h-2.5A2.25 2.25 0 012 15.75v-2.5zM11 4.25A2.25 2.25 0 0113.25 2h2.5A2.25 2.25 0 0118 4.25v2.5A2.25 2.25 0 0115.75 9h-2.5A2.25 2.25 0 0111 6.75v-2.5zM11 13.25A2.25 2.25 0 0113.25 11h2.5A2.25 2.25 0 0118 13.25v2.5A2.25 2.25 0 0115.75 18h-2.5A2.25 2.25 0 0111 15.75v-2.5z" />
                            </svg>
                            {dict.dashboard.title}
                          </span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="h-3.5 w-3.5 text-primary-foreground/70"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </Link>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => void handleSignOut()}
                        disabled={signingOut}
                        aria-busy={signingOut}
                        className="flex min-h-10 items-center justify-between rounded-xl border border-border/80 bg-surface px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-danger/30 hover:bg-danger-soft hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60"
                      >
                        <span className="flex items-center gap-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="h-4 w-4"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z"
                              clipRule="evenodd"
                            />
                            <path
                              fillRule="evenodd"
                              d="M19 10a.75.75 0 00-.75-.75H8.704l2.473-2.473a.75.75 0 10-1.06-1.06l-3.75 3.75a.75.75 0 000 1.06l3.75 3.75a.75.75 0 101.06-1.06L8.704 10.75H18.25A.75.75 0 0019 10z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {signingOut ? dict.auth.loading : dict.auth.logoutTitle}
                        </span>
                      </button>

                      {logoutError ? (
                        <p className="text-xs text-danger" role="alert">
                          {logoutError}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  /* Unauthenticated Actions */
                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/${loc}/login`}
                      onClick={closeDrawer}
                      className="flex min-h-10 items-center justify-center rounded-xl border border-border/80 bg-surface px-4 py-2.5 text-center text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {dict.auth.signIn}
                    </Link>
                    <Link
                      href={`/${loc}/register`}
                      onClick={closeDrawer}
                      className="flex min-h-10 items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-center text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active-press"
                    >
                      {dict.auth.createAccount}
                    </Link>
                  </div>
                )}
              </div>

              {/* Language Switcher Section */}
              <div className="pt-2 border-t border-border/60">
                <p className="mb-2.5 text-xs font-medium text-muted-foreground">
                  {dict.language.label}
                </p>
                <LanguageSwitcher className="w-full justify-center" />
              </div>
            </div>

            {/* Drawer Footer info */}
            <div className="shrink-0 border-t border-border/60 px-4 py-3">
              <p className="text-[11px] text-muted-foreground/75 text-center">
                Injibara, Amhara, Ethiopia
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
