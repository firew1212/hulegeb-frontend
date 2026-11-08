"use client";

import { useMemo } from "react";

import { DashboardMobileNav } from "@/components/dashboard/dashboard-mobile-nav";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  DashboardSidebar,
  type DashboardNavItem,
} from "@/components/dashboard/dashboard-sidebar";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { Container } from "@/components/ui/container";
import { useDictionary, useLocale } from "@/i18n/provider";
import { useAuth } from "@/lib/auth-context";

export function SellerWorkspace({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  const dict = useDictionary();
  const locale = useLocale();
  const { user } = useAuth();
  const sellerName = user?.firstName.trim() || user?.email || "";
  const navigation = useMemo<DashboardNavItem[]>(
    () => [
      { href: `/${locale}/dashboard/seller`, label: dict.dashboard.overview },
      {
        href: `/${locale}/dashboard/seller/products`,
        label: dict.dashboard.sellerProducts,
      },
      {
        href: `/${locale}/dashboard/seller/notifications`,
        label: dict.dashboard.sellerNotifications,
      },
      { href: `/${locale}/catalog`, label: dict.dashboard.browseCatalog },
      { href: `/${locale}/profile`, label: dict.dashboard.quickProfile },
    ],
    [dict.dashboard, locale],
  );

  return (
    <DashboardShell>
      <DashboardSidebar title={dict.dashboard.sellerTitle} items={navigation} />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopbar
          title={title}
          subtitle={dict.dashboard.sellerOverview}
          userLabel={sellerName || undefined}
          actions={
            <DashboardMobileNav
              items={navigation}
              title={dict.dashboard.sellerTitle}
            />
          }
        />
        <main className="flex-1">
          <Container className="py-6 sm:py-8 lg:py-10">{children}</Container>
        </main>
      </div>
    </DashboardShell>
  );
}
