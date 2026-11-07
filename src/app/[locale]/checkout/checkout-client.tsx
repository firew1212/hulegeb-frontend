"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { useDictionary, useLocale } from "@/i18n/provider";
import { getLocalizedApiErrorMessage } from "@/i18n/errors";
import { isApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { checkoutCart, getCart } from "@/lib/api/cart";
import { getOrderStatusLabel, getOrderStatusTone } from "@/lib/dashboard";
import { formatETB } from "@/lib/money";
import type { Cart, CartItem } from "@/types/cart";
import type { BuyerOrder } from "@/types/orders";

const STORAGE_PREFIX = "hulegeb.checkout";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isBuyerOrder(value: unknown): value is BuyerOrder {
  if (!value || typeof value !== "object") return false;
  const order = value as Partial<BuyerOrder>;
  return (
    typeof order.id === "string" &&
    typeof order.status === "string" &&
    (typeof order.total === "string" || typeof order.total === "number") &&
    typeof order.currency === "string" &&
    Array.isArray(order.items) &&
    order.items.every(
      (item) =>
        typeof item.id === "string" &&
        typeof item.productNameEn === "string" &&
        typeof item.productNameAm === "string" &&
        typeof item.variantName === "string" &&
        typeof item.quantity === "number" &&
        (typeof item.lineTotal === "string" ||
          typeof item.lineTotal === "number"),
    )
  );
}

function createIdempotencyKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

export default function CheckoutClient() {
  const dict = useDictionary();
  const locale = useLocale();
  const d = dict.checkout;
  const { status, user } = useAuth();
  const buyerId = user?.id;

  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [cartError, setCartError] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [order, setOrder] = useState<BuyerOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [cartRefreshError, setCartRefreshError] = useState(false);
  const pendingKeyRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  const loadController = useRef<AbortController | null>(null);
  const orderRef = useRef<BuyerOrder | null>(null);

  const loadCart = useCallback(async () => {
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    setLoading(true);
    setCartError(null);
    try {
      const currentCart = await getCart({ signal: controller.signal });
      if (!controller.signal.aborted) {
        if (orderRef.current && currentCart.items.length > 0 && buyerId) {
          try {
            window.localStorage.removeItem(
              `${STORAGE_PREFIX}.${buyerId}.confirmed-order`,
            );
            orderRef.current = null;
            setOrder(null);
            setStorageError(null);
          } catch {
            setStorageError(d.storageError);
          }
        }
        setCart(currentCart);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setCartError(
          getLocalizedApiErrorMessage(error, dict.apiErrors, d.loadError),
        );
      }
    } finally {
      if (loadController.current === controller) {
        loadController.current = null;
        setLoading(false);
      }
    }
  }, [buyerId, d.loadError, d.storageError, dict.apiErrors]);

  useEffect(() => {
    if (status !== "authenticated" || !buyerId) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStorageReady(false);
    setStorageError(null);
    try {
      const prefix = `${STORAGE_PREFIX}.${buyerId}`;
      const savedKey = window.localStorage.getItem(`${prefix}.pending-key`);
      const savedOrder = window.localStorage.getItem(`${prefix}.confirmed-order`);
      const parsedOrder: unknown = savedOrder ? JSON.parse(savedOrder) : null;
      let restoredOrder: BuyerOrder | null = null;
      if (savedKey && !UUID_RE.test(savedKey)) {
        throw new Error("Stored checkout key is invalid.");
      }
      if (parsedOrder !== null) {
        if (!isBuyerOrder(parsedOrder)) {
          throw new Error("Stored checkout response is invalid.");
        }
        restoredOrder = parsedOrder;
      }
      pendingKeyRef.current = savedKey;
      orderRef.current = restoredOrder;
      setPendingKey(savedKey);
      setOrder(restoredOrder);
      setStorageReady(true);
    } catch {
      setStorageError(d.storageError);
      setStorageReady(true);
    }

    void loadCart();
    return () => loadController.current?.abort();
  }, [buyerId, d.storageError, loadCart, status]);

  function productName(item: CartItem): string {
    return locale === "am"
      ? item.productNameAm || item.productNameEn
      : item.productNameEn || item.productNameAm;
  }

  async function placeOrder() {
    if (
      inFlightRef.current ||
      !cart ||
      cart.items.length === 0 ||
      !storageReady ||
      storageError ||
      order ||
      !buyerId
    ) {
      return;
    }

    inFlightRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    setCartRefreshError(false);
    const prefix = `${STORAGE_PREFIX}.${buyerId}`;
    let key = pendingKeyRef.current;

    try {
      if (!key) {
        key = createIdempotencyKey();
        window.localStorage.setItem(`${prefix}.pending-key`, key);
        pendingKeyRef.current = key;
        setPendingKey(key);
      }
    } catch {
      setStorageError(d.storageError);
      setSubmitting(false);
      inFlightRef.current = false;
      return;
    }

    try {
      const confirmedOrder = await checkoutCart(key);
      orderRef.current = confirmedOrder;
      setOrder(confirmedOrder);
      setCart(null);
      try {
        window.localStorage.setItem(
          `${prefix}.confirmed-order`,
          JSON.stringify(confirmedOrder),
        );
        window.localStorage.removeItem(`${prefix}.pending-key`);
        pendingKeyRef.current = null;
        setPendingKey(null);
        setStorageError(null);
      } catch {
        setStorageError(d.successStorageError);
      }
      try {
        setCart(await getCart());
      } catch {
        setCartRefreshError(true);
      }
    } catch (error) {
      if (
        isApiError(error) &&
        [400, 401, 403, 404, 422].includes(error.status)
      ) {
        try {
          window.localStorage.removeItem(`${prefix}.pending-key`);
          pendingKeyRef.current = null;
          setPendingKey(null);
        } catch {
          setStorageError(d.storageError);
        }
      }
      setSubmitError(
        isApiError(error) && error.status === 409
          ? d.conflictError
          : getLocalizedApiErrorMessage(
              error,
              dict.apiErrors,
              d.uncertainError,
            ),
      );
    } finally {
      setSubmitting(false);
      inFlightRef.current = false;
    }
  }

  const productNameForOrder = (item: BuyerOrder["items"][number]) =>
    locale === "am"
      ? item.productNameAm || item.productNameEn
      : item.productNameEn || item.productNameAm;

  return (
    <ProtectedRoute roles={["BUYER"]}>
      <DashboardShell>
        <Container className="py-8 md:py-10">
          <PageHeader title={d.title} description={d.description} />

          {order ? (
            <section
              className="mt-6 rounded-3xl border border-brand/20 bg-surface p-6 shadow-lift sm:p-8"
              aria-labelledby="checkout-success-title"
              role="status"
              aria-live="polite"
            >
              <p className="text-sm font-semibold uppercase tracking-wide text-brand">
                {d.successTitle}
              </p>
              <h2
                id="checkout-success-title"
                className="mt-2 text-xl font-semibold text-foreground"
              >
                {d.successDescription}
              </h2>
              <dl className="mt-6 grid gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-sm text-muted-foreground">
                    {d.orderReference}
                  </dt>
                  <dd className="mt-1 font-medium text-foreground">
                    {order.id.slice(0, 8)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">{d.status}</dt>
                  <dd className="mt-1">
                    <StatusBadge
                      label={getOrderStatusLabel(order.status, dict.dashboard)}
                      tone={getOrderStatusTone(order.status)}
                    />
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">{d.total}</dt>
                  <dd className="mt-1 text-lg font-semibold text-foreground">
                    {formatETB(order.total, locale)} {order.currency}
                  </dd>
                </div>
              </dl>
              {storageError ? (
                <p className="mt-4 text-sm text-warning" role="alert">
                  {storageError}
                </p>
              ) : null}
              {cartRefreshError ? (
                <p className="mt-2 text-sm text-warning" role="alert">
                  {d.cartRefreshError}
                </p>
              ) : null}
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/${locale}/dashboard/buyer/orders/${encodeURIComponent(order.id)}`}
                >
                  <Button className="bg-[#7752F7] hover:bg-[#6843e6]">
                    {d.orderDetails}
                  </Button>
                </Link>
                <Link href={`/${locale}/dashboard/buyer/orders`}>
                  <Button variant="secondary">{d.orderHistory}</Button>
                </Link>
              </div>
              <ul className="mt-6 divide-y divide-border border-t border-border">
                {order.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {productNameForOrder(item)}
                      </p>
                      <p className="text-muted-foreground">
                        {item.variantName} · {d.quantity}: {item.quantity}
                      </p>
                    </div>
                    <p className="font-medium text-foreground">
                      {formatETB(item.lineTotal, locale)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : loading ? (
            <div
              className="mt-6 rounded-2xl border border-border bg-surface p-6"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <div className="h-5 w-48 animate-pulse rounded bg-muted motion-reduce:animate-none" />
              <p className="sr-only">{d.loading}</p>
              <div className="mt-5 h-24 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
            </div>
          ) : cartError ? (
            <div className="mt-6 rounded-2xl border border-danger/30 bg-danger/5 p-6" role="alert">
              <p className="text-sm text-danger">{cartError}</p>
              <Button className="mt-4" onClick={() => void loadCart()}>
                {dict.cart.retry}
              </Button>
            </div>
          ) : !cart || cart.items.length === 0 ? (
            <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
              <p className="text-muted-foreground">{d.empty}</p>
              <Link href={`/${locale}/cart`} className="mt-4 inline-flex">
                <Button variant="secondary">{d.backToCart}</Button>
              </Link>
            </section>
          ) : (
            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <section
                className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6"
                aria-label={d.title}
              >
                <h2 className="text-base font-semibold text-foreground">
                  {d.product}
                </h2>
                <ul className="mt-3 divide-y divide-border">
                  {cart.items.map((item) => (
                    <li
                      key={item.variantId}
                      className="flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          {productName(item)}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {d.variant}: {item.variantName} · {d.quantity}:{" "}
                          {item.quantity}
                        </p>
                      </div>
                      <div className="flex shrink-0 justify-between gap-8 text-sm sm:text-right">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {d.unitPrice}
                          </p>
                          <p className="mt-1 text-foreground">
                            {formatETB(item.unitPrice, locale)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {d.lineTotal}
                          </p>
                          <p className="mt-1 font-semibold text-foreground">
                            {formatETB(item.lineTotal, locale)}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <aside className="h-fit rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
                <h2 className="text-base font-semibold text-foreground">
                  {dict.dashboard.orderSummary}
                </h2>
                <div className="mt-4 flex items-center justify-between gap-4 border-t border-border pt-4">
                  <span className="text-sm text-muted-foreground">
                    {d.subtotal}
                  </span>
                  <span className="text-lg font-semibold text-foreground">
                    {formatETB(cart.total, locale)}
                  </span>
                </div>
                <p className="mt-4 text-xs leading-5 text-muted-foreground">
                  {d.stockNotice}
                </p>
                {storageError ? (
                  <p className="mt-4 text-sm text-danger" role="alert">
                    {storageError}
                  </p>
                ) : null}
                {submitError ? (
                  <p className="mt-4 text-sm text-danger" role="alert">
                    {submitError}
                  </p>
                ) : null}
                {pendingKey && submitError ? (
                  <p className="mt-3 text-xs text-muted-foreground" role="status">
                    {d.uncertainError}
                  </p>
                ) : null}
                <Button
                  type="button"
                  className="mt-5 w-full bg-[#7752F7] hover:bg-[#6843e6]"
                  disabled={
                    submitting ||
                    !storageReady ||
                    Boolean(storageError) ||
                    !cart ||
                    cart.items.length === 0
                  }
                  onClick={() => void placeOrder()}
                >
                  {submitting
                    ? d.placingOrder
                    : pendingKey
                      ? d.retryCheckout
                      : d.placeOrder}
                </Button>
                <Link
                  href={`/${locale}/cart`}
                  className="mt-3 flex justify-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {d.backToCart}
                </Link>
              </aside>
            </div>
          )}
        </Container>
      </DashboardShell>
    </ProtectedRoute>
  );
}
