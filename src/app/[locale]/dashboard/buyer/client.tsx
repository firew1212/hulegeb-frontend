"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useDictionary, useLocale } from "@/i18n/provider";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { getLocalizedApiErrorMessage } from "@/i18n/errors";
import { listBuyerOrders } from "@/lib/api/orders";
import { getOrderStatusLabel, getOrderStatusTone } from "@/lib/dashboard";
import { formatETB } from "@/lib/money";
import type { BuyerOrder } from "@/types/orders";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export default function BuyerDashboardClient() {
  const dict = useDictionary();
  const locale = useLocale();
  const { user } = useAuth();
  const d = dict.dashboard;

  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listBuyerOrders(1, 5);
      setOrders(data);
    } catch (err) {
      setError(getLocalizedApiErrorMessage(err, dict.apiErrors, d.loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstName = user?.firstName ?? "";

  return (
    <ProtectedRoute roles={["BUYER"]}>
      <DashboardShell>
        <Container className="py-8 md:py-10">
          <PageHeader title={d.buyerTitle} description={d.buyerDescription} />
          <div className="mt-6">
            <h1 className="text-2xl font-semibold text-foreground">
              {d.buyerWelcome.replace("{name}", firstName)}
            </h1>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Link href={`/${locale}/dashboard/buyer/orders`} className="rounded-2xl border border-border bg-surface p-5 shadow-soft transition hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none">
              <p className="text-sm font-medium text-foreground">{d.quickOrders}</p>
            </Link>
            <Link href={`/${locale}/catalog`} className="rounded-2xl border border-border bg-surface p-5 shadow-soft transition hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none">
              <p className="text-sm font-medium text-foreground">{d.quickCart}</p>
            </Link>
            <Link href={`/${locale}/profile`} className="rounded-2xl border border-border bg-surface p-5 shadow-soft transition hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none">
              <p className="text-sm font-medium text-foreground">{d.quickProfile}</p>
            </Link>
          </div>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-foreground">{d.recentOrders}</h2>
            {loading ? (
              <div className="mt-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-2xl border border-border bg-surface" />
                ))}
              </div>
            ) : error ? (
              <div className="mt-4 rounded-2xl border border-border bg-surface p-6">
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button className="mt-3" onClick={() => void load()}>
                  {d.retry}
                </Button>
              </div>
            ) : orders.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title={d.noOrders}
                  action={
                    <Link href={`/${locale}/catalog`}>
                      <Button>{d.browseCatalog}</Button>
                    </Link>
                  }
                />
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {orders.map((order) => (
                  <li key={order.id}>
                    <Link
                      href={`/${locale}/dashboard/buyer/orders/${order.id}`}
                      className="block rounded-2xl border border-border bg-surface p-5 shadow-soft transition hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {d.orderRef} {order.id.slice(0, 8)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString(locale === "am" ? "am-ET" : "en-ET")} · {order.items.length} {d.items}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge label={getOrderStatusLabel(order.status, d)} tone={getOrderStatusTone(order.status)} />
                          <p className="text-sm font-semibold text-foreground">
                            {formatETB(order.total, locale)} {order.currency}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </Container>
      </DashboardShell>
    </ProtectedRoute>
  );
}
