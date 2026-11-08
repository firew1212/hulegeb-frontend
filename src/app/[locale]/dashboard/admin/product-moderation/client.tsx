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
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { getLocalizedApiErrorMessage } from "@/i18n/errors";
import { useDictionary, useLocale } from "@/i18n/provider";
import { isApiError } from "@/lib/api";
import {
  approveAdminProduct,
  listPendingAdminProducts,
  rejectAdminProduct,
} from "@/lib/api/catalog";
import { formatETB } from "@/lib/money";
import { useAuth } from "@/lib/auth-context";
import type { PendingAdminProduct } from "@/types/catalog";

type DecisionAction = "approve" | "reject";

function formatAttribute(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  return JSON.stringify(value) ?? String(value);
}

export default function AdminProductModerationClient() {
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

  const [products, setProducts] = useState<PendingAdminProduct[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    product: PendingAdminProduct;
    action: DecisionAction;
  } | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const actionInFlight = useRef(false);
  const dialogRef = useRef<HTMLElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const loadPendingProducts = useCallback(
    async (signal?: AbortSignal): Promise<boolean> => {
      try {
        const pendingProducts = await listPendingAdminProducts({ signal });
        if (signal?.aborted) return false;
        setProducts(pendingProducts);
        setSelectedId((current) =>
          pendingProducts.some((product) => product.id === current)
            ? current
            : (pendingProducts[0]?.id ?? null),
        );
        setLoadError(null);
        return true;
      } catch (error) {
        if (signal?.aborted) return false;
        let reportedError = error;
        if (isApiError(error) && error.status === 401) {
          try {
            await refreshSession();
          } catch (sessionError) {
            reportedError = sessionError;
          }
        }
        if (signal?.aborted) return false;
        setLoadError(
          getLocalizedApiErrorMessage(
            reportedError,
            dict.apiErrors,
            copy.adminProductsLoadError,
          ),
        );
        return false;
      } finally {
        if (!signal?.aborted) setIsLoading(false);
      }
    },
    [
      copy.adminProductsLoadError,
      dict.apiErrors,
      refreshSession,
    ],
  );

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => loadPendingProducts(controller.signal));
    return () => controller.abort();
  }, [loadPendingProducts]);

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
        if (!actionInFlight.current) {
          setConfirmation(null);
          setDecisionError(null);
        }
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

  function refreshQueue() {
    if (actionInFlight.current) return;
    setIsLoading(true);
    setLoadError(null);
    setNotice(null);
    void loadPendingProducts();
  }

  function handleSignOut() {
    void signOut()
      .catch(() => undefined)
      .finally(() => router.replace(`/${locale}/login`));
  }

  function openConfirmation(
    product: PendingAdminProduct,
    action: DecisionAction,
  ) {
    if (actionInFlight.current) return;
    previouslyFocused.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setNotice(null);
    setDecisionError(null);
    setConfirmation({ product, action });
  }

  function closeConfirmation() {
    if (actionInFlight.current) return;
    setConfirmation(null);
    setDecisionError(null);
  }

  async function submitDecision() {
    if (!confirmation || actionInFlight.current) return;
    const selected = confirmation;
    actionInFlight.current = true;
    setProcessingId(selected.product.id);
    setDecisionError(null);
    try {
      if (selected.action === "approve") {
        await approveAdminProduct(selected.product.id);
        setNotice(copy.adminProductsApproved);
      } else {
        await rejectAdminProduct(selected.product.id);
        setNotice(copy.adminProductsRejected);
      }
      setProducts((current) =>
        current.filter((product) => product.id !== selected.product.id),
      );
      setSelectedId(null);
      setConfirmation(null);
      setIsLoading(true);
      setLoadError(null);
      await loadPendingProducts();
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        try {
          await refreshSession();
        } catch (sessionError) {
          setDecisionError(
            getLocalizedApiErrorMessage(
              sessionError,
              dict.apiErrors,
              copy.adminProductsActionError,
            ),
          );
          return;
        }
      }
      if (
        isApiError(error) &&
        (error.status === 404 || error.status === 409)
      ) {
        setConfirmation(null);
        setNotice(
          error.status === 404
            ? copy.adminProductsUnavailable
            : copy.adminProductsChanged,
        );
        setIsLoading(true);
        setLoadError(null);
        await loadPendingProducts();
      } else {
        setDecisionError(
          isApiError(error) &&
            error.status === 400 &&
            selected.action === "approve"
            ? copy.adminProductsApprovalValidationError
            : getLocalizedApiErrorMessage(
                error,
                dict.apiErrors,
                copy.adminProductsActionError,
              ),
        );
      }
    } finally {
      actionInFlight.current = false;
      setProcessingId(null);
    }
  }

  const selectedProduct =
    products.find((product) => product.id === selectedId) ?? products[0] ?? null;
  const selectedImage = selectedProduct
    ? (selectedProduct.images[
        Math.min(activeImageIndex, selectedProduct.images.length - 1)
      ] ?? null)
    : null;
  const selectedTitle = confirmation
    ? locale === "am"
      ? confirmation.product.titleAm
      : confirmation.product.titleEn
    : "";
  const confirmationDescription =
    confirmation?.action === "approve"
      ? copy.adminProductsApproveDescription.replace("{name}", selectedTitle)
      : copy.adminProductsRejectDescription.replace("{name}", selectedTitle);
  const dateFormatter = new Intl.DateTimeFormat(
    locale === "am" ? "am-ET" : "en-ET",
    { dateStyle: "medium", timeStyle: "short" },
  );

  function conditionLabel(product: PendingAdminProduct) {
    if (product.condition === "NEW") return dict.catalog.conditionNew;
    if (product.condition === "USED") return dict.catalog.conditionUsed;
    return dict.catalog.conditionRefurbished;
  }

  function productTitle(product: PendingAdminProduct) {
    return locale === "am" ? product.titleAm : product.titleEn;
  }

  function sellerName(product: PendingAdminProduct) {
    const ownerName =
      `${product.seller.user.firstName} ${product.seller.user.lastName}`.trim();
    return product.seller.displayName || ownerName || copy.adminProductsNotProvided;
  }

  function sellerStatusTone(status: PendingAdminProduct["seller"]["status"]) {
    if (status === "APPROVED") return "success";
    if (status === "PENDING_APPROVAL") return "warning";
    return "danger";
  }

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
                title={copy.adminProductsTitle}
                description={copy.adminProductsDescription}
                actions={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={refreshQueue}
                    disabled={isLoading || processingId !== null || confirmation !== null}
                  >
                    {copy.adminProductsRefresh}
                  </Button>
                }
              />

              {notice ? (
                <p
                  className="mt-6 rounded-xl border border-success/30 bg-success/5 p-4 text-sm text-foreground"
                  role="status"
                  aria-live="polite"
                >
                  {notice}
                </p>
              ) : null}

              <section className="mt-7" aria-labelledby="pending-products-title">
                <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                  <h2
                    id="pending-products-title"
                    className="text-lg font-semibold text-foreground"
                  >
                    {copy.adminProductsQueueTitle}
                  </h2>
                  {!isLoading && !loadError ? (
                    <StatusBadge
                      label={copy.adminProductsCount.replace(
                        "{count}",
                        String(products.length),
                      )}
                      tone="info"
                    />
                  ) : null}
                </div>

                {isLoading ? (
                  <div
                    className="space-y-3"
                    role="status"
                    aria-live="polite"
                    aria-busy="true"
                  >
                    <span className="sr-only">{copy.adminProductsLoading}</span>
                    {[0, 1, 2].map((item) => (
                      <div
                        key={item}
                        aria-hidden="true"
                        className="h-28 animate-pulse rounded-2xl border border-border bg-surface"
                      />
                    ))}
                  </div>
                ) : loadError ? (
                  <div
                    className="rounded-2xl border border-danger/30 bg-danger/5 p-5"
                    role="alert"
                  >
                    <p className="text-sm text-danger">{loadError}</p>
                    <Button
                      className="mt-4"
                      size="sm"
                      onClick={refreshQueue}
                    >
                      {dict.dashboard.retry}
                    </Button>
                  </div>
                ) : products.length === 0 ? (
                  <EmptyState
                    title={copy.adminProductsEmptyTitle}
                    description={copy.adminProductsEmptyDescription}
                    icon={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        className="h-6 w-6"
                      >
                        <path d="M4 20h16M6 17V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10M9 9h6M9 12h6" />
                      </svg>
                    }
                  />
                ) : (
                  <div className="grid items-start gap-5 lg:grid-cols-[minmax(17rem,0.82fr)_minmax(0,1.35fr)]">
                    <ul className="space-y-3">
                      {products.map((product) => {
                        const selected = selectedProduct?.id === product.id;
                        const title = productTitle(product);
                        const thumbnail = product.images[0];
                        return (
                          <li key={product.id}>
                            <button
                              type="button"
                              aria-pressed={selected}
                              onClick={() => {
                                setSelectedId(product.id);
                                setActiveImageIndex(0);
                                setDecisionError(null);
                              }}
                              className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left shadow-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                selected
                                  ? "border-brand/50 bg-accent-soft/50 ring-1 ring-brand/20"
                                  : "border-border bg-surface hover:border-brand/30 hover:bg-accent-soft/20"
                              }`}
                            >
                              <span className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                                {thumbnail ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={thumbnail.imageUrl}
                                    alt={
                                      locale === "am"
                                        ? thumbnail.altTextAm || title
                                        : thumbnail.altTextEn || title
                                    }
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span className="flex h-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
                                    {copy.adminProductsNoImage}
                                  </span>
                                )}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-semibold text-foreground">
                                  {title}
                                </span>
                                <span className="mt-1 block truncate text-sm text-muted-foreground">
                                  {locale === "am"
                                    ? product.category.nameAm
                                    : product.category.nameEn}
                                </span>
                                <span className="mt-2 flex flex-wrap items-center gap-2">
                                  <StatusBadge
                                    label={copy.adminProductsPending}
                                    tone="warning"
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    {conditionLabel(product)}
                                  </span>
                                </span>
                              </span>
                              <span
                                aria-hidden="true"
                                className="shrink-0 text-brand"
                              >
                                →
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>

                    {selectedProduct ? (
                      <article
                        className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-soft lg:sticky lg:top-5"
                        aria-labelledby="selected-product-title"
                      >
                        <div className="border-b border-border px-5 py-4 sm:px-6">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                              {copy.adminProductsSelected}
                            </p>
                            <StatusBadge
                              label={copy.adminProductsPending}
                              tone="warning"
                            />
                          </div>
                          <h3
                            id="selected-product-title"
                            className="mt-2 break-words text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
                          >
                            {productTitle(selectedProduct)}
                          </h3>
                          <p
                            lang={locale === "am" ? "en" : "am"}
                            className="mt-1 break-words text-sm text-muted-foreground"
                          >
                            {locale === "am"
                              ? selectedProduct.titleEn
                              : selectedProduct.titleAm}
                          </p>
                        </div>

                        <div className="grid gap-5 p-5 sm:p-6">
                          <div>
                            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                              {selectedImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={selectedImage.imageUrl}
                                  alt={
                                    locale === "am"
                                      ? selectedImage.altTextAm ||
                                        selectedProduct.titleAm
                                      : selectedImage.altTextEn ||
                                        selectedProduct.titleEn
                                  }
                                  className="h-full w-full object-contain"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                  {copy.adminProductsNoImage}
                                </div>
                              )}
                            </div>
                            {selectedProduct.images.length > 1 ? (
                              <div
                                role="group"
                                aria-label={dict.product.imageGallery}
                                className="mt-3 flex gap-2 overflow-x-auto pb-1"
                              >
                                {selectedProduct.images.map((image, index) => (
                                  <button
                                    key={image.id}
                                    type="button"
                                    onClick={() => setActiveImageIndex(index)}
                                    aria-label={dict.product.viewImage.replace(
                                      "{index}",
                                      String(index + 1),
                                    )}
                                    aria-pressed={activeImageIndex === index}
                                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                      activeImageIndex === index
                                        ? "border-brand ring-2 ring-brand/20"
                                        : "border-border hover:border-brand/40"
                                    }`}
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={image.imageUrl}
                                      alt={
                                        locale === "am"
                                          ? image.altTextAm ||
                                            selectedProduct.titleAm
                                          : image.altTextEn ||
                                            selectedProduct.titleEn
                                      }
                                      className="h-full w-full object-cover"
                                    />
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>

                          <dl className="grid gap-4 rounded-xl bg-muted/60 p-4 sm:grid-cols-2">
                            <div>
                              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                {copy.adminProductsCategory}
                              </dt>
                              <dd className="mt-1 font-medium text-foreground">
                                {selectedProduct.category.nameEn}
                              </dd>
                              <dd lang="am" className="mt-0.5 text-sm text-muted-foreground">
                                {selectedProduct.category.nameAm}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                {copy.adminProductsCondition}
                              </dt>
                              <dd className="mt-1 font-medium text-foreground">
                                {conditionLabel(selectedProduct)}
                              </dd>
                            </div>
                            <div className="sm:col-span-2">
                              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                {copy.adminProductsSubmitted}
                              </dt>
                              <dd className="mt-1 font-medium text-foreground">
                                <time dateTime={selectedProduct.createdAt}>
                                  {dateFormatter.format(
                                    new Date(selectedProduct.createdAt),
                                  )}
                                </time>
                              </dd>
                            </div>
                          </dl>

                          <section aria-labelledby="product-descriptions-title">
                            <h4
                              id="product-descriptions-title"
                              className="text-sm font-semibold text-foreground"
                            >
                              {copy.adminProductsDescriptionLabel}
                            </h4>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              <div className="rounded-xl border border-border p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  {copy.adminProductsEnglish}
                                </p>
                                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                                  {selectedProduct.descriptionEn ||
                                    copy.adminProductsNotProvided}
                                </p>
                              </div>
                              <div
                                lang="am"
                                className="rounded-xl border border-border p-4"
                              >
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  {copy.adminProductsAmharic}
                                </p>
                                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                                  {selectedProduct.descriptionAm ||
                                    copy.adminProductsNotProvided}
                                </p>
                              </div>
                            </div>
                          </section>

                          <section aria-labelledby="product-seller-title">
                            <h4
                              id="product-seller-title"
                              className="text-sm font-semibold text-foreground"
                            >
                              {copy.adminProductsSeller}
                            </h4>
                            <dl className="mt-3 grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2">
                              <div className="sm:col-span-2">
                                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                  {copy.adminProductsSellerContact}
                                </dt>
                                <dd className="mt-1 break-words font-medium text-foreground">
                                  {sellerName(selectedProduct)}
                                </dd>
                              </div>
                              {selectedProduct.seller.legalName ? (
                                <div className="sm:col-span-2">
                                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    {dict.sellerApplication.legalNameLabel}
                                  </dt>
                                  <dd className="mt-1 break-words text-sm text-foreground">
                                    {selectedProduct.seller.legalName}
                                  </dd>
                                </div>
                              ) : null}
                              <div className="sm:col-span-2">
                                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                  {copy.adminProductsSellerStatus}
                                </dt>
                                <dd className="mt-1">
                                  <StatusBadge
                                    label={
                                      copy.adminProductsSellerStatuses[
                                        selectedProduct.seller.status
                                      ]
                                    }
                                    tone={sellerStatusTone(
                                      selectedProduct.seller.status,
                                    )}
                                  />
                                </dd>
                              </div>
                              <div className="min-w-0">
                                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                  {copy.adminProductsEmail}
                                </dt>
                                <dd className="mt-1 break-all text-sm text-foreground">
                                  {selectedProduct.seller.user.email ||
                                    copy.adminProductsNotProvided}
                                </dd>
                              </div>
                              <div className="min-w-0">
                                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                  {copy.adminProductsPhone}
                                </dt>
                                <dd className="mt-1 break-words text-sm text-foreground">
                                  {selectedProduct.seller.user.phone ||
                                    copy.adminProductsNotProvided}
                                </dd>
                              </div>
                            </dl>
                          </section>

                          <section aria-labelledby="product-variants-title">
                            <h4
                              id="product-variants-title"
                              className="text-sm font-semibold text-foreground"
                            >
                              {copy.adminProductsVariants}
                            </h4>
                            {selectedProduct.variants.length ? (
                              <ul className="mt-3 space-y-3">
                                {selectedProduct.variants.map((variant) => {
                                  const attributes = Object.entries(
                                    variant.attributes ?? {},
                                  ).filter(([, value]) =>
                                    formatAttribute(value),
                                  );
                                  return (
                                    <li
                                      key={variant.id}
                                      className="rounded-xl border border-border p-4"
                                    >
                                      <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <p className="break-words font-medium text-foreground">
                                            {variant.name}
                                          </p>
                                          <p className="mt-1 break-all text-xs text-muted-foreground">
                                            {copy.adminProductsSku}: {variant.sku}
                                          </p>
                                        </div>
                                        {!variant.isActive ? (
                                          <StatusBadge
                                            label={copy.adminProductsInactiveVariant}
                                            tone="neutral"
                                          />
                                        ) : null}
                                      </div>
                                      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                          <dt className="text-xs text-muted-foreground">
                                            {copy.adminProductsPrice}
                                          </dt>
                                          <dd className="mt-1 font-semibold text-foreground">
                                            {formatETB(variant.price, locale)}
                                          </dd>
                                        </div>
                                        <div>
                                          <dt className="text-xs text-muted-foreground">
                                            {copy.adminProductsStock}
                                          </dt>
                                          <dd className="mt-1 font-semibold text-foreground">
                                            {variant.stockQuantity}
                                          </dd>
                                        </div>
                                      </dl>
                                      {attributes.length ? (
                                        <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-3">
                                          {attributes.map(([key, value]) => (
                                            <div key={key}>
                                              <dt className="text-xs text-muted-foreground">
                                                {key}
                                              </dt>
                                              <dd className="mt-0.5 break-words text-sm text-foreground">
                                                {formatAttribute(value)}
                                              </dd>
                                            </div>
                                          ))}
                                        </dl>
                                      ) : null}
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : (
                              <p className="mt-2 text-sm text-muted-foreground">
                                {copy.adminProductsNoVariants}
                              </p>
                            )}
                          </section>

                          {decisionError ? (
                            <p
                              className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger"
                              role="alert"
                            >
                              {decisionError}
                            </p>
                          ) : null}

                          {selectedProduct.seller.status !== "APPROVED" ? (
                            <p className="rounded-xl border border-warning/30 bg-warning-soft p-3 text-sm text-warning">
                              {copy.adminProductsSellerApprovalRequired}
                            </p>
                          ) : null}

                          <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
                            <Button
                              variant="secondary"
                              onClick={() =>
                                openConfirmation(selectedProduct, "reject")
                              }
                              disabled={isLoading || processingId !== null}
                              className="border-danger/30 text-danger hover:bg-danger/5"
                            >
                              {copy.adminProductsReject}
                            </Button>
                            <Button
                              variant="accent"
                              onClick={() =>
                                openConfirmation(selectedProduct, "approve")
                              }
                              disabled={
                                isLoading ||
                                processingId !== null ||
                                selectedProduct.seller.status !== "APPROVED"
                              }
                            >
                              {copy.adminProductsApprove}
                            </Button>
                          </div>
                        </div>
                      </article>
                    ) : null}
                  </div>
                )}
              </section>
            </Container>
          </main>
        </div>
      </DashboardShell>

      {confirmation ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/50 p-4 backdrop-blur-sm">
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-decision-title"
            aria-describedby="product-decision-description"
            className="my-auto w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
              {copy.adminProductsReview}
            </p>
            <h2
              id="product-decision-title"
              className="mt-2 text-xl font-semibold text-foreground"
            >
              {confirmation.action === "approve"
                ? copy.adminProductsApproveTitle
                : copy.adminProductsRejectTitle}
            </h2>
            <p
              id="product-decision-description"
              className="mt-3 break-words text-sm leading-6 text-muted-foreground"
            >
              {confirmationDescription}
            </p>
            {decisionError ? (
              <p
                className="mt-4 rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger"
                role="alert"
              >
                {decisionError}
              </p>
            ) : null}
            {processingId ? (
              <p className="mt-4 text-sm text-muted-foreground" role="status">
                {copy.adminProductsProcessing}
              </p>
            ) : null}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                onClick={closeConfirmation}
                disabled={processingId !== null}
              >
                {copy.adminProductsCancel}
              </Button>
              <Button
                variant={confirmation.action === "approve" ? "accent" : "primary"}
                className={
                  confirmation.action === "reject"
                    ? "bg-danger text-white hover:bg-danger/90 active:bg-danger/80"
                    : undefined
                }
                onClick={() => void submitDecision()}
                disabled={processingId !== null}
              >
                {confirmation.action === "approve"
                  ? copy.adminProductsConfirmApprove
                  : copy.adminProductsConfirmReject}
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </ProtectedRoute>
  );
}
