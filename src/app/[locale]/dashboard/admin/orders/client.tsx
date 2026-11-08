"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

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
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { getLocalizedApiErrorMessage } from "@/i18n/errors";
import { useDictionary, useLocale } from "@/i18n/provider";
import { isApiError } from "@/lib/api";
import {
  confirmAdminOrderStock,
  getAdminOrder,
  listAdminOrders,
  updateAdminOrderStatus,
} from "@/lib/api/orders";
import {
  getOrderStatusLabel,
  getOrderStatusTone,
  getPaymentOptionLabel,
} from "@/lib/dashboard";
import { formatETB } from "@/lib/money";
import { useAuth } from "@/lib/auth-context";
import type { AdminOrder } from "@/types/orders";

const PAGE_SIZE = 20;

type OrderAction = "stock" | "complete" | "cancel";

type Confirmation = {
  order: AdminOrder;
  action: OrderAction;
};

function itemCount(order: AdminOrder): number {
  return order.items.reduce((total, item) => total + item.quantity, 0);
}

export default function AdminOrdersClient() {
  const dict = useDictionary();
  const locale = useLocale();
  const router = useRouter();
  const { user, signOut, refreshSession } = useAuth();
  const copy = dict.dashboard;
  const adminPath = `/${locale}/dashboard/admin`;
  const adminName = user?.firstName.trim() || user?.email || "";
  const navigation: DashboardNavItem[] = [
    { href: adminPath, label: copy.overview },
    {
      href: `${adminPath}/seller-applications`,
      label: copy.adminSellerApplications,
      marker: "M21",
    },
    {
      href: `${adminPath}/categories`,
      label: copy.adminCategories,
      marker: "M22",
    },
    {
      href: `${adminPath}/product-moderation`,
      label: copy.adminProductModeration,
      marker: "M23",
    },
    {
      href: `${adminPath}/orders`,
      label: copy.adminOrdersStock,
      marker: "M24",
    },
  ];

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [processingAction, setProcessingAction] = useState<OrderAction | null>(
    null,
  );
  const selectedOrderIdRef = useRef<string | null>(null);
  const actionInFlight = useRef(false);
  const detailController = useRef<AbortController | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const loadOrders = useCallback(
    async (requestedPage: number, signal?: AbortSignal): Promise<boolean> => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const data = await listAdminOrders(requestedPage, PAGE_SIZE, {
          signal,
        });
        if (signal?.aborted) return false;
        if (data.length === 0 && requestedPage > 1) {
          setPage((current) =>
            current === requestedPage ? requestedPage - 1 : current,
          );
          return false;
        }

        const nextId = data.some(
          (order) => order.id === selectedOrderIdRef.current,
        )
          ? selectedOrderIdRef.current
          : (data[0]?.id ?? null);
        const nextOrder = data.find((order) => order.id === nextId) ?? null;
        selectedOrderIdRef.current = nextId;
        setOrders(data);
        setSelectedOrderId(nextId);
        setSelectedOrder(nextOrder);
        setDetailError(null);
        return true;
      } catch (error) {
        if (!signal?.aborted) {
          if (isApiError(error) && error.status === 401) {
            await refreshSession();
          }
          if (signal?.aborted) return false;
          setLoadError(
            getLocalizedApiErrorMessage(
              error,
              dict.apiErrors,
              copy.adminOrdersLoadError,
            ),
          );
        }
        return false;
      } finally {
        if (!signal?.aborted) setIsLoading(false);
      }
    },
    [copy.adminOrdersLoadError, dict.apiErrors, refreshSession],
  );

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => {
      if (!controller.signal.aborted) {
        void loadOrders(page, controller.signal);
      }
    });
    return () => controller.abort();
  }, [loadOrders, page]);

  useEffect(
    () => () => {
      detailController.current?.abort();
    },
    [],
  );

  const refreshSelectedPage = useCallback(async () => {
    await loadOrders(page);
    const orderId = selectedOrderIdRef.current;
    if (!orderId) return;

    detailController.current?.abort();
    const controller = new AbortController();
    detailController.current = controller;
    setDetailLoading(true);
    try {
      const order = await getAdminOrder(orderId, {
        signal: controller.signal,
      });
      if (
        !controller.signal.aborted &&
        selectedOrderIdRef.current === orderId
      ) {
        setSelectedOrder(order);
        setDetailError(null);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        if (isApiError(error) && error.status === 401) {
          await refreshSession();
        }
        if (controller.signal.aborted) return;
        setDetailError(
          getLocalizedApiErrorMessage(
            error,
            dict.apiErrors,
            copy.adminOrdersDetailLoadError,
          ),
        );
      }
    } finally {
      if (!controller.signal.aborted) setDetailLoading(false);
    }
  }, [
    copy.adminOrdersDetailLoadError,
    dict.apiErrors,
    loadOrders,
    page,
    refreshSession,
  ]);

  useEffect(() => {
    if (!confirmation) {
      previouslyFocused.current?.focus();
      previouslyFocused.current = null;
      return;
    }

    dialogRef.current
      ?.querySelector<HTMLButtonElement>("button:not([disabled])")
      ?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (!actionInFlight.current) setConfirmation(null);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable =
        dialogRef.current?.querySelectorAll<HTMLButtonElement>(
          "button:not([disabled])",
        );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [confirmation]);

  function handleSignOut() {
    void signOut()
      .catch(() => undefined)
      .finally(() => router.replace(`/${locale}/login`));
  }

  async function selectOrder(order: AdminOrder) {
    if (actionInFlight.current) return;
    selectedOrderIdRef.current = order.id;
    setSelectedOrderId(order.id);
    setSelectedOrder(order);
    setDetailError(null);
    setActionError(null);
    setNotice(null);
    setDetailLoading(true);
    detailController.current?.abort();
    const controller = new AbortController();
    detailController.current = controller;
    try {
      const current = await getAdminOrder(order.id, {
        signal: controller.signal,
      });
      if (
        !controller.signal.aborted &&
        selectedOrderIdRef.current === order.id
      ) {
        setSelectedOrder(current);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        if (isApiError(error) && error.status === 401) {
          await refreshSession();
        }
        if (controller.signal.aborted) return;
        setDetailError(
          getLocalizedApiErrorMessage(
            error,
            dict.apiErrors,
            copy.adminOrdersDetailLoadError,
          ),
        );
      }
    } finally {
      if (!controller.signal.aborted) setDetailLoading(false);
    }
  }

  function openConfirmation(action: OrderAction) {
    if (!selectedOrder || actionInFlight.current) return;
    previouslyFocused.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setNotice(null);
    setActionError(null);
    setConfirmation({ order: selectedOrder, action });
  }

  async function submitAction() {
    if (!confirmation || actionInFlight.current) return;
    const pending = confirmation;
    actionInFlight.current = true;
    setProcessingAction(pending.action);
    setNotice(null);
    setActionError(null);

    try {
      let updated: AdminOrder;
      if (pending.action === "stock") {
        updated = await confirmAdminOrderStock(pending.order.id);
        setNotice(copy.adminOrdersStockSuccess);
      } else {
        const status =
          pending.action === "complete" ? "COMPLETED" : "CANCELLED";
        updated = await updateAdminOrderStatus(pending.order.id, status);
        setNotice(
          pending.action === "complete"
            ? copy.adminOrdersCompleteSuccess
            : copy.adminOrdersCancelSuccess,
        );
      }
      selectedOrderIdRef.current = updated.id;
      setSelectedOrderId(updated.id);
      setSelectedOrder(updated);
      setConfirmation(null);
    } catch (error) {
      setConfirmation(null);
      const stateChanged =
        isApiError(error) && (error.status === 409 || error.status === 404);
      if (isApiError(error) && error.status === 401) {
        await refreshSession();
      }
      setActionError(
        isApiError(error) &&
        error.status === 409 &&
        pending.action === "complete"
          ? copy.adminOrdersCompletionConflict
          : stateChanged
            ? copy.adminOrdersConflict
          : getLocalizedApiErrorMessage(
              error,
              dict.apiErrors,
              copy.adminOrdersActionError,
            ),
      );
    } finally {
      await refreshSelectedPage();
      actionInFlight.current = false;
      setProcessingAction(null);
    }
  }

  const pendingOrder = selectedOrder?.status === "PENDING";
  const paymentSelected =
    selectedOrder?.paymentOption === "DEPOSIT" ||
    selectedOrder?.paymentOption === "FULL";
  const canConfirmStock = Boolean(pendingOrder);
  const canComplete = Boolean(pendingOrder && paymentSelected);
  const canCancel = Boolean(pendingOrder);
  const hasNextPage = orders.length === PAGE_SIZE;
  const pendingCount = orders.filter(
    (order) => order.status === "PENDING",
  ).length;
  const completedCount = orders.filter(
    (order) => order.status === "COMPLETED",
  ).length;
  const cancelledCount = orders.filter(
    (order) => order.status === "CANCELLED",
  ).length;
  const formattedDate = (date: string) =>
    new Intl.DateTimeFormat(locale === "am" ? "am-ET" : "en-ET", {
      dateStyle: "medium",
    }).format(new Date(date));

  const confirmationTitle =
    confirmation?.action === "stock"
      ? copy.adminOrdersConfirmStockTitle
      : confirmation?.action === "complete"
        ? copy.adminOrdersCompleteTitle
        : copy.adminOrdersCancelTitle;
  const confirmationDescription =
    confirmation?.action === "stock"
      ? copy.adminOrdersConfirmStockDescription
      : confirmation?.action === "complete"
        ? copy.adminOrdersCompleteDescription
        : copy.adminOrdersCancelDescription;

  return (
    <ProtectedRoute roles={["ADMIN"]}>
      <DashboardShell>
        <DashboardSidebar title={copy.adminTitle} items={navigation} />
        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardTopbar
            title={copy.adminTitle}
            subtitle={copy.adminDescription}
            userLabel={adminName || undefined}
            onSignOut={handleSignOut}
            signOutLabel={dict.auth.logoutTitle}
            actions={
              <>
                <Link
                  href={`/${locale}/profile`}
                  className="hidden min-h-10 items-center rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
                >
                  {copy.quickProfile}
                </Link>
                <DashboardMobileNav
                  items={navigation}
                  title={copy.adminTitle}
                />
              </>
            }
          />
          <main className="flex-1">
            <Container className="py-6 sm:py-8 lg:py-10">
              <PageHeader
                title={copy.adminOrdersTitle}
                description={copy.adminOrdersDescription}
                actions={
                  <Button
                    variant="secondary"
                    disabled={isLoading || processingAction !== null}
                    onClick={() => {
                      setNotice(null);
                      setActionError(null);
                      void refreshSelectedPage();
                    }}
                  >
                    {isLoading ? copy.adminOrdersLoading : copy.adminOrdersRefresh}
                  </Button>
                }
              />

              {loadError ? (
                <div
                  className="mt-5 flex flex-col gap-3 rounded-xl border border-danger/30 bg-danger-soft/40 p-4 text-sm text-danger sm:flex-row sm:items-center sm:justify-between"
                  role="alert"
                >
                  <span>{loadError}</span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void refreshSelectedPage()}
                  >
                    {copy.adminOrdersRetry}
                  </Button>
                </div>
              ) : null}
              {actionError ? (
                <p
                  className="mt-5 rounded-xl border border-danger/30 bg-danger-soft/40 p-4 text-sm text-danger"
                  role="alert"
                >
                  {actionError}
                </p>
              ) : null}
              {notice ? (
                <p
                  className="mt-5 rounded-xl border border-success/30 bg-success-soft/50 p-4 text-sm text-success"
                  role="status"
                  aria-live="polite"
                >
                  {notice}
                </p>
              ) : null}

              <section
                className="mt-6 grid gap-3 sm:grid-cols-3"
                aria-label={copy.adminOrdersShowing.replace(
                  "{count}",
                  String(orders.length),
                )}
              >
                {[
                  {
                    label: copy.statusPending,
                    count: pendingCount,
                    tone: "info" as const,
                  },
                  {
                    label: copy.statusCompleted,
                    count: completedCount,
                    tone: "success" as const,
                  },
                  {
                    label: copy.statusCancelled,
                    count: cancelledCount,
                    tone: "danger" as const,
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 shadow-soft"
                  >
                    <StatusBadge label={stat.label} tone={stat.tone} />
                    <span className="text-xl font-semibold tabular-nums text-foreground">
                      {stat.count}
                    </span>
                  </div>
                ))}
              </section>

              <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
                {copy.adminOrdersShowing.replace(
                  "{count}",
                  String(orders.length),
                )}
              </p>

              <div className="mt-3 grid items-start gap-5 lg:grid-cols-[minmax(18rem,0.82fr)_minmax(0,1.4fr)]">
                <section
                  className="min-w-0 rounded-2xl border border-border bg-surface p-4 shadow-soft sm:p-5"
                  aria-labelledby="admin-orders-list-title"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h2
                      id="admin-orders-list-title"
                      className="text-base font-semibold text-foreground"
                    >
                      {copy.adminOrdersListTitle}
                    </h2>
                    <span className="text-xs text-muted-foreground">
                      {copy.page} {page}
                    </span>
                  </div>

                  {isLoading && orders.length === 0 ? (
                    <p className="mt-5 animate-pulse text-sm text-muted-foreground">
                      {copy.adminOrdersLoading}
                    </p>
                  ) : orders.length === 0 ? (
                    <div className="mt-5 rounded-xl bg-muted/60 p-4">
                      <p className="font-medium text-foreground">
                        {copy.adminOrdersEmptyTitle}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {copy.adminOrdersEmptyDescription}
                      </p>
                    </div>
                  ) : (
                    <ul className="mt-4 max-h-[36rem] space-y-2 overflow-y-auto pr-1">
                      {orders.map((order) => {
                        const selected = order.id === selectedOrderId;
                        return (
                          <li key={order.id}>
                            <button
                              type="button"
                              aria-pressed={selected}
                              onClick={() => void selectOrder(order)}
                              className={`w-full rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                selected
                                  ? "border-brand/50 bg-accent-soft/50"
                                  : "border-border hover:border-brand/30 hover:bg-muted/60"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-semibold text-foreground">
                                    {copy.adminOrdersReference}{" "}
                                    {order.id.slice(0, 8).toUpperCase()}
                                  </span>
                                  <span className="mt-1 block text-xs text-muted-foreground">
                                    {formattedDate(order.createdAt)} ·{" "}
                                    {copy.adminOrdersItemCount.replace(
                                      "{count}",
                                      String(itemCount(order)),
                                    )}
                                  </span>
                                </span>
                                <StatusBadge
                                  label={getOrderStatusLabel(order.status, copy)}
                                  tone={getOrderStatusTone(order.status)}
                                  className="shrink-0"
                                />
                              </div>
                              <span className="mt-3 block text-sm font-semibold text-foreground">
                                {formatETB(order.total, locale)}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={page <= 1 || isLoading || processingAction !== null}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                    >
                      {copy.adminOrdersPrevious}
                    </Button>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {copy.page} {page}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={
                        !hasNextPage || isLoading || processingAction !== null
                      }
                      onClick={() => setPage((current) => current + 1)}
                    >
                      {copy.adminOrdersNext}
                    </Button>
                  </div>
                </section>

                <section
                  className="min-w-0 rounded-2xl border border-border bg-surface p-4 shadow-soft sm:p-6"
                  aria-labelledby="admin-order-details-title"
                >
                  {selectedOrder ? (
                    <>
                      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h2
                            id="admin-order-details-title"
                            className="text-lg font-semibold text-foreground"
                          >
                            {copy.adminOrdersDetailsTitle}
                          </h2>
                          <p className="mt-1 break-all text-sm text-muted-foreground">
                            {selectedOrder.id}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {copy.adminOrdersDate}:{" "}
                            {formattedDate(selectedOrder.createdAt)}
                          </p>
                        </div>
                        <StatusBadge
                          label={getOrderStatusLabel(selectedOrder.status, copy)}
                          tone={getOrderStatusTone(selectedOrder.status)}
                        />
                      </div>

                      {detailLoading ? (
                        <p
                          className="mt-3 text-xs text-muted-foreground"
                          aria-live="polite"
                        >
                          {copy.adminOrdersLoading}
                        </p>
                      ) : null}
                      {detailError ? (
                        <p
                          className="mt-3 rounded-lg bg-danger-soft/40 p-3 text-sm text-danger"
                          role="alert"
                        >
                          {detailError}
                        </p>
                      ) : null}

                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full min-w-[32rem] text-left text-sm">
                          <thead className="border-b border-border text-xs text-muted-foreground">
                            <tr>
                              <th className="pb-2 pr-3 font-medium">
                                {copy.adminOrdersItems}
                              </th>
                              <th className="pb-2 px-2 text-right font-medium">
                                {copy.adminOrdersQuantity}
                              </th>
                              <th className="pb-2 px-2 text-right font-medium">
                                {copy.adminOrdersUnitPrice}
                              </th>
                              <th className="pb-2 pl-2 text-right font-medium">
                                {copy.total}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {selectedOrder.items.map((item) => {
                              const productName =
                                locale === "am"
                                  ? item.productNameAm || item.productNameEn
                                  : item.productNameEn || item.productNameAm;
                              return (
                                <tr key={item.id}>
                                  <td className="py-3 pr-3">
                                    <span className="block font-medium text-foreground">
                                      {productName}
                                    </span>
                                    <span className="mt-0.5 block text-xs text-muted-foreground">
                                      {item.variantName}
                                    </span>
                                  </td>
                                  <td className="px-2 py-3 text-right tabular-nums text-foreground">
                                    {item.quantity}
                                  </td>
                                  <td className="px-2 py-3 text-right tabular-nums text-muted-foreground">
                                    {formatETB(item.unitPrice, locale)}
                                  </td>
                                  <td className="pl-2 py-3 text-right font-medium tabular-nums text-foreground">
                                    {formatETB(item.lineTotal, locale)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl bg-muted/60 p-4">
                          <p className="text-xs font-medium text-muted-foreground">
                            {copy.adminOrdersPaymentOption}
                          </p>
                          <p className="mt-1 font-semibold text-foreground">
                            {getPaymentOptionLabel(
                              selectedOrder.paymentOption,
                              copy,
                            )}
                          </p>
                          {selectedOrder.paymentAmount !== null ? (
                            <p className="mt-2 text-sm text-muted-foreground">
                              {copy.adminOrdersAmountDue}:{" "}
                              {formatETB(selectedOrder.paymentAmount, locale)}
                            </p>
                          ) : null}
                        </div>
                        <div className="rounded-xl bg-muted/60 p-4">
                          <p className="text-xs font-medium text-muted-foreground">
                            {copy.adminOrdersReference}
                          </p>
                          <p className="mt-1 break-all text-sm font-medium text-foreground">
                            {selectedOrder.id}
                          </p>
                        </div>
                      </div>

                      <p className="mt-3 rounded-xl border border-border bg-surface p-3 text-sm text-muted-foreground">
                        {copy.adminOrdersBuyerDetailsUnavailable}
                      </p>

                      <div className="mt-4 rounded-xl border border-brand/20 bg-accent-soft/30 p-4">
                        <h3 className="text-sm font-semibold text-foreground">
                          {copy.adminOrdersStockSection}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {selectedOrder.status === "COMPLETED"
                            ? copy.adminOrdersCompletedStockRetained
                            : selectedOrder.status === "CANCELLED"
                              ? copy.adminOrdersCancelledStockRestored
                              : copy.adminOrdersStockStateUnknown}
                        </p>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          variant="accent"
                          disabled={
                            !canConfirmStock ||
                            processingAction !== null ||
                            isLoading ||
                            detailLoading
                          }
                          onClick={() => openConfirmation("stock")}
                        >
                          {copy.adminOrdersConfirmStock}
                        </Button>
                        <Button
                          disabled={
                            !canComplete ||
                            processingAction !== null ||
                            isLoading ||
                            detailLoading
                          }
                          onClick={() => openConfirmation("complete")}
                        >
                          {copy.adminOrdersComplete}
                        </Button>
                        <Button
                          variant="secondary"
                          className="border-danger/30 text-danger hover:bg-danger-soft/50"
                          disabled={
                            !canCancel ||
                            processingAction !== null ||
                            isLoading ||
                            detailLoading
                          }
                          onClick={() => openConfirmation("cancel")}
                        >
                          {copy.adminOrdersCancelOrder}
                        </Button>
                      </div>
                      {pendingOrder && !canComplete ? (
                        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                          {copy.adminOrdersCompleteUnavailable}
                        </p>
                      ) : null}
                      {!pendingOrder ? (
                        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                          {copy.adminOrdersActionsUnavailable}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <div className="py-10 text-center">
                      <h2
                        id="admin-order-details-title"
                        className="text-lg font-semibold text-foreground"
                      >
                        {copy.adminOrdersDetailsTitle}
                      </h2>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {isLoading
                          ? copy.adminOrdersLoading
                          : copy.adminOrdersEmptyDescription}
                      </p>
                    </div>
                  )}
                </section>
              </div>
            </Container>
          </main>
        </div>
      </DashboardShell>

      {confirmation ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 p-4">
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-order-confirmation-title"
            aria-describedby="admin-order-confirmation-description"
            className="w-full max-w-lg rounded-2xl border border-border bg-surface p-5 shadow-xl sm:p-6"
          >
            <h2
              id="admin-order-confirmation-title"
              className="text-lg font-semibold text-foreground"
            >
              {confirmationTitle}
            </h2>
            <p
              id="admin-order-confirmation-description"
              className="mt-2 text-sm leading-relaxed text-muted-foreground"
            >
              {confirmationDescription}
            </p>
            <p className="mt-3 text-sm font-medium text-foreground">
              {copy.adminOrdersReference}{" "}
              {confirmation.order.id.slice(0, 8).toUpperCase()}
            </p>
            {processingAction ? (
              <p className="mt-3 text-sm text-muted-foreground" aria-live="polite">
                {copy.adminOrdersProcessing}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                variant="secondary"
                disabled={processingAction !== null}
                onClick={() => setConfirmation(null)}
              >
                {copy.adminOrdersCancelDialog}
              </Button>
              <Button
                disabled={processingAction !== null}
                onClick={() => void submitAction()}
              >
                {processingAction
                  ? copy.adminOrdersProcessing
                  : copy.adminOrdersConfirmAction}
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </ProtectedRoute>
  );
}
