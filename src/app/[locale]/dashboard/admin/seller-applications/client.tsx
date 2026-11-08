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
import { useDictionary, useLocale } from "@/i18n/provider";
import { getLocalizedApiErrorMessage } from "@/i18n/errors";
import { isApiError } from "@/lib/api";
import {
  approveSellerApplication,
  listPendingSellerApplications,
  rejectSellerApplication,
} from "@/lib/api/sellers";
import { useAuth } from "@/lib/auth-context";
import type { PendingSellerApplication } from "@/types/sellers";

type DecisionAction = "approve" | "reject";

export default function AdminSellerApplicationsClient() {
  const dict = useDictionary();
  const locale = useLocale();
  const router = useRouter();
  const { user, signOut, refreshSession } = useAuth();
  const dashboard = dict.dashboard;
  const copy = dashboard;
  const adminPath = `/${locale}/dashboard/admin`;
  const adminName = user?.firstName.trim() || user?.email || "";
  const navigation: DashboardNavItem[] = [
    { href: adminPath, label: dashboard.overview },
    {
      href: `${adminPath}/seller-applications`,
      label: dashboard.adminSellerApplications,
      marker: "M21",
    },
    {
      href: `${adminPath}/categories`,
      label: dashboard.adminCategories,
      marker: "M22",
    },
    {
      href: `${adminPath}/product-moderation`,
      label: dashboard.adminProductModeration,
      marker: "M23",
    },
    {
      href: `${adminPath}/orders`,
      label: dashboard.adminOrdersStock,
      marker: "M24",
    },
  ];

  const [applications, setApplications] = useState<
    PendingSellerApplication[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    application: PendingSellerApplication;
    action: DecisionAction;
  } | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const actionInFlight = useRef(false);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  const loadApplications = useCallback(async () => {
    try {
      setApplications(await listPendingSellerApplications());
      setLoadError(null);
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        await refreshSession();
      }
      setLoadError(
        getLocalizedApiErrorMessage(
          error,
          dict.apiErrors,
          copy.adminApplicationsLoadError,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [copy.adminApplicationsLoadError, dict.apiErrors, refreshSession]);

  function refreshApplications() {
    setIsLoading(true);
    setLoadError(null);
    void loadApplications();
  }

  useEffect(() => {
    let active = true;
    void listPendingSellerApplications().then(
      (pendingApplications) => {
        if (!active) return;
        setApplications(pendingApplications);
        setLoadError(null);
        setIsLoading(false);
      },
      async (error: unknown) => {
        if (isApiError(error) && error.status === 401) {
          await refreshSession();
        }
        if (!active) return;
        setLoadError(
          getLocalizedApiErrorMessage(
            error,
            dict.apiErrors,
            copy.adminApplicationsLoadError,
          ),
        );
        setIsLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [
    copy.adminApplicationsLoadError,
    dict.apiErrors,
    refreshSession,
  ]);

  useEffect(() => {
    if (!confirmation || processingId) return;
    cancelButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setConfirmation(null);
        setDecisionError(null);
      } else if (event.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll<HTMLButtonElement>(
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
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [confirmation, processingId]);

  function handleSignOut() {
    void signOut()
      .catch(() => undefined)
      .finally(() => router.replace(`/${locale}/login`));
  }

  function openConfirmation(
    application: PendingSellerApplication,
    action: DecisionAction,
  ) {
    if (actionInFlight.current) return;
    setNotice(null);
    setDecisionError(null);
    setConfirmation({ application, action });
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
    setProcessingId(selected.application.id);
    setDecisionError(null);
    try {
      if (selected.action === "approve") {
        await approveSellerApplication(selected.application.id);
        setNotice(copy.adminApplicationsApproved);
      } else {
        await rejectSellerApplication(selected.application.id);
        setNotice(copy.adminApplicationsRejected);
      }
      setConfirmation(null);
      setIsLoading(true);
      setLoadError(null);
      await loadApplications();
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        await refreshSession();
      }
      if (
        isApiError(error) &&
        (error.status === 404 || error.status === 409)
      ) {
        setConfirmation(null);
        setNotice(copy.adminApplicationsUnavailable);
        setIsLoading(true);
        setLoadError(null);
        await loadApplications();
      } else {
        setDecisionError(
          getLocalizedApiErrorMessage(
            error,
            dict.apiErrors,
            copy.adminApplicationsActionError,
          ),
        );
      }
    } finally {
      actionInFlight.current = false;
      setProcessingId(null);
    }
  }

  const dateFormatter = new Intl.DateTimeFormat(
    locale === "am" ? "am-ET" : "en-ET",
    { dateStyle: "medium", timeStyle: "short" },
  );
  const selectedApplicantName = confirmation
    ? `${confirmation.application.user.firstName} ${confirmation.application.user.lastName}`.trim() ||
      confirmation.application.user.email ||
      copy.adminApplicationsNotProvided
    : "";
  const confirmationTitle =
    confirmation?.action === "approve"
      ? copy.adminApplicationsApproveTitle
      : copy.adminApplicationsRejectTitle;
  const confirmationDescription =
    confirmation?.action === "approve"
      ? copy.adminApplicationsApproveDescription.replace(
          "{name}",
          selectedApplicantName,
        )
      : copy.adminApplicationsRejectDescription.replace(
          "{name}",
          selectedApplicantName,
        );

  return (
    <ProtectedRoute roles={["ADMIN"]}>
      <DashboardShell>
        <DashboardSidebar title={dashboard.adminTitle} items={navigation} />
        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardTopbar
            title={dashboard.adminTitle}
            subtitle={dashboard.adminDescription}
            userLabel={adminName || undefined}
            onSignOut={handleSignOut}
            signOutLabel={dict.auth.logoutTitle}
            actions={
              <>
                <Link
                  href={`/${locale}/profile`}
                  className="hidden min-h-10 items-center rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
                >
                  {dashboard.quickProfile}
                </Link>
                <DashboardMobileNav
                  items={navigation}
                  title={dashboard.adminTitle}
                />
              </>
            }
          />
          <main className="flex-1">
            <Container className="py-6 sm:py-8 lg:py-10">
              <PageHeader
                title={copy.adminApplicationsTitle}
                description={copy.adminApplicationsDescription}
                actions={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={refreshApplications}
                    disabled={isLoading || processingId !== null}
                  >
                    {copy.adminApplicationsRefresh}
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

              <section className="mt-7" aria-labelledby="seller-application-queue">
                <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                  <h2
                    id="seller-application-queue"
                    className="text-lg font-semibold text-foreground"
                  >
                    {copy.adminApplicationsQueueTitle}
                  </h2>
                  {!isLoading && !loadError ? (
                    <span className="text-sm text-muted-foreground">
                      {copy.adminApplicationsCount.replace(
                        "{count}",
                        String(applications.length),
                      )}
                    </span>
                  ) : null}
                </div>

                {isLoading ? (
                  <div
                    className="space-y-3"
                    role="status"
                    aria-live="polite"
                    aria-busy="true"
                  >
                    <span className="sr-only">
                      {copy.adminApplicationsLoading}
                    </span>
                    {[0, 1].map((item) => (
                      <div
                        key={item}
                        aria-hidden="true"
                        className="h-52 animate-pulse rounded-2xl border border-border bg-surface"
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
                      onClick={refreshApplications}
                    >
                      {dict.dashboard.retry}
                    </Button>
                  </div>
                ) : applications.length === 0 ? (
                  <EmptyState
                    title={copy.adminApplicationsEmptyTitle}
                    description={copy.adminApplicationsEmptyDescription}
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
                  <ul className="space-y-4">
                    {applications.map((application) => {
                      const applicantName =
                        `${application.user.firstName} ${application.user.lastName}`.trim() ||
                        copy.adminApplicationsNotProvided;
                      const applicantInitial = applicantName
                        .charAt(0)
                        .toLocaleUpperCase(locale === "am" ? "am-ET" : "en-ET");
                      const isProcessing = processingId === application.id;
                      return (
                        <li key={application.id}>
                          <article className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
                            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                              <div className="flex min-w-0 items-start gap-4">
                                <span
                                  aria-hidden="true"
                                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-lg font-semibold text-brand"
                                >
                                  {applicantInitial}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="break-words text-lg font-semibold tracking-tight text-foreground">
                                      {application.displayName}
                                    </h3>
                                    <StatusBadge
                                      label={copy.adminApplicationsPending}
                                      tone="warning"
                                    />
                                  </div>
                                  {application.legalName ? (
                                    <p className="mt-1 break-words text-sm text-muted-foreground">
                                      {dict.sellerApplication.legalNameLabel}:{" "}
                                      <span className="font-medium text-foreground">
                                        {application.legalName}
                                      </span>
                                    </p>
                                  ) : null}
                                  <div className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        {copy.adminApplicationsApplicant}
                                      </p>
                                      <p className="mt-1 break-words font-medium text-foreground">
                                        {applicantName}
                                      </p>
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        {dict.sellerApplication.sellerTypeLabel}
                                      </p>
                                      <p className="mt-1 font-medium text-foreground">
                                        {application.sellerType === "BUSINESS"
                                          ? dict.sellerApplication.business
                                          : dict.sellerApplication.individual}
                                      </p>
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        {copy.adminApplicationsEmail}
                                      </p>
                                      <p className="mt-1 break-all text-foreground">
                                        {application.user.email ??
                                          copy.adminApplicationsNotProvided}
                                      </p>
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        {copy.adminApplicationsPhone}
                                      </p>
                                      <p className="mt-1 break-words text-foreground">
                                        {application.user.phone ??
                                          copy.adminApplicationsNotProvided}
                                      </p>
                                    </div>
                                  </div>
                                  <p className="mt-4 text-sm text-muted-foreground">
                                    {copy.adminApplicationsSubmitted}:{" "}
                                    <time dateTime={application.createdAt}>
                                      {dateFormatter.format(
                                        new Date(application.createdAt),
                                      )}
                                    </time>
                                  </p>
                                </div>
                              </div>

                              <div className="flex shrink-0 flex-col gap-2 sm:w-36">
                                <Button
                                  size="sm"
                                  variant="accent"
                                  onClick={() =>
                                    openConfirmation(application, "approve")
                                  }
                                  disabled={isLoading || processingId !== null}
                                >
                                  {copy.adminApplicationsApprove}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="text-danger"
                                  onClick={() =>
                                    openConfirmation(application, "reject")
                                  }
                                  disabled={isLoading || processingId !== null}
                                >
                                  {copy.adminApplicationsReject}
                                </Button>
                              </div>
                            </div>
                            {isProcessing ? (
                              <p
                                className="mt-4 text-sm text-muted-foreground"
                                role="status"
                                aria-live="polite"
                              >
                                {copy.adminApplicationsProcessing}
                              </p>
                            ) : null}
                          </article>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </Container>
          </main>
        </div>
      </DashboardShell>

      {confirmation ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label={copy.adminApplicationsCloseDialog}
            disabled={processingId !== null}
            onClick={closeConfirmation}
            className="absolute inset-0 bg-foreground/40"
          />
          <section
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="seller-application-confirmation-title"
            aria-describedby="seller-application-confirmation-description"
            tabIndex={-1}
            className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl outline-none sm:p-7"
          >
            <h2
              id="seller-application-confirmation-title"
              className="text-xl font-semibold tracking-tight text-foreground"
            >
              {confirmationTitle}
            </h2>
            <p
              id="seller-application-confirmation-description"
              className="mt-2 text-sm leading-relaxed text-muted-foreground"
            >
              {confirmationDescription}
            </p>
            {decisionError ? (
              <p className="mt-4 text-sm text-danger" role="alert">
                {decisionError}
              </p>
            ) : null}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                ref={cancelButtonRef}
                type="button"
                className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-full border border-control-border bg-surface px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50"
                onClick={closeConfirmation}
                disabled={processingId !== null}
              >
                {copy.adminApplicationsCancel}
              </button>
              <Button
                variant={
                  confirmation.action === "approve" ? "accent" : "primary"
                }
                className={
                  confirmation.action === "reject"
                    ? "bg-danger text-white hover:bg-danger/90"
                    : undefined
                }
                onClick={() => void submitDecision()}
                disabled={processingId !== null}
                aria-busy={processingId !== null}
              >
                {processingId !== null
                  ? copy.adminApplicationsProcessing
                  : confirmation.action === "approve"
                    ? copy.adminApplicationsConfirmApprove
                    : copy.adminApplicationsConfirmReject}
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </ProtectedRoute>
  );
}
