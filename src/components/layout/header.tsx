"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useDictionary, useLocale } from "@/i18n/provider";
import { useAuth } from "@/lib/auth-context";
import { getLocalizedApiErrorMessage } from "@/i18n/errors";
import { getDashboardPath } from "@/lib/dashboard";
import { listCategories } from "@/lib/api/catalog";
import type { Category } from "@/types/catalog";
import {
  getCategoryChildren,
  getCategoryHref,
  getCategoryName,
} from "@/components/layout/category-links";
import { MobileNav } from "@/components/layout/mobile-nav";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { HeroSearch } from "@/components/home/hero-search";

export function Header() {
  const dict = useDictionary();
  const locale = useLocale();
  const { status, user, error: sessionError, refreshSession, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<{
    cause: unknown;
  } | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void listCategories({ signal: controller.signal })
      .then(setCategories)
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setCategoriesError({ cause: error });
      })
      .finally(() => {
        if (!controller.signal.aborted) setCategoriesLoading(false);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!categoriesOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !categoryMenuRef.current?.contains(event.target)
      ) {
        setCategoriesOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCategoriesOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [categoriesOpen]);

  const dashboardPath =
    status === "authenticated" ? getDashboardPath(user) : null;
  const showDashboardLink =
    dashboardPath &&
    !(user?.roles.includes("SELLER") && user?.sellerStatus === "APPROVED");
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const userInitial = (
    user?.firstName?.[0] ??
    user?.email?.[0] ??
    "U"
  ).toUpperCase();
  const userDisplayName = user?.firstName ?? user?.email ?? "";
  const primaryCategories = categories.filter(
    (category) => !category.parentId && category.isActive !== false,
  );
  const categoriesErrorMessage = categoriesError
    ? getLocalizedApiErrorMessage(
        categoriesError.cause,
        dict.apiErrors,
        dict.home.categoriesError,
      )
    : null;

  async function handleSignOut() {
    setLogoutError(null);
    try {
      await signOut();
      router.push(`/${locale}`);
    } catch (error) {
      setLogoutError(
        getLocalizedApiErrorMessage(
          error,
          dict.apiErrors,
          dict.auth.logoutFailed,
        ),
      );
    }
  }

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b border-border/80 bg-surface transition-shadow duration-200 motion-reduce:transition-none ${
        scrolled ? "shadow-soft" : "shadow-none"
      }`}
    >
      <div className="hidden border-b border-border/60 bg-muted/20 lg:block">
        <div className="container-page flex h-9 items-center justify-end">
          <LanguageSwitcher size="sm" />
        </div>
      </div>

      <div className="container-page">
        <div className="flex min-h-[4.5rem] items-center gap-3 py-2 lg:gap-6">
          <Link
            href={`/${locale}`}
            aria-label="Hulegeb home"
            className="group flex shrink-0 items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-base font-bold text-primary-foreground shadow-xs transition-colors group-hover:bg-brand-hover">
              H
            </span>
            <span className="text-lg font-bold tracking-tight text-foreground group-hover:text-brand">
              Hulegeb
            </span>
          </Link>

          <div className="hidden min-w-0 flex-1 lg:block">
            <HeroSearch id="header-search" compact />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0 lg:gap-3">
            {status === "authenticated" && user?.roles.includes("BUYER") ? (
              <Link
                href={`/${locale}/cart`}
                aria-label={dict.cart.title}
                title={dict.cart.title}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  isActive(`/${locale}/cart`)
                    ? "border-brand/30 bg-brand/5 text-brand"
                    : "border-border bg-surface text-foreground hover:border-brand/40 hover:text-brand"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 4h2l2.2 11.1a2 2 0 002 1.6h8.9a2 2 0 001.9-1.4L22 8H6"
                  />
                  <circle cx="10" cy="20" r="1" />
                  <circle cx="18" cy="20" r="1" />
                </svg>
              </Link>
            ) : null}

            <div className="hidden items-center gap-2 sm:flex">
              {status === "initializing" ? (
                <div className="h-9 w-24 animate-pulse rounded-lg bg-muted/70" role="status" />
              ) : status === "error" ? (
                <div className="flex items-center gap-2">
                  <span className="max-w-40 text-xs text-danger" role="alert">
                    {sessionError === "network"
                      ? dict.apiErrors.network
                      : dict.apiErrors.server}
                  </span>
                  <button
                    type="button"
                    onClick={() => void refreshSession()}
                    className="rounded-lg border border-control-border bg-surface px-3 py-2 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {dict.auth.retry}
                  </button>
                </div>
              ) : status === "authenticated" ? (
                <div className="flex items-center gap-2">
                  <Link
                    href={`/${locale}/profile`}
                    aria-label={dict.auth.profileTitle}
                    title={dict.auth.profileTitle}
                    className="group flex max-w-40 items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand group-hover:bg-brand group-hover:text-primary-foreground">
                      {userInitial}
                    </span>
                    <span className="truncate">{userDisplayName}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="rounded-lg px-2 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {dict.auth.logoutTitle}
                  </button>
                  {logoutError ? (
                    <span className="max-w-40 text-xs text-danger" role="alert">
                      {logoutError}
                    </span>
                  ) : null}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href={`/${locale}/login`}
                    className="rounded-lg px-2.5 py-2 text-sm font-medium text-foreground hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {dict.auth.signIn}
                  </Link>
                  <Link
                    href={`/${locale}/register`}
                    className="rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-xs hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {dict.auth.createAccount}
                  </Link>
                </div>
              )}
            </div>

            <MobileNav
              locale={locale}
              categories={categories}
              categoriesLoading={categoriesLoading}
              categoriesError={categoriesErrorMessage}
            />
          </div>
        </div>

        <div className="pb-3 lg:hidden">
          <HeroSearch id="mobile-header-search" compact />
        </div>

        <nav
          aria-label={dict.nav.primaryNavigation}
          className="hidden h-12 items-center gap-6 border-t border-border/60 lg:flex"
        >
          <div className="relative h-full" ref={categoryMenuRef}>
            <button
              type="button"
              aria-expanded={categoriesOpen}
              aria-controls="header-categories-menu"
              onClick={() => setCategoriesOpen((open) => !open)}
              className={`inline-flex h-full items-center gap-2 border-b-2 px-1 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                categoriesOpen
                  ? "border-brand text-brand"
                  : "border-transparent text-foreground hover:border-brand/50 hover:text-brand"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M3 3h5v5H3zM12 3h5v5h-5zM3 12h5v5H3zM12 12h5v5h-5z" />
              </svg>
              {dict.catalog.allCategories}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`h-4 w-4 transition-transform ${categoriesOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.22 7.47a.75.75 0 011.06.02L10 11.168l3.72-3.678a.75.75 0 111.05 1.07l-4.25 4.2a.75.75 0 01-1.05 0l-4.25-4.2a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {categoriesOpen ? (
              <div
                id="header-categories-menu"
                className="absolute left-0 top-full z-50 mt-1 w-[min(42rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-4 shadow-xl"
              >
                <Link
                  href={`/${locale}/catalog`}
                  onClick={() => setCategoriesOpen(false)}
                  className="mb-3 inline-flex rounded-md px-2 py-1.5 text-sm font-semibold text-brand hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {dict.catalog.allCategories}
                </Link>
                {categoriesLoading ? (
                  <p className="px-2 py-2 text-sm text-muted-foreground" role="status">
                    {dict.common.loading}
                  </p>
                ) : categoriesErrorMessage ? (
                  <p className="px-2 py-2 text-sm text-danger" role="alert">
                    {categoriesErrorMessage}
                  </p>
                ) : primaryCategories.length ? (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                    {primaryCategories.map((category) => (
                      <div key={category.id} className="min-w-0">
                        <Link
                          href={getCategoryHref(locale, category.id)}
                          onClick={() => setCategoriesOpen(false)}
                          className="block truncate rounded-md px-2 py-1.5 text-sm font-semibold text-foreground hover:bg-accent-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {getCategoryName(category, locale)}
                        </Link>
                        {getCategoryChildren(category, categories).length ? (
                          <div className="mt-1 flex flex-col border-l border-border/70 pl-2">
                            {getCategoryChildren(category, categories).map((child) => (
                              <Link
                                key={child.id}
                                href={getCategoryHref(locale, category.id, child.id)}
                                onClick={() => setCategoriesOpen(false)}
                                className="truncate rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                {getCategoryName(child, locale)}
                              </Link>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="px-2 py-2 text-sm text-muted-foreground">
                    {dict.home.categoriesUnavailable}
                  </p>
                )}
              </div>
            ) : null}
          </div>

          <Link
            href={`/${locale}`}
            onClick={() => setCategoriesOpen(false)}
            aria-current={pathname === `/${locale}` ? "page" : undefined}
            className={`border-b-2 py-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              pathname === `/${locale}`
                ? "border-brand text-brand"
                : "border-transparent text-muted-foreground hover:border-brand/50 hover:text-foreground"
            }`}
          >
            {dict.nav.home}
          </Link>
          <Link
            href={`/${locale}/catalog`}
            onClick={() => setCategoriesOpen(false)}
            aria-current={isActive(`/${locale}/catalog`) ? "page" : undefined}
            className={`border-b-2 py-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isActive(`/${locale}/catalog`)
                ? "border-brand text-brand"
                : "border-transparent text-muted-foreground hover:border-brand/50 hover:text-foreground"
            }`}
          >
            {dict.nav.catalog}
          </Link>
          {showDashboardLink ? (
            <Link
              href={`/${locale}${dashboardPath}`}
              onClick={() => setCategoriesOpen(false)}
              aria-current={isActive(`/${locale}${dashboardPath}`) ? "page" : undefined}
              className={`border-b-2 py-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isActive(`/${locale}${dashboardPath}`)
                  ? "border-brand text-brand"
                  : "border-transparent text-muted-foreground hover:border-brand/50 hover:text-foreground"
              }`}
            >
              {dict.dashboard.title}
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
