"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useDictionary, useLocale } from "@/i18n/provider";
import { useAuth } from "@/lib/auth-context";
import { getLocalizedApiErrorMessage } from "@/i18n/errors";
import { getDashboardPath } from "@/lib/dashboard";
import { listCategories } from "@/lib/api/catalog";
import { getCart } from "@/lib/api/cart";
import { CART_UPDATED_EVENT } from "@/lib/cart-events";
import type { Category } from "@/types/catalog";
import {
  getCategoryChildren,
  getCategoryHref,
  getCategoryName,
} from "@/components/layout/category-links";
import { MobileNav } from "@/components/layout/mobile-nav";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { HeroSearch } from "@/components/home/hero-search";
import { SellerEntryLink } from "@/components/layout/seller-entry-link";

export function Header() {
  const dict = useDictionary();
  const locale = useLocale();
  const { status, user, error: sessionError, refreshSession, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isHomePage = pathname === `/${locale}`;
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const categoryTriggerRef = useRef<HTMLButtonElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const menuPointerType = useRef("");
  const [scrolled, setScrolled] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<{
    cause: unknown;
  } | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [cartState, setCartState] = useState<{
    owner: string;
    count: number | null;
    error: boolean;
  } | null>(null);

  useEffect(() => {
    if (isHomePage) {
      const search = document.getElementById("home-search");
      if (!search) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          const nextScrolled =
            !entry.isIntersecting && entry.boundingClientRect.top < 0;
          setScrolled(nextScrolled);
          if (nextScrolled) {
            setCategoriesOpen(false);
            setAccountMenuOpen(false);
          }
        },
        { threshold: 0 },
      );
      observer.observe(search);
      return () => observer.disconnect();
    }

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        const nextScrolled = window.scrollY > 140;
        setScrolled(nextScrolled);
        if (nextScrolled) {
          setCategoriesOpen(false);
          setAccountMenuOpen(false);
        }
        frame = 0;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [isHomePage, pathname]);

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

  const isBuyer = status === "authenticated" && user?.roles.includes("BUYER");
  const cartOwner = isBuyer ? user?.email ?? null : null;
  useEffect(() => {
    if (!cartOwner) return;

    let controller: AbortController | null = null;
    const loadCartCount = () => {
      controller?.abort();
      controller = new AbortController();
      const requestController = controller;
      void getCart({ signal: requestController.signal })
        .then((cart) => {
          setCartState({
            owner: cartOwner,
            count: cart.items.reduce(
              (total, item) => total + item.quantity,
              0,
            ),
            error: false,
          });
        })
        .catch(() => {
          if (requestController.signal.aborted) return;
          setCartState({ owner: cartOwner, count: null, error: true });
        });
    };

    loadCartCount();
    window.addEventListener(CART_UPDATED_EVENT, loadCartCount);
    return () => {
      controller?.abort();
      window.removeEventListener(CART_UPDATED_EVENT, loadCartCount);
    };
  }, [cartOwner]);

  useEffect(() => {
    if (!categoriesOpen && !accountMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (!categoryMenuRef.current?.contains(event.target)) setCategoriesOpen(false);
      if (!accountMenuRef.current?.contains(event.target)) setAccountMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setCategoriesOpen(false);
      setAccountMenuOpen(false);
      if (accountMenuOpen) {
        accountTriggerRef.current?.focus();
      } else {
        categoryTriggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountMenuOpen, categoriesOpen]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setCategoriesOpen(false);
      setAccountMenuOpen(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  const dashboardPath =
    status === "authenticated" ? getDashboardPath(user) : null;
  const showCompactSearch = scrolled || !isHomePage;
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const userInitial = (
    user?.firstName?.[0] ??
    user?.email?.[0] ??
    "U"
  ).toUpperCase();
  const userDisplayName = user?.firstName ?? user?.email ?? "";
  const activeCart =
    cartState?.owner === cartOwner ? cartState : null;
  const cartCount = activeCart?.count ?? null;
  const cartLoadError = activeCart?.error ?? false;
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
      setAccountMenuOpen(false);
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
      className={`sticky top-0 z-40 w-full border-b border-border/80 bg-surface/95 transition-shadow duration-300 motion-reduce:transition-none ${
        scrolled ? "shadow-soft" : "shadow-none"
      }`}
    >
      <div
        className={`hidden overflow-hidden border-b border-border/60 bg-muted/30 transition-[max-height,opacity] duration-300 ease-out motion-reduce:transition-none lg:block ${
          scrolled
            ? "max-h-0 border-transparent opacity-0"
            : "max-h-12 opacity-100"
        }`}
      >
        <div className="container-page flex h-9 items-center justify-between gap-4">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-3.5 w-3.5 text-brand"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18s6-5.686 6-10A6 6 0 104 8c0 4.314 6 10 6 10zm0-7a3 3 0 100-6 3 3 0 000 6z"
                clipRule="evenodd"
              />
            </svg>
            <span>{dict.nav.marketplaceLocation}</span>
          </p>
          <div className="flex items-center gap-5">
            <SellerEntryLink className="text-xs font-medium text-foreground transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {dict.home.sellOnHulegeb}
            </SellerEntryLink>
          </div>
        </div>
      </div>

      <div className="container-page">
        <div
          className={`flex items-center justify-between gap-3 transition-[min-height,padding] duration-300 ease-out motion-reduce:transition-none md:gap-5 ${
            scrolled
              ? "min-h-[3.75rem] py-1 md:min-h-[4.25rem]"
              : "min-h-[4.25rem] py-2 sm:min-h-[5.25rem] sm:py-3 md:min-h-[5.75rem]"
          }`}
        >
          <Link
            href={`/${locale}`}
            aria-label="Hulegeb home"
            className="group flex w-fit shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-base font-bold text-primary-foreground shadow-xs transition-colors group-hover:bg-brand-hover md:h-11 md:w-11">
              H
            </span>
            <span className="text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-brand md:text-xl">
              Hulegeb
            </span>
          </Link>

          <div className="flex shrink-0 items-center justify-end gap-1.5 md:gap-2.5">
            {isBuyer ? (
              <Link
                href={`/${locale}/cart`}
                aria-label={
                  cartLoadError
                    ? dict.cart.error
                    : cartCount
                      ? dict.cart.itemCount.replace(
                          "{count}",
                          new Intl.NumberFormat(
                            locale === "am" ? "am-ET" : "en-ET",
                          ).format(cartCount),
                        )
                      : dict.cart.title
                }
                title={cartLoadError ? dict.cart.error : dict.cart.title}
                className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  isActive(`/${locale}/cart`)
                    ? "bg-brand/10 text-brand"
                    : "text-foreground hover:bg-muted hover:text-brand"
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
                {cartCount && cartCount > 0 ? (
                  <span
                    aria-hidden="true"
                    className="absolute -right-0.5 -top-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full border-2 border-surface bg-brand px-1 text-[10px] font-bold leading-none text-primary-foreground"
                  >
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                ) : null}
              </Link>
            ) : null}

            <div className="hidden items-center gap-2 lg:flex">
              <LanguageSwitcher size="sm" />
              {status === "initializing" ? (
                <div className="h-10 w-28 animate-pulse rounded-xl bg-muted/70" role="status" />
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
                <div
                  className="relative"
                  ref={accountMenuRef}
                  onPointerEnter={(event) => {
                    if (event.pointerType === "mouse") setAccountMenuOpen(true);
                  }}
                  onPointerLeave={(event) => {
                    if (event.pointerType === "mouse") setAccountMenuOpen(false);
                  }}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                      setAccountMenuOpen(false);
                    }
                  }}
                >
                  <button
                    ref={accountTriggerRef}
                    type="button"
                    aria-expanded={accountMenuOpen}
                    aria-controls="header-account-menu"
                    aria-label={dict.auth.profileTitle}
                    onPointerDown={(event) => {
                      menuPointerType.current = event.pointerType;
                    }}
                    onClick={(event) =>
                      setAccountMenuOpen((open) =>
                        event.detail === 0 || menuPointerType.current !== "mouse"
                          ? !open
                          : true,
                      )
                    }
                    className="group inline-flex h-10 max-w-52 items-center gap-2 rounded-full px-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand group-hover:bg-brand group-hover:text-primary-foreground">
                      {userInitial}
                    </span>
                    <span className="max-w-32 truncate">{userDisplayName}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                        accountMenuOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.22 7.47a.75.75 0 011.06.02L10 11.168l3.72-3.678a.75.75 0 111.05 1.07l-4.25 4.2a.75.75 0 01-1.05 0l-4.25-4.2a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {accountMenuOpen ? (
                    <div
                      id="header-account-menu"
                      className="absolute right-0 top-full z-50 w-60 origin-top-right rounded-2xl border border-border bg-surface p-2 shadow-floating animate-scale-in motion-reduce:animate-none"
                    >
                      <Link
                        href={`/${locale}/profile`}
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
                          {userInitial}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-foreground">
                            {userDisplayName}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {dict.auth.profileTitle}
                          </span>
                        </span>
                      </Link>

                      {dashboardPath ? (
                        <Link
                          href={`/${locale}${dashboardPath}`}
                          onClick={() => setAccountMenuOpen(false)}
                          className="mt-1 flex min-h-10 items-center rounded-xl px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {dict.dashboard.title}
                        </Link>
                      ) : null}

                      <div className="my-1 border-t border-border/70" />
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex min-h-10 w-full items-center rounded-xl px-3 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {dict.auth.logoutTitle}
                      </button>
                      {logoutError ? (
                        <p className="px-3 py-2 text-xs text-danger" role="alert">
                          {logoutError}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div
                  className="relative"
                  ref={accountMenuRef}
                  onPointerEnter={(event) => {
                    if (event.pointerType === "mouse") setAccountMenuOpen(true);
                  }}
                  onPointerLeave={(event) => {
                    if (event.pointerType === "mouse") setAccountMenuOpen(false);
                  }}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                      setAccountMenuOpen(false);
                    }
                  }}
                >
                  <button
                    ref={accountTriggerRef}
                    type="button"
                    aria-expanded={accountMenuOpen}
                    aria-controls="header-account-menu"
                    onPointerDown={(event) => {
                      menuPointerType.current = event.pointerType;
                    }}
                    onClick={(event) =>
                      setAccountMenuOpen((open) =>
                        event.detail === 0 || menuPointerType.current !== "mouse"
                          ? !open
                          : true,
                      )
                    }
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border/80 bg-surface px-3 text-sm font-semibold text-foreground transition-colors hover:border-brand/30 hover:bg-accent-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path d="M10 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM3 17.25a7 7 0 0114 0 .75.75 0 01-.75.75h-12.5a.75.75 0 01-.75-.75z" />
                    </svg>
                    {dict.nav.account}
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                        accountMenuOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.22 7.47a.75.75 0 011.06.02L10 11.168l3.72-3.678a.75.75 0 111.05 1.07l-4.25 4.2a.75.75 0 01-1.05 0l-4.25-4.2a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  {accountMenuOpen ? (
                    <div
                      id="header-account-menu"
                      className="absolute right-0 top-full z-50 w-56 origin-top-right rounded-2xl border border-border bg-surface p-2 shadow-floating animate-scale-in motion-reduce:animate-none"
                    >
                      <Link
                        href={`/${locale}/login`}
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {dict.auth.signIn}
                      </Link>
                      <Link
                        href={`/${locale}/register`}
                        onClick={() => setAccountMenuOpen(false)}
                        className="mt-1 flex min-h-11 items-center justify-center rounded-xl bg-brand px-3 text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {dict.auth.createAccount}
                      </Link>
                    </div>
                  ) : null}
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

        <nav
          aria-label={dict.nav.primaryNavigation}
          className={`hidden h-[3.25rem] items-center gap-5 border-t border-border/60 transition-[max-height,opacity] duration-300 ease-out motion-reduce:transition-none lg:flex ${
            scrolled
              ? "max-h-0 overflow-hidden border-transparent opacity-0"
              : "max-h-[3.25rem] overflow-visible opacity-100"
          }`}
        >
          <div
            className="relative h-full"
            ref={categoryMenuRef}
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse") setCategoriesOpen(true);
            }}
            onPointerLeave={(event) => {
              if (event.pointerType === "mouse") setCategoriesOpen(false);
            }}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setCategoriesOpen(false);
              }
            }}
          >
            <button
              ref={categoryTriggerRef}
              type="button"
              aria-expanded={categoriesOpen}
              aria-controls="header-categories-menu"
              onPointerDown={(event) => {
                menuPointerType.current = event.pointerType;
              }}
              onClick={(event) =>
                setCategoriesOpen((open) =>
                  event.detail === 0 || menuPointerType.current !== "mouse"
                    ? !open
                    : true,
                )
              }
              className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                categoriesOpen
                  ? "bg-brand/10 text-brand"
                  : "bg-muted/70 text-foreground hover:bg-brand/10 hover:text-brand"
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
                className="absolute left-0 top-full z-50 w-[min(42rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-4 shadow-floating animate-scale-in motion-reduce:animate-none"
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
            className={`rounded-full px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              pathname === `/${locale}`
                ? "bg-brand/10 font-semibold text-brand"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {dict.nav.home}
          </Link>
          <Link
            href={`/${locale}/catalog`}
            onClick={() => setCategoriesOpen(false)}
            aria-current={isActive(`/${locale}/catalog`) ? "page" : undefined}
            className={`rounded-full px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isActive(`/${locale}/catalog`)
                ? "bg-brand/10 font-semibold text-brand"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {dict.nav.catalog}
          </Link>
          {dashboardPath ? (
            <Link
              href={`/${locale}${dashboardPath}`}
              onClick={() => setCategoriesOpen(false)}
              aria-current={isActive(`/${locale}${dashboardPath}`) ? "page" : undefined}
              className={`rounded-full px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isActive(`/${locale}${dashboardPath}`)
                  ? "bg-brand/10 font-semibold text-brand"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {dict.dashboard.title}
            </Link>
          ) : null}
        </nav>
      </div>
      {isHomePage || showCompactSearch ? (
        <div
          aria-hidden={!showCompactSearch}
          inert={!showCompactSearch}
          className={`absolute left-0 right-0 top-full z-50 border-t border-border/60 bg-surface/95 shadow-soft backdrop-blur-md transition-[opacity,transform] duration-300 ease-apple motion-reduce:transition-none ${
            showCompactSearch
              ? "translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-2 opacity-0"
          }`}
        >
          <div className="container-page flex items-center justify-center py-2">
            <div className="w-full max-w-[58rem]">
              <HeroSearch id="header-search" compact />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
