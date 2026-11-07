"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useDictionary, useLocale } from "@/i18n/provider";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { getLocalizedApiErrorMessage } from "@/i18n/errors";
import { listBuyerOrders } from "@/lib/api/orders";
import { getOrderStatusLabel, getOrderStatusTone, getPaymentOptionLabel } from "@/lib/dashboard";
import { formatETB } from "@/lib/money";
import type { BuyerOrder } from "@/types/orders";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

const LIMIT = 20;

export default function BuyerOrdersClient() {
  const dict = useDictionary();
  const locale = useLocale();
  const d = dict.dashboard;

  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await listBuyerOrders(p, LIMIT);
      setOrders(data);
    } catch (err) {
      setError(getLocalizedApiErrorMessage(err, dict.apiErrors, d.loadError));
    } finally {
      setLoading(false);
    }
  }, [d.loadError, dict.apiErrors]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(page);
  }, [page, load]);

  const hasPrev = page > 1;
  const hasNext = orders.length >= LIMIT;

  return (
    <ProtectedRoute roles={["BUYER"]}>
      <DashboardShell>
        <Container className="py-8 md:py-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <PageHeader title={d.buyerOrdersTitle} description={d.buyerOrdersDescription} />
            <Link href={`/${locale}/dashboard/buyer`}>
              <Button variant="ghost">{d.backToOverview}</Button>
            </Link>
          </div>

          {loading ? (
            <div className="mt-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl border border-border bg-surface" />
              ))}
            </div>
          ) : error ? (
            <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button className="mt-3" onClick={() => void load(page)}>
                {d.retry}
              </Button>
            </div>
          ) : orders.length === 0 ? (
            <div className="mt-6">
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
            <>
              <ul className="mt-6 space-y-3">
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
                            {d.orderDate}: {new Date(order.createdAt).toLocaleDateString(locale === "am" ? "am-ET" : "en-ET")} · {order.items.length} {d.items}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {d.paymentOptionLabel}: {getPaymentOptionLabel(order.paymentOption, d)}
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
              <div className="mt-6 flex items-center justify-center gap-3">
                <Button variant="ghost" disabled={!hasPrev} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  {d.previousPage}
                </Button>
                <span className="text-sm text-muted-foreground">{d.page} {page}</span>
                <Button variant="ghost" disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>
                  {d.nextPage}
                </Button>
              </div>
            </>
          )}
        </Container>
      </DashboardShell>
    </ProtectedRoute>
  );
}
