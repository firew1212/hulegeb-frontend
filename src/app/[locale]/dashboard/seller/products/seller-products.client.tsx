"use client";

import { useEffect, useState } from "react";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { SellerWorkspace } from "@/components/dashboard/seller-workspace";
import { Button } from "@/components/ui/button";
import { getLocalizedApiErrorMessage } from "@/i18n/errors";
import { useDictionary, useLocale } from "@/i18n/provider";
import { listSellerProducts } from "@/lib/api/seller-products";
import { priceRange } from "@/lib/money";
import type { SellerProduct, SellerProductStatus } from "@/types/catalog";

function statusTone(status: SellerProductStatus) {
  if (status === "APPROVED") return "success";
  if (status === "PENDING_APPROVAL") return "warning";
  if (status === "REJECTED") return "danger";
  if (status === "DRAFT") return "info";
  if (status === "REMOVED") return "danger";
  return "neutral";
}

export default function SellerProductsClient() {
  const dict = useDictionary();
  const locale = useLocale();
  const messages = dict.sellerProducts;
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    listSellerProducts()
      .then((response) => {
        if (active) setProducts(response);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            getLocalizedApiErrorMessage(
              requestError,
              dict.apiErrors,
              messages.loadError,
            ),
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [dict.apiErrors, messages.loadError, reload]);

  function displayStatus(status: SellerProductStatus) {
    return messages.statuses[status];
  }

  function displayTitle(product: SellerProduct) {
    return locale === "am" ? product.titleAm : product.titleEn;
  }

  return (
    <ProtectedRoute roles={["SELLER"]}>
      <SellerWorkspace title={messages.title}>
        <PageHeader
          title={messages.title}
          description={messages.description}
          actions={
            <Button href={`/${locale}/dashboard/seller/products/new`}>
              {messages.createProduct}
            </Button>
          }
        />

        {loading ? (
          <p className="mt-8 text-sm text-muted-foreground" role="status" aria-busy="true">
            {messages.loading}
          </p>
        ) : error ? (
          <div className="mt-8 rounded-2xl border border-danger/30 bg-surface p-6" role="alert">
            <p className="text-sm text-danger">{error}</p>
            <Button
              className="mt-4"
              size="sm"
              variant="secondary"
              onClick={() => setReload((value) => value + 1)}
            >
              {messages.retry}
            </Button>
          </div>
        ) : products.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-border bg-surface p-8 text-center">
            <h2 className="text-lg font-semibold text-foreground">{messages.emptyTitle}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{messages.emptyDescription}</p>
            <Button className="mt-5" href={`/${locale}/dashboard/seller/products/new`}>
              {messages.createProduct}
            </Button>
          </div>
        ) : (
          <ul className="mt-8 grid gap-4">
            {products.map((product) => {
              const activeVariants = product.variants.filter((variant) => variant.isActive);
              const href = `/${locale}/dashboard/seller/products/${encodeURIComponent(product.id)}`;
              return (
                <li
                  key={product.id}
                  className="rounded-2xl border border-border bg-surface p-5 shadow-soft"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-foreground">
                          {displayTitle(product)}
                        </h2>
                        <StatusBadge
                          label={displayStatus(product.status)}
                          tone={statusTone(product.status)}
                        />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {locale === "am" ? product.category.nameAm : product.category.nameEn}
                        {" · "}
                        {product.slug}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {messages.statusDescription[product.status]}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                        <span>
                          {messages.variants}: {activeVariants.length}
                        </span>
                        <span>
                          {messages.images}: {product.images.length}
                        </span>
                        <span>
                          {messages.price}:{" "}
                          {activeVariants.length
                            ? priceRange(activeVariants, locale)
                            : messages.noPrice}
                        </span>
                      </div>
                    </div>
                    <Button href={href} variant="secondary" size="sm">
                      {product.status === "REJECTED"
                        ? messages.editRejectedProduct
                        : messages.manageProduct}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SellerWorkspace>
    </ProtectedRoute>
  );
}
