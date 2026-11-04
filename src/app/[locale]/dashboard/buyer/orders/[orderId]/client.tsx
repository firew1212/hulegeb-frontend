"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useDictionary, useLocale } from "@/i18n/provider";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { getLocalizedApiErrorMessage } from "@/i18n/errors";
import { getBuyerOrder, selectPaymentOption, getOfficialContact } from "@/lib/api/orders";
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

export default function BuyerOrderDetailClient() {
  const params = useParams<{ orderId: string }>();
  const orderId = params?.orderId ?? "";
  const locale = useLocale();
  const dict = useDictionary();
  const d = dict.dashboard;

  const [order, setOrder] = useState<BuyerOrder | null>(null);
  const [contact, setContact] = useState<OrderContact | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const valid = UUID_RE.test(orderId);

  const load = useCallback(async () => {
    if (!valid) { setError(d.invalidOrderId); setLoading(false); return; }
    setLoading(true); setError(null); setContactError(null);
    try {
      const data = await getBuyerOrder(orderId);
      setOrder(data);
      try {
        const officialContact = await getOfficialContact(orderId);
        setContact(officialContact);
        setContactError(null);
      } catch (error) {
        setContact(null);
        setContactError(
          getLocalizedApiErrorMessage(error, dict.apiErrors, d.officialContactError),
        );
      }
    } catch (err) {
      setError(getLocalizedApiErrorMessage(err, dict.apiErrors, d.orderLoadError));
    } finally { setLoading(false); }
  }, [
    dict.apiErrors,
    d.invalidOrderId,
    d.orderLoadError,
    d.officialContactError,
    orderId,
    valid,
  ]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  async function choose(option: "DEPOSIT" | "FULL") {
    if (!order) return;
    setPaying(true);
    try {
      await selectPaymentOption(order.id, option);
      await load();
    } catch (err) {
      setError(getLocalizedApiErrorMessage(err, dict.apiErrors, d.paymentFailed));
    } finally { setPaying(false); }
  }

  const productName = (item: BuyerOrder["items"][number]) =>
    locale === "am" ? item.productNameAm : item.productNameEn;

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
                  <div className="flex justify-between"><span className="text-muted-foreground">{d.total}</span><span className="font-semibold text-foreground">{formatETB(order.total, locale)} {order.currency}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{d.paymentOptionLabel}</span><span>{getPaymentOptionLabel(order.paymentOption, d)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">{d.amountDue}</span><span>{order.paymentAmount ? formatETB(order.paymentAmount, locale) : "—"}</span></div>
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-surface p-5">
                <h2 className="text-sm font-semibold text-foreground">{d.paymentSelection}</h2>
                <div className="mt-3 flex gap-3">
                  <Button disabled={paying} onClick={() => void choose("DEPOSIT")}>{d.paymentDeposit}</Button>
                  <Button disabled={paying} onClick={() => void choose("FULL")}>{d.paymentFull}</Button>
                </div>
              </section>

              {(contact || contactError) && (
                <section className="rounded-2xl border border-border bg-surface p-5">
                  <h2 className="text-sm font-semibold text-foreground">{d.officialContact}</h2>
                  {contact ? (
                    <p className="mt-2 text-sm text-muted-foreground">{contact.phone} · {contact.telegram}</p>
                  ) : (
                    <p className="mt-2 text-sm text-danger" role="alert">{contactError}</p>
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
