"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { Container } from "@/components/ui/container";
import { useDictionary, useLocale } from "@/i18n/provider";
import { Button } from "@/components/ui/button";

type DashboardRole = "SELLER" | "ADMIN";

export function RoleDashboard({ role }: { role: DashboardRole }) {
  const { dashboard } = useDictionary();
  const locale = useLocale();
  const isSeller = role === "SELLER";

  return (
    <ProtectedRoute roles={[role]}>
      <DashboardShell>
        <Container className="py-8 md:py-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <PageHeader
              title={isSeller ? dashboard.sellerTitle : dashboard.adminTitle}
              description={
                isSeller
                  ? dashboard.sellerDescription
                  : dashboard.adminDescription
              }
            />
            <Button href={`/${locale}/profile`} variant="secondary">
              {dashboard.quickProfile}
            </Button>
          </div>
        </Container>
      </DashboardShell>
    </ProtectedRoute>
  );
}
