"use client";

import { useRef, useState } from "react";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { FieldError, inputClass } from "@/components/auth/auth-shell";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { useDictionary, useLocale } from "@/i18n/provider";
import { getLocalizedApiErrorMessage } from "@/i18n/errors";
import { isApiError } from "@/lib/api";
import { createSellerApplication } from "@/lib/api/sellers";
import { useAuth } from "@/lib/auth-context";
import type {
  SellerApplication,
  SellerType,
} from "@/types/sellers";

export default function SellerApplicationClient() {
  const dict = useDictionary();
  const locale = useLocale();
  const copy = dict.sellerApplication;
  const { user, refreshSession } = useAuth();

  const [sellerType, setSellerType] = useState<SellerType>("INDIVIDUAL");
  const [displayName, setDisplayName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [duplicateDetected, setDuplicateDetected] = useState(false);
  const [submittedApplication, setSubmittedApplication] =
    useState<SellerApplication | null>(null);
  const inFlight = useRef(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);
    setSubmitError(null);

    if (
      inFlight.current ||
      submittedApplication ||
      duplicateDetected ||
      user?.sellerStatus
    ) {
      return;
    }

    const trimmedDisplayName = displayName.trim();
    if (!trimmedDisplayName) {
      setFieldError(copy.displayNameRequired);
      return;
    }
    if (trimmedDisplayName.length > 255) {
      setFieldError(copy.displayNameMaxLength);
      return;
    }

    inFlight.current = true;
    setSubmitting(true);

    let application: SellerApplication | null = null;
    try {
      const trimmedLegalName = legalName.trim();
      application = await createSellerApplication({
        sellerType,
        displayName: trimmedDisplayName,
        ...(sellerType === "BUSINESS" && trimmedLegalName
          ? { legalName: trimmedLegalName }
          : {}),
      });
      setSubmittedApplication(application);
    } catch (error) {
      if (isApiError(error) && error.status === 409) {
        setDuplicateDetected(true);
        setSubmitError(copy.duplicate);
        await refreshSession();
      } else {
        setSubmitError(
          getLocalizedApiErrorMessage(error, dict.apiErrors, copy.submitError),
        );
      }
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }

    if (application) {
      await refreshSession();
    }
  }

  const sellerStatus = user?.sellerStatus;
  const statusContent =
    sellerStatus === "PENDING_APPROVAL"
      ? {
          title: copy.pendingTitle,
          description: copy.pendingDescription,
          destination: `/${locale}/dashboard/buyer`,
          action: copy.backToBuyerDashboard,
        }
      : sellerStatus === "APPROVED"
        ? {
            title: copy.approvedTitle,
            description: copy.approvedDescription,
            destination: `/${locale}/dashboard/seller`,
            action: copy.openSellerDashboard,
          }
        : sellerStatus === "REJECTED"
          ? {
              title: copy.rejectedTitle,
              description: copy.rejectedDescription,
              destination: `/${locale}/dashboard/buyer`,
              action: copy.backToBuyerDashboard,
            }
          : sellerStatus === "SUSPENDED"
            ? {
                title: copy.suspendedTitle,
                description: copy.suspendedDescription,
                destination: `/${locale}/dashboard/buyer`,
                action: copy.backToBuyerDashboard,
              }
            : null;

  return (
    <ProtectedRoute roles={["BUYER"]}>
      <DashboardShell>
        <Container className="py-8 md:py-10">
          <PageHeader title={copy.title} description={copy.description} />

          <div className="mx-auto mt-6 max-w-3xl">
            {submitError ? (
              <p
                className="mb-4 rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger"
                role="alert"
              >
                {submitError}
              </p>
            ) : null}

            {submittedApplication ? (
              <div
                className="mb-4 rounded-xl border border-success/30 bg-success/5 p-4 text-sm text-foreground"
                role="status"
                aria-live="polite"
              >
                <p className="font-medium">{copy.submitted}</p>
                <p className="mt-1 text-muted-foreground">
                  {copy.applicationReference.replace(
                    "{id}",
                    submittedApplication.id,
                  )}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {copy.submittedAt.replace(
                    "{date}",
                    new Date(submittedApplication.createdAt).toLocaleString(
                      locale === "am" ? "am-ET" : "en-ET",
                    ),
                  )}
                </p>
              </div>
            ) : null}

            {statusContent ? (
              <section
                className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-7"
                role="status"
                aria-labelledby="seller-application-status"
              >
                <h2
                  id="seller-application-status"
                  className="text-xl font-semibold text-foreground"
                >
                  {statusContent.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {statusContent.description}
                </p>
                <Button
                  href={statusContent.destination}
                  className="mt-5 w-full sm:w-auto"
                >
                  {statusContent.action}
                </Button>
              </section>
            ) : submittedApplication ? (
              <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-7">
                <p className="text-sm leading-6 text-muted-foreground">
                  {copy.refreshingStatus}
                </p>
                <Button
                  href={`/${locale}/dashboard/buyer`}
                  variant="secondary"
                  className="mt-5 w-full sm:w-auto"
                >
                  {copy.backToBuyerDashboard}
                </Button>
              </section>
            ) : duplicateDetected ? (
              <section
                className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-7"
                role="status"
              >
                <p className="text-sm leading-6 text-muted-foreground">
                  {copy.reviewStatus}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-5 w-full sm:w-auto"
                  onClick={() => void refreshSession()}
                >
                  {copy.refreshStatus}
                </Button>
              </section>
            ) : (
              <form
                onSubmit={onSubmit}
                noValidate
                className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-7"
              >
                <fieldset disabled={submitting} className="space-y-6">
                  <legend className="text-sm font-medium text-foreground">
                    {copy.sellerTypeLabel}
                  </legend>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        {
                          value: "INDIVIDUAL",
                          label: copy.individual,
                          description: copy.individualDescription,
                        },
                        {
                          value: "BUSINESS",
                          label: copy.business,
                          description: copy.businessDescription,
                        },
                      ] as const
                    ).map((option) => (
                      <label
                        key={option.value}
                        className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-ring ${
                          sellerType === option.value
                            ? "border-brand bg-brand/5"
                            : "border-control-border hover:bg-muted"
                        }`}
                      >
                        <input
                          type="radio"
                          name="sellerType"
                          value={option.value}
                          checked={sellerType === option.value}
                          onChange={() => setSellerType(option.value)}
                          className="mt-1 h-4 w-4 accent-brand"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-foreground">
                            {option.label}
                          </span>
                          <span className="mt-1 block text-sm text-muted-foreground">
                            {option.description}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>

                  <div>
                    <label
                      className="mb-1 block text-sm font-medium text-foreground"
                      htmlFor="seller-display-name"
                    >
                      {copy.displayNameLabel}
                    </label>
                    <input
                      id="seller-display-name"
                      className={inputClass()}
                      value={displayName}
                      onChange={(event) => {
                        setDisplayName(event.target.value);
                        setFieldError(null);
                      }}
                      maxLength={255}
                      required
                      aria-invalid={Boolean(fieldError)}
                      aria-describedby={
                        fieldError ? "seller-display-name-error" : undefined
                      }
                    />
                    {fieldError ? (
                      <div id="seller-display-name-error">
                        <FieldError message={fieldError} />
                      </div>
                    ) : null}
                  </div>

                  {sellerType === "BUSINESS" ? (
                    <div>
                      <label
                        className="mb-1 block text-sm font-medium text-foreground"
                        htmlFor="seller-legal-name"
                      >
                        {copy.legalNameLabel}
                      </label>
                      <input
                        id="seller-legal-name"
                        className={inputClass()}
                        value={legalName}
                        onChange={(event) => setLegalName(event.target.value)}
                      />
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    className="w-full sm:w-auto"
                    disabled={submitting}
                  >
                    {submitting ? copy.submitting : copy.submit}
                  </Button>
                </fieldset>
              </form>
            )}
          </div>
        </Container>
      </DashboardShell>
    </ProtectedRoute>
  );
}
