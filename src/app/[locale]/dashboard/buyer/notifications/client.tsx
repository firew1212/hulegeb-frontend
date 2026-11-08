"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/dashboard/empty-state";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { useDictionary, useLocale } from "@/i18n/provider";
import { getLocalizedApiErrorMessage } from "@/i18n/errors";
import {
  listBuyerNotifications,
  markBuyerNotificationAsRead,
} from "@/lib/api/notifications";
import type { Dictionary } from "@/i18n/dictionaries";
import type { BuyerNotification } from "@/types/notifications";

const LIMIT = 20;
const ORDER_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getNotificationMessage(type: string, d: Dictionary["dashboard"]) {
  switch (type) {
    case "ORDER_CANCELLED":
      return d.orderCancelledNotification;
    case "ORDER_COMPLETED":
      return d.orderCompletedNotification;
    default:
      return d.genericNotification;
  }
}

function formatNotificationDate(createdAt: string, locale: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return createdAt;
  return date.toLocaleString(locale === "am" ? "am-ET" : "en-ET");
}

export default function BuyerNotificationsClient() {
  const dict = useDictionary();
  const locale = useLocale();
  const d = dict.dashboard;

  const [notifications, setNotifications] = useState<BuyerNotification[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [mutationErrors, setMutationErrors] = useState<Record<string, string>>({});
  const [successId, setSuccessId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const pendingIdsRef = useRef(new Set<string>());
  const loadRequestRef = useRef<AbortController | null>(null);

  const load = useCallback(async (requestedPage: number) => {
    loadRequestRef.current?.abort();
    const controller = new AbortController();
    loadRequestRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const data = await listBuyerNotifications(requestedPage, LIMIT, {
        signal: controller.signal,
      });
      if (!controller.signal.aborted) setNotifications(data);
    } catch (loadError) {
      if (!controller.signal.aborted) {
        setError(
          getLocalizedApiErrorMessage(
            loadError,
            dict.apiErrors,
            d.notificationsLoadError,
          ),
        );
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
      if (loadRequestRef.current === controller) loadRequestRef.current = null;
    }
  }, [dict.apiErrors, d.notificationsLoadError]);

  useEffect(() => {
    void load(page);
    return () => loadRequestRef.current?.abort();
  }, [load, page, refreshKey]);

  async function markAsRead(notification: BuyerNotification) {
    if (notification.readAt || pendingIdsRef.current.has(notification.id)) return;

    pendingIdsRef.current.add(notification.id);
    setPendingIds((current) => new Set(current).add(notification.id));
    setMutationErrors((current) => {
      const next = { ...current };
      delete next[notification.id];
      return next;
    });
    setSuccessId(null);
    try {
      await markBuyerNotificationAsRead(notification.id);
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, readAt: new Date().toISOString() }
            : item,
        ),
      );
      setSuccessId(notification.id);
    } catch (mutationError) {
      setMutationErrors((current) => ({
        ...current,
        [notification.id]: getLocalizedApiErrorMessage(
          mutationError,
          dict.apiErrors,
          d.markReadError,
        ),
      }));
    } finally {
      pendingIdsRef.current.delete(notification.id);
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(notification.id);
        return next;
      });
    }
  }

  const hasPreviousPage = page > 1;
  const hasNextPage = notifications.length === LIMIT;

  return (
    <ProtectedRoute roles={["BUYER"]}>
      <DashboardShell>
        <Container className="py-8 md:py-10">
          <PageHeader
            title={d.notificationsTitle}
            description={d.notificationsDescription}
            actions={
              <>
                <Button
                  variant="secondary"
                  disabled={loading}
                  onClick={() => setRefreshKey((current) => current + 1)}
                >
                  {d.refreshNotifications}
                </Button>
                <Link href={`/${locale}/dashboard/buyer`}>
                  <Button variant="ghost">{d.backToOverview}</Button>
                </Link>
              </>
            }
          />

          {loading ? (
            <div className="mt-6 space-y-3" aria-label={dict.common.loading}>
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-2xl border border-border bg-surface"
                />
              ))}
            </div>
          ) : error ? (
            <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
              <p role="alert" className="text-sm text-muted-foreground">{error}</p>
              <Button
                className="mt-3"
                onClick={() => setRefreshKey((current) => current + 1)}
              >
                {d.retry}
              </Button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title={page === 1 ? d.noNotifications : d.noNotificationsOnPage}
              />
            </div>
          ) : (
            <ul className="mt-6 space-y-3">
              {notifications.map((notification) => {
                const unread = notification.readAt === null;
                const orderId =
                  (notification.type === "ORDER_CANCELLED" ||
                    notification.type === "ORDER_COMPLETED") &&
                  notification.resourceId &&
                  ORDER_ID_RE.test(notification.resourceId)
                    ? notification.resourceId
                    : null;
                const marking = pendingIds.has(notification.id);

                return (
                  <li
                    key={notification.id}
                    className={`rounded-2xl border p-5 shadow-soft ${
                      unread
                        ? "border-brand/30 bg-accent-soft/40"
                        : "border-border bg-surface"
                    }`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {unread ? (
                            <span
                              className="h-2 w-2 shrink-0 rounded-full bg-brand"
                              aria-hidden="true"
                            />
                          ) : null}
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {unread ? d.unreadNotification : d.readNotification}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-medium text-foreground">
                          {getNotificationMessage(notification.type, d)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatNotificationDate(notification.createdAt, locale)}
                        </p>
                        {orderId ? (
                          <Link
                            href={`/${locale}/dashboard/buyer/orders/${encodeURIComponent(orderId)}`}
                            className="mt-3 inline-flex text-sm font-medium text-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {d.viewNotificationOrder}
                          </Link>
                        ) : null}
                      </div>

                      {unread ? (
                        <div className="shrink-0 sm:pt-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={marking}
                            onClick={() => void markAsRead(notification)}
                          >
                            {marking ? d.markingAsRead : d.markAsRead}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                    {mutationErrors[notification.id] ? (
                      <p role="alert" className="mt-3 text-sm text-danger">
                        {mutationErrors[notification.id]}
                      </p>
                    ) : null}
                    {successId === notification.id ? (
                      <p role="status" className="mt-3 text-sm text-muted-foreground">
                        {d.markedAsRead}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-6 flex items-center justify-center gap-3">
            <Button
              variant="ghost"
              disabled={!hasPreviousPage || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              {d.previousPage}
            </Button>
            <span className="text-sm text-muted-foreground">
              {d.page} {page}
            </span>
            <Button
              variant="ghost"
              disabled={!hasNextPage || loading || error !== null}
              onClick={() => setPage((current) => current + 1)}
            >
              {d.nextPage}
            </Button>
          </div>
        </Container>
      </DashboardShell>
    </ProtectedRoute>
  );
}
