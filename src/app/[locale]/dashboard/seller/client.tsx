"use client";

import Link from "next/link";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardMobileNav } from "@/components/dashboard/dashboard-mobile-nav";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  DashboardSidebar,
  type DashboardNavItem,
} from "@/components/dashboard/dashboard-sidebar";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Container } from "@/components/ui/container";
import { useDictionary, useLocale } from "@/i18n/provider";
import { useAuth } from "@/lib/auth-context";

export default function SellerDashboardClient() {
  const dict = useDictionary();
  const locale = useLocale();
  const { user } = useAuth();
  const dashboard = dict.dashboard;
  const sellerPath = `/${locale}/dashboard/seller`;
  const productsPath = `/${locale}/dashboard/seller/products`;
  const navigation: DashboardNavItem[] = [
    { href: sellerPath, label: dashboard.overview },
    { href: productsPath, label: dashboard.sellerProducts },
    {
      href: `/${locale}/dashboard/seller/notifications`,
      label: dashboard.sellerNotifications,
    },
    { href: `/${locale}/catalog`, label: dashboard.browseCatalog },
    { href: `/${locale}/profile`, label: dashboard.quickProfile },
  ];
  const sellerName = user?.firstName.trim() || user?.email || "";
  const welcome = sellerName
    ? dashboard.sellerWelcome.replace("{name}", sellerName)
    : dashboard.sellerTitle;

  return (
    <ProtectedRoute roles={["SELLER"]}>
      <DashboardShell>
        <DashboardSidebar title={dashboard.sellerTitle} items={navigation} />
        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardTopbar
            title={dashboard.sellerTitle}
            subtitle={dashboard.sellerOverview}
            userLabel={sellerName || undefined}
            actions={
              <DashboardMobileNav
                items={navigation}
                title={dashboard.sellerTitle}
              />
            }
          />
          <main className="flex-1">
            <Container className="py-6 sm:py-8 lg:py-10">
              <PageHeader
                title={welcome}
                description={dashboard.sellerWelcomeDescription}
                actions={
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      label={dashboard.sellerApproved}
                      tone="success"
                    />
                    <Link
                      href={`${productsPath}/new`}
                      className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {dashboard.sellerAddProduct}
                    </Link>
                  </div>
                }
              />

              <section className="mt-8" aria-labelledby="seller-quick-links">
                <h2
                  id="seller-quick-links"
                  className="text-lg font-semibold text-foreground"
                >
                  {dashboard.sellerGettingStarted}
                </h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Link
                    href={`/${locale}/catalog`}
                    className="group rounded-2xl border border-border bg-surface p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-brand" aria-hidden="true">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="h-5 w-5"
                      >
                        <path d="M3 9.5 4.5 4h15L21 9.5" />
                        <path d="M5 10v10h14V10M9 20v-6h6v6" />
                        <path d="M3 9.5a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
                      </svg>
                    </span>
                    <h3 className="mt-4 text-base font-semibold text-foreground">
                      {dashboard.sellerMarketplaceTitle}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {dashboard.sellerMarketplaceDescription}
                    </p>
                    <span className="mt-4 inline-flex text-sm font-medium text-brand">
                      {dashboard.browseCatalog}
                      <span className="ml-2 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true">
                        →
                      </span>
                    </span>
                  </Link>

                  <Link
                    href={productsPath}
                    className="group rounded-2xl border border-border bg-surface p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-brand" aria-hidden="true">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="h-5 w-5"
                      >
                        <path d="M4 5h16v14H4zM8 9h8M8 13h8M8 17h4" />
                      </svg>
                    </span>
                    <h3 className="mt-4 text-base font-semibold text-foreground">
                      {dashboard.sellerProducts}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {dashboard.sellerProductsDescription}
                    </p>
                    <span className="mt-4 inline-flex text-sm font-medium text-brand">
                      {dashboard.sellerManageProducts}
                      <span className="ml-2 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true">
                        →
                      </span>
                    </span>
                  </Link>

                  <Link
                    href={`/${locale}/profile`}
                    className="group rounded-2xl border border-border bg-surface p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-brand" aria-hidden="true">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="h-5 w-5"
                      >
                        <circle cx="12" cy="8" r="3.5" />
                        <path d="M5 20a7 7 0 0 1 14 0" />
                      </svg>
                    </span>
                    <h3 className="mt-4 text-base font-semibold text-foreground">
                      {dashboard.sellerProfileTitle}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {dashboard.sellerProfileDescription}
                    </p>
                    <span className="mt-4 inline-flex text-sm font-medium text-brand">
                      {dashboard.quickProfile}
                      <span className="ml-2 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true">
                        →
                      </span>
                    </span>
                  </Link>
                </div>
              </section>
            </Container>
          </main>
        </div>
      </DashboardShell>
    </ProtectedRoute>
  );
}
