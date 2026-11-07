"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { useDictionary, useLocale } from "@/i18n/provider";
import { getLocalizedApiErrorMessage } from "@/i18n/errors";
import { isApiError } from "@/lib/api";
import { getCart, removeCartItem, updateCartItem } from "@/lib/api/cart";
import { formatETB } from "@/lib/money";
import type { Cart, CartItem } from "@/types/cart";

const MAX_QUANTITY = 10;

function localeTag(locale: string) {
  return locale === "am" ? "am-ET" : "en-ET";
}

export default function CartClient() {
  const dict = useDictionary();
  const locale = useLocale();
  const d = dict.cart;

  const [cart, setCart] = useState<Cart | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [busyItems, setBusyItems] = useState<Set<string>>(() => new Set());
  const [mutationPending, setMutationPending] = useState(false);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const mutationInFlight = useRef(false);
  const loadController = useRef<AbortController | null>(null);

  const items = cart?.items ?? [];

  const loadCart = useCallback(async () => {
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    setLoading(true);
    setError(null);

    try {
      const nextCart = await getCart({ signal: controller.signal });
      if (controller.signal.aborted) return;
      setCart(nextCart);
      setDrafts(
        Object.fromEntries(
          nextCart.items.map((item) => [item.variantId, String(item.quantity)]),
        ),
      );
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(getLocalizedApiErrorMessage(err, dict.apiErrors, d.error));
    } finally {
      if (loadController.current === controller) {
        loadController.current = null;
        setLoading(false);
      }
    }
  }, [d.error, dict.apiErrors]);

  useEffect(() => {
    void loadCart();
    return () => loadController.current?.abort();
  }, [loadCart]);

  function productName(item: CartItem): string {
    return locale === "am"
      ? item.productNameAm || item.productNameEn
      : item.productNameEn || item.productNameAm;
  }

  function maxAllowed(item: CartItem): number {
    return Math.min(MAX_QUANTITY, Math.max(0, item.stockQuantity));
  }

  function isBusy(variantId: string): boolean {
    return busyItems.has(variantId);
  }

  function updateDrafts(nextCart: Cart, changedVariantId?: string) {
    setDrafts((current) =>
      Object.fromEntries(
        nextCart.items.map((item) => [
          item.variantId,
          item.variantId === changedVariantId
            ? String(item.quantity)
            : current[item.variantId] ?? String(item.quantity),
        ]),
      ),
    );
  }

  async function mutateItem(
    item: CartItem,
    action: () => Promise<Cart>,
    successMessage: string,
    failureMessage: string,
  ) {
    if (mutationInFlight.current) return;
    mutationInFlight.current = true;
    loadController.current?.abort();
    setMutationPending(true);
    setBusyItems((current) => new Set(current).add(item.variantId));
    setAnnouncement(null);
    setItemErrors((current) => {
      const next = { ...current };
      delete next[item.variantId];
      return next;
    });

    try {
      const nextCart = await action();
      setCart(nextCart);
      updateDrafts(nextCart, item.variantId);
      setAnnouncement(successMessage);
    } catch (err) {
      if (isApiError(err) && err.status === 404) {
        void loadCart();
        return;
      }
      setItemErrors((current) => ({
        ...current,
        [item.variantId]: getLocalizedApiErrorMessage(
          err,
          dict.apiErrors,
          failureMessage,
        ),
      }));
      setDrafts((current) => ({
        ...current,
        [item.variantId]: String(item.quantity),
      }));
    } finally {
      mutationInFlight.current = false;
      setMutationPending(false);
      setBusyItems((current) => {
        const next = new Set(current);
        next.delete(item.variantId);
        return next;
      });
    }
  }

  function setQuantity(item: CartItem, quantity: number) {
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > maxAllowed(item)
    ) {
      setItemErrors((current) => ({
        ...current,
        [item.variantId]:
          quantity > item.stockQuantity
            ? d.quantityExceedsStock.replace(
                "{count}",
                new Intl.NumberFormat(localeTag(locale)).format(
                  item.stockQuantity,
                ),
              )
            : d.quantityInvalid,
      }));
      setDrafts((current) => ({
        ...current,
        [item.variantId]: String(item.quantity),
      }));
      return;
    }

    setItemErrors((current) => {
      const next = { ...current };
      delete next[item.variantId];
      return next;
    });

    if (quantity === item.quantity || !item.isAvailable) {
      setDrafts((current) => ({
        ...current,
        [item.variantId]: String(item.quantity),
      }));
      return;
    }

    void mutateItem(
      item,
      () => updateCartItem(item.variantId, quantity),
      d.updated,
      d.updateFailed,
    );
  }

  function handleQuantityBlur(item: CartItem) {
    const value = drafts[item.variantId] ?? String(item.quantity);
    const quantity = Number(value);
    if (value.trim() === "" || !Number.isInteger(quantity)) {
      setQuantity(item, Number.NaN);
      return;
    }
    setQuantity(item, quantity);
  }

  function stockText(item: CartItem): string | null {
    if (!item.isAvailable || item.stockQuantity <= 0) {
      return d.stockUnavailable;
    }
    if (item.stockQuantity <= MAX_QUANTITY) {
      return d.stockLow.replace(
        "{count}",
        new Intl.NumberFormat(localeTag(locale)).format(item.stockQuantity),
      );
    }
    return null;
  }

  const minusIcon = (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M2 7.5h12v1H2z" />
    </svg>
  );
  const plusIcon = (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 4v8M4 8h8" />
    </svg>
  );

  return (
    <ProtectedRoute roles={["BUYER"]}>
      <DashboardShell>
        <Container className="py-8 md:py-10">
          <PageHeader title={d.title} />

          {loading && !cart ? (
            <div
              className="mt-6 space-y-4"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <span className="sr-only">{d.loading}</span>
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  aria-hidden="true"
                  className="rounded-2xl border border-border bg-surface p-6 shadow-soft"
                >
                  <div className="flex gap-4">
                    <div className="h-10 w-40 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
                    <div className="flex-1 space-y-3">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                      <div className="h-4 w-1/3 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between">
                    <div className="h-8 w-24 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                    <div className="h-8 w-24 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {error && !cart ? (
            <div
              className="mt-6 rounded-2xl border border-danger/30 bg-danger/5 p-6 text-center"
              role="alert"
            >
              <p className="text-sm text-danger">{error}</p>
              <Button
                className="mt-4"
                disabled={mutationPending}
                onClick={() => void loadCart()}
              >
                {d.retry}
              </Button>
            </div>
          ) : null}

          {error && cart ? (
            <div className="mt-6 rounded-xl border border-danger/30 bg-danger/5 p-4" role="alert">
              <p className="text-sm text-danger">{error}</p>
              <Button
                className="mt-3"
                variant="secondary"
                disabled={mutationPending}
                onClick={() => void loadCart()}
              >
                {d.retry}
              </Button>
            </div>
          ) : null}

          {announcement ? (
            <p className="mt-4 text-sm text-brand" role="status" aria-live="polite">
              {announcement}
            </p>
          ) : null}

          {cart && items.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title={d.empty}
                action={
                  <Link href={`/${locale}/catalog`}>
                    <Button>{d.browseCatalog}</Button>
                  </Link>
                }
              />
            </div>
          ) : null}

          {cart && items.length > 0 ? (
            <>
              {loading ? (
                <p className="mt-4 text-sm text-muted-foreground" role="status">
                  {d.loading}
                </p>
              ) : null}
              <ul className="mt-6 space-y-4" role="list">
                {items.map((item) => {
                  const maxQuantity = maxAllowed(item);
                  const quantity = Number(
                    drafts[item.variantId] ?? String(item.quantity),
                  );
                  const busy = isBusy(item.variantId);
                  const unavailable =
                    !item.isAvailable || item.stockQuantity <= 0;

                  return (
                    <li
                      key={item.variantId}
                      className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6"
                    >
                      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground">
                            {productName(item)}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.variantName}
                          </p>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {d.unitPrice}: {formatETB(item.unitPrice, locale)}
                          </p>
                          {stockText(item) ? (
                            <p className="mt-1 text-xs font-medium text-warning">
                              {stockText(item)}
                            </p>
                          ) : null}
                          {itemErrors[item.variantId] ? (
                            <p className="mt-2 text-sm text-danger" role="alert">
                              {itemErrors[item.variantId]}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-4 sm:justify-end">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={
                                mutationPending || quantity <= 1 || unavailable
                              }
                              aria-label={d.decreaseQuantity}
                              onClick={() =>
                                setQuantity(item, item.quantity - 1)
                              }
                            >
                              {minusIcon}
                            </Button>
                            <input
                              type="number"
                              min={1}
                              max={maxQuantity}
                              value={
                                drafts[item.variantId] ?? String(item.quantity)
                              }
                              onChange={(event) =>
                                setDrafts((current) => ({
                                  ...current,
                                  [item.variantId]: event.target.value,
                                }))
                              }
                              onBlur={() => handleQuantityBlur(item)}
                              aria-label={d.quantity}
                              disabled={mutationPending || unavailable}
                              className="h-10 w-16 rounded-xl border border-border bg-surface px-2 text-center text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={
                                mutationPending ||
                                quantity >= maxQuantity ||
                                unavailable
                              }
                              aria-label={d.increaseQuantity}
                              onClick={() =>
                                setQuantity(item, item.quantity + 1)
                              }
                            >
                              {plusIcon}
                            </Button>
                          </div>
                          <div className="min-w-28 text-right">
                            <p className="text-xs text-muted-foreground">
                              {d.lineTotal}
                            </p>
                            <p className="font-semibold text-foreground">
                              {formatETB(item.lineTotal, locale)}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={mutationPending}
                            onClick={() =>
                              void mutateItem(
                                item,
                                () => removeCartItem(item.variantId),
                                d.removed,
                                d.removeFailed,
                              )
                            }
                            className="text-danger"
                            aria-label={`${d.remove} ${productName(item)}`}
                          >
                            {busy ? d.updating : d.remove}
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <section
                className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6"
                aria-label={d.subtotal}
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-sm font-medium text-muted-foreground">
                      {d.subtotal}
                    </h2>
                    <p className="text-lg font-semibold text-foreground">
                      {formatETB(cart.total, locale)}
                    </p>
                  </div>
                  <Link href={`/${locale}/checkout`}>
                    <Button className="w-full bg-[#7752F7] hover:bg-[#6843e6] sm:w-auto">
                      {d.checkout}
                    </Button>
                  </Link>
                </div>
              </section>
            </>
          ) : null}
        </Container>
      </DashboardShell>
    </ProtectedRoute>
  );
}
