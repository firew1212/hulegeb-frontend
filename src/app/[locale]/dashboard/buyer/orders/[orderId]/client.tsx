"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useDictionary, useLocale } from "@/i18n/provider";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { getLocalizedApiErrorMessage } from "@/i18n/errors";
import { getBuyerOrder, selectPaymentOption, getOfficialContact } from "@/lib/api/orders";
import { isApiError } from "@/lib/api";
import {
  getOrderStatusLabel,
  getOrderStatusTone,
  getPaymentOptionLabel,
} from "@/lib/dashboard";
import type { BuyerOrder, OrderContact } from "@/types/orders";
import { formatETB } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getPhoneHref(value: string): string | null {
  if (!/^\+?[\d\s().-]+$/.test(value)) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return `tel:${value.replace(/[^\d+]/g, "")}`;
}

function getTelegramHref(value: string): string | null {
  const username =
    /^(?:https?:\/\/)?(?:www\.)?t\.me\/([A-Za-z0-9_]{5,32})\/?$/i.exec(value)?.[1] ??
    /^@?([A-Za-z0-9_]{5,32})$/.exec(value)?.[1];
  return username ? `https://t.me/${username}` : null;
}

export default function BuyerOrderDetailClient() {
  const params = useParams<{ orderId: string }>();
  const orderId = params?.orderId ?? "";
  const locale = useLocale();
  const dict = useDictionary();
  const d = dict.dashboard;

  const [order, setOrder] = useState<BuyerOrder | null>(null);
  const [contact, setContact] = useState<OrderContact | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactAttempt, setContactAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const payingRef = useRef(false);

  const valid = UUID_RE.test(orderId);

  const load = useCallback(async () => {
    if (!valid) { setError(d.invalidOrderId); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const data = await getBuyerOrder(orderId);
      setOrder(data);
    } catch (err) {
      setError(
        isApiError(err) && err.status === 404
          ? d.orderNotFound
          : getLocalizedApiErrorMessage(err, dict.apiErrors, d.orderLoadError),
      );
    } finally { setLoading(false); }
  }, [
    dict.apiErrors,
    d.invalidOrderId,
    d.orderNotFound,
    d.orderLoadError,
    orderId,
    valid,
  ]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const contactOrderId = order?.id;
  const selectedPaymentOption = order?.paymentOption;
  useEffect(() => {
    if (!contactOrderId || !selectedPaymentOption) return;

    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      setContact(null);
      setContactError(null);
      setContactLoading(true);
      try {
        const officialContact = await getOfficialContact(contactOrderId);
        if (active) setContact(officialContact);
      } catch (contactLoadError) {
        if (active) {
          setContactError(getLocalizedApiErrorMessage(
            contactLoadError,
            dict.apiErrors,
            d.officialContactError,
          ));
        }
      } finally {
        if (active) setContactLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [
    contactAttempt,
    contactOrderId,
    d.officialContactError,
    dict.apiErrors,
    selectedPaymentOption,
  ]);

  async function choose(option: "DEPOSIT" | "FULL") {
    if (!order || order.status !== "PENDING" || payingRef.current) return;
    payingRef.current = true;
    setPaying(true);
    setPaymentError(null);
    setPaymentSuccess(null);
    try {
      const updatedOrder = await selectPaymentOption(order.id, option);
      setOrder(updatedOrder);
      setPaymentSuccess(d.paymentSelectionSuccess);
    } catch (err) {
      setPaymentError(
        isApiError(err) && err.status === 409
          ? d.paymentEligibilityConflict
          : getLocalizedApiErrorMessage(err, dict.apiErrors, d.paymentFailed),
      );
    } finally {
      payingRef.current = false;
      setPaying(false);
    }
  }

  const productName = (item: BuyerOrder["items"][number]) =>
    locale === "am" ? item.productNameAm : item.productNameEn;
  const phoneHref = contact ? getPhoneHref(contact.phone) : null;
  const telegramHref = contact ? getTelegramHref(contact.telegram) : null;

  return (
    <ProtectedRoute roles={["BUYER"]}>
      <DashboardShell>
        <Container className="py-8 md:py-10">
          <div className="flex items-center justify-between">
            <PageHeader title={d.orderDetailsTitle} />
            <Link href={`/${locale}/dashboard/buyer/orders`}>
              <Button variant="ghost">{d.backToOrderHistory}</Button>
            </Link>
          </div>

          {loading ? (
            <div className="mt-6 h-40 animate-pulse rounded-2xl border border-border bg-surface" />
          ) : error ? (
            <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button className="mt-3" onClick={() => void load()}>
                {d.retry}
              </Button>
            </div>
          ) : !order ? (
            <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
              <p className="text-sm text-muted-foreground">{d.orderNotFound}</p>
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              <section className="rounded-2xl border border-border bg-surface p-5">
                <p className="text-sm font-medium text-foreground">{d.orderRef} {order.id.slice(0, 8)}</p>
                <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString(locale === "am" ? "am-ET" : "en-ET")}</p>
                <div className="mt-2"><StatusBadge label={getOrderStatusLabel(order.status, d)} tone={getOrderStatusTone(order.status)} /></div>
              </section>

              <section className="rounded-2xl border border-border bg-surface p-5">
                <h2 className="text-sm font-semibold text-foreground">{d.purchasedItems}</h2>
                <ul className="mt-3 divide-y divide-border">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between py-3 text-sm">
                      <div>
                        <p className="font-medium text-foreground">{productName(item)}</p>
                        <p className="text-xs text-muted-foreground">{item.variantName} · {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-foreground">{formatETB(item.unitPrice, locale)}</p>
                        <p className="text-xs text-muted-foreground">{formatETB(item.lineTotal, locale)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-2xl border border-border bg-surface p-5">
                <h2 className="text-sm font-semibold text-foreground">{d.orderSummary}</h2>
                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">{d.total}</span><span className="font-semibold text-foreground">{formatETB(order.total, locale)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{d.paymentOptionLabel}</span><span>{getPaymentOptionLabel(order.paymentOption, d)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{d.amountDue}</span><span>{order.paymentAmount !== null ? formatETB(order.paymentAmount, locale) : "—"}</span></div>
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-surface p-5">
                <h2 className="text-sm font-semibold text-foreground">{d.paymentSelection}</h2>
                {order.status === "PENDING" && (
                  <>
                    {order.paymentOption && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {d.changePaymentSelection}
                      </p>
                    )}
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                      <Button
                        className="h-auto min-h-11 w-full whitespace-normal px-3 py-3 text-center leading-snug sm:flex-1"
                        disabled={paying}
                        aria-pressed={order.paymentOption === "DEPOSIT"}
                        variant={order.paymentOption === "DEPOSIT" ? "accent" : "secondary"}
                        onClick={() => void choose("DEPOSIT")}
                      >
                        {d.paymentDeposit}
                        {order.paymentOption === "DEPOSIT" && (
                          <span className="text-xs">{d.currentPaymentSelection}</span>
                        )}
                      </Button>
                      <Button
                        className="h-auto min-h-11 w-full whitespace-normal px-3 py-3 text-center leading-snug sm:flex-1"
                        disabled={paying}
                        aria-pressed={order.paymentOption === "FULL"}
                        variant={order.paymentOption === "FULL" ? "accent" : "secondary"}
                        onClick={() => void choose("FULL")}
                      >
                        {d.paymentFull}
                        {order.paymentOption === "FULL" && (
                          <span className="text-xs">{d.currentPaymentSelection}</span>
                        )}
                      </Button>
                    </div>
                    {paying && (
                      <p className="mt-3 text-sm text-muted-foreground" role="status">
                        {d.paymentSelectionSubmitting}
                      </p>
                    )}
                    {paymentError && (
                      <p className="mt-3 text-sm text-danger" role="alert">{paymentError}</p>
                    )}
                    {paymentSuccess && (
                      <p className="mt-3 text-sm text-foreground" role="status">
                        {paymentSuccess}
                      </p>
                    )}
                  </>
                )}
              </section>

              {order.paymentOption && (
                <section className="rounded-2xl border border-border bg-surface p-5">
                  <h2 className="text-sm font-semibold text-foreground">{d.officialContact}</h2>
                  {contact ? (
                    <dl className="mt-3 space-y-3 text-sm">
                      <div>
                        <dt className="font-medium text-foreground">{d.contactPhone}</dt>
                        <dd className="mt-1 break-words text-muted-foreground">
                          {phoneHref ? (
                            <a className="underline underline-offset-2" href={phoneHref}>
                              {contact.phone}
                            </a>
                          ) : contact.phone}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-foreground">{d.contactTelegram}</dt>
                        <dd className="mt-1 break-words text-muted-foreground">
                          {telegramHref ? (
                            <a
                              className="underline underline-offset-2"
                              href={telegramHref}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {contact.telegram}
                            </a>
                          ) : contact.telegram}
                        </dd>
                      </div>
                    </dl>
                  ) : contactLoading ? (
                    <p className="mt-2 text-sm text-muted-foreground" role="status">
                      {d.officialContactLoading}
                    </p>
                  ) : contactError ? (
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <p className="text-sm text-danger" role="alert">{contactError}</p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setContactAttempt((attempt) => attempt + 1)}
                      >
                        {d.retryContact}
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground" role="status">
                      {d.officialContactLoading}
                    </p>
                  )}
                </section>
              )}
            </div>
          )}
        </Container>
      </DashboardShell>
    </ProtectedRoute>
  );
}
