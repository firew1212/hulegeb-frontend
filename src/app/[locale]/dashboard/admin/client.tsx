"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardMobileNav } from "@/components/dashboard/dashboard-mobile-nav";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  DashboardSidebar,
  type DashboardNavItem,
} from "@/components/dashboard/dashboard-sidebar";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { PageHeader } from "@/components/dashboard/page-header";
import { Container } from "@/components/ui/container";
import { useDictionary, useLocale } from "@/i18n/provider";
import { useAuth } from "@/lib/auth-context";

export default function AdminDashboardClient() {
  const dict = useDictionary();
  const locale = useLocale();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const dashboard = dict.dashboard;
  const adminPath = `/${locale}/dashboard/admin`;
  const adminName = user?.firstName.trim() || user?.email || "";
  const welcome = adminName
    ? dashboard.adminWelcome.replace("{name}", adminName)
    : dashboard.adminTitle;
  const navigation: DashboardNavItem[] = [
    { href: adminPath, label: dashboard.overview },
    {
      href: `${adminPath}/seller-applications`,
      label: dashboard.adminSellerApplications,
      marker: "M21",
    },
    {
      href: `${adminPath}/categories`,
      label: dashboard.adminCategories,
      marker: "M22",
    },
    {
      href: `${adminPath}/product-moderation`,
      label: dashboard.adminProductModeration,
      marker: "M23",
    },
    {
      href: `${adminPath}/orders`,
      label: dashboard.adminOrdersStock,
      marker: "M24",
    },
  ];

  function handleSignOut() {
    void signOut()
      .catch(() => undefined)
      .finally(() => router.replace(`/${locale}/login`));
  }

  return (
    <ProtectedRoute roles={["ADMIN"]}>
      <DashboardShell>
        <DashboardSidebar title={dashboard.adminTitle} items={navigation} />
        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardTopbar
            title={dashboard.adminTitle}
            subtitle={dashboard.adminDescription}
            userLabel={adminName || undefined}
            onSignOut={handleSignOut}
            signOutLabel={dict.auth.logoutTitle}
            actions={
              <>
                <Link
                  href={`/${locale}/profile`}
                  className="hidden min-h-10 items-center rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
                >
                  {dashboard.quickProfile}
                </Link>
                <DashboardMobileNav
                  items={navigation}
                  title={dashboard.adminTitle}
                />
              </>
            }
          />
          <main className="flex-1">
            <Container className="py-6 sm:py-8 lg:py-10">
              <PageHeader
                title={welcome}
                description={dashboard.adminWelcomeDescription}
              />

              <section
                className="mt-8 rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-7"
                aria-labelledby="admin-quick-links"
              >
                <div className="flex flex-col gap-1">
                  <h2
                    id="admin-quick-links"
                    className="text-lg font-semibold text-foreground"
                  >
                    {dashboard.adminQuickLinks}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {dashboard.adminQuickLinksDescription}
                  </p>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Link
                    href={`/${locale}/profile`}
                    className="group flex min-h-24 items-center gap-4 rounded-xl border border-border p-4 transition-colors hover:border-brand/40 hover:bg-accent-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-brand" aria-hidden="true">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                        <circle cx="12" cy="8" r="3.5" />
                        <path d="M5 20a7 7 0 0 1 14 0" />
                      </svg>
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-foreground">
                        {dashboard.quickProfile}
                      </span>
                      <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                        {dashboard.adminProfileDescription}
                      </span>
                    </span>
                    <span className="ml-auto shrink-0 text-brand transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true">
                      →
                    </span>
                  </Link>
                  <Link
                    href={`/${locale}/catalog`}
                    className="group flex min-h-24 items-center gap-4 rounded-xl border border-border p-4 transition-colors hover:border-brand/40 hover:bg-accent-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-brand" aria-hidden="true">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                        <path d="M3 9.5 4.5 4h15L21 9.5M5 10v10h14V10M9 20v-6h6v6" />
                        <path d="M3 9.5a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
                      </svg>
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-foreground">
                        {dashboard.browseCatalog}
                      </span>
                      <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                        {dashboard.adminCatalogDescription}
                      </span>
                    </span>
                    <span className="ml-auto shrink-0 text-brand transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true">
                      →
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
