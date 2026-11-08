"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  createCategory,
  deactivateCategory,
  listAdminCategories,
  updateCategory,
} from "@/lib/api/catalog";
import { useAuth } from "@/lib/auth-context";
import type {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "@/types/catalog";

type CategoryFormValues = {
  slug: string;
  nameEn: string;
  nameAm: string;
  descriptionEn: string;
  descriptionAm: string;
  parentId: string;
  sortOrder: string;
};

type CategoryField = keyof CategoryFormValues;
type FieldErrors = Partial<Record<CategoryField, string>>;
type EditorState = {
  category: Category | null;
  parentId: string;
};

const emptyForm: CategoryFormValues = {
  slug: "",
  nameEn: "",
  nameAm: "",
  descriptionEn: "",
  descriptionAm: "",
  parentId: "",
  sortOrder: "0",
};

function createFormValues(category: Category | null, parentId = ""): CategoryFormValues {
  if (!category) return { ...emptyForm, parentId };
  return {
    slug: category.slug,
    nameEn: category.nameEn,
    nameAm: category.nameAm,
    descriptionEn: category.descriptionEn ?? "",
    descriptionAm: category.descriptionAm ?? "",
    parentId: category.parentId ?? "",
    sortOrder: String(category.sortOrder ?? 0),
  };
}

export default function AdminCategoriesClient() {
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

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deactivation, setDeactivation] = useState<Category | null>(null);
  const [formValues, setFormValues] = useState<CategoryFormValues>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<
    "saving" | "deactivating" | null
  >(null);
  const actionInFlight = useRef(false);
  const dialogRef = useRef<HTMLElement>(null);

  const loadCategories = useCallback(async () => {
    try {
      setCategories(await listAdminCategories());
      setLoadError(null);
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        await refreshSession();
      }
      setLoadError(
        getLocalizedApiErrorMessage(
          error,
          dict.apiErrors,
          copy.adminCategoriesLoadError,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [copy.adminCategoriesLoadError, dict.apiErrors, refreshSession]);

  useEffect(() => {
    let active = true;
    listAdminCategories().then(
      (loadedCategories) => {
        if (!active) return;
        setCategories(loadedCategories);
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
            copy.adminCategoriesLoadError,
          ),
        );
        setIsLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [
    copy.adminCategoriesLoadError,
    dict.apiErrors,
    refreshSession,
  ]);

  const childrenByParent = useMemo(() => {
    const grouped = new Map<string, Category[]>();
    for (const category of categories) {
      if (!category.parentId) continue;
      const children = grouped.get(category.parentId) ?? [];
      children.push(category);
      grouped.set(category.parentId, children);
    }
    return grouped;
  }, [categories]);

  const activeCount = categories.filter(
    (category) => category.isActive !== false,
  ).length;
  const inactiveCount = categories.length - activeCount;
  const isDialogOpen = editor !== null || deactivation !== null;

  useEffect(() => {
    if (!isDialogOpen) return;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const focusableSelector =
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])';
    dialogRef.current
      ?.querySelector<HTMLElement>(
        "input:not([disabled]), select:not([disabled]), button:not([disabled])",
      )
      ?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (!actionInFlight.current) closeDialog();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable =
        dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector);
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
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isDialogOpen]);

  function closeDialog() {
    if (actionInFlight.current) return;
    setEditor(null);
    setDeactivation(null);
    setActionError(null);
    setFieldErrors({});
  }

  function openEditor(category: Category | null, parentId = "") {
    setNotice(null);
    setActionError(null);
    setFieldErrors({});
    setFormValues(createFormValues(category, parentId));
    setEditor({ category, parentId });
    setDeactivation(null);
  }

  function openDeactivation(category: Category) {
    if (actionInFlight.current) return;
    setNotice(null);
    setActionError(null);
    setEditor(null);
    setDeactivation(category);
  }

  function refreshCategories() {
    if (actionInFlight.current) return;
    setIsLoading(true);
    setLoadError(null);
    void loadCategories();
  }

  function handleSignOut() {
    void signOut()
      .catch(() => undefined)
      .finally(() => router.replace(`/${locale}/login`));
  }

  function updateField(field: CategoryField, value: string) {
    setFormValues((current) => ({ ...current, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
    }
  }

  function validateForm(values: CategoryFormValues): FieldErrors {
    const errors: FieldErrors = {};
    if (!values.slug.trim()) {
      errors.slug = copy.adminCategoriesRequiredError;
    } else if (
      values.slug.length > 180 ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug)
    ) {
      errors.slug = copy.adminCategoriesSlugError;
    }

    for (const field of ["nameEn", "nameAm"] as const) {
      if (!values[field].trim()) {
        errors[field] = copy.adminCategoriesRequiredError;
      } else if (values[field].length > 255) {
        errors[field] = copy.adminCategoriesNameLengthError;
      }
    }

    for (const field of ["descriptionEn", "descriptionAm"] as const) {
      if (values[field].length > 5000) {
        errors[field] = copy.adminCategoriesDescriptionLengthError;
      }
    }

    const sortOrder = Number(values.sortOrder);
    if (
      !/^\d+$/.test(values.sortOrder) ||
      !Number.isInteger(sortOrder) ||
      sortOrder < 0 ||
      sortOrder > 100000
    ) {
      errors.sortOrder = copy.adminCategoriesSortOrderError;
    }
    return errors;
  }

  async function submitCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || actionInFlight.current) return;
    setActionError(null);
    const errors = validateForm(formValues);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    actionInFlight.current = true;
    setProcessing("saving");
    const input: CreateCategoryInput = {
      slug: formValues.slug,
      nameEn: formValues.nameEn.trim(),
      nameAm: formValues.nameAm.trim(),
      sortOrder: Number(formValues.sortOrder),
      ...(formValues.descriptionEn.trim()
        ? { descriptionEn: formValues.descriptionEn.trim() }
        : {}),
      ...(formValues.descriptionAm.trim()
        ? { descriptionAm: formValues.descriptionAm.trim() }
        : {}),
      ...(formValues.parentId ? { parentId: formValues.parentId } : {}),
    };

    try {
      if (editor.category) {
        const update: UpdateCategoryInput = {
          ...input,
          descriptionEn: formValues.descriptionEn.trim() || null,
          descriptionAm: formValues.descriptionAm.trim() || null,
          parentId: formValues.parentId || null,
        };
        await updateCategory(editor.category.id, update);
        setNotice(copy.adminCategoriesUpdated);
      } else {
        await createCategory(input);
        setNotice(copy.adminCategoriesCreated);
      }
      setEditor(null);
      setFieldErrors({});
      await loadCategories();
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        await refreshSession();
      }
      setActionError(
        isApiError(error) && error.status === 409
          ? copy.adminCategoriesSlugConflict
          : getLocalizedApiErrorMessage(
              error,
              dict.apiErrors,
              copy.adminCategoriesActionError,
            ),
      );
    } finally {
      actionInFlight.current = false;
      setProcessing(null);
    }
  }

  async function confirmDeactivation() {
    if (!deactivation || actionInFlight.current) return;
    const selected = deactivation;
    actionInFlight.current = true;
    setProcessing("deactivating");
    setActionError(null);
    try {
      await deactivateCategory(selected.id);
      setDeactivation(null);
      setNotice(copy.adminCategoriesDeactivated);
      await loadCategories();
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        await refreshSession();
      }
      setActionError(
        isApiError(error) && error.status === 409
          ? copy.adminCategoriesDeactivateConflict
          : getLocalizedApiErrorMessage(
              error,
              dict.apiErrors,
              copy.adminCategoriesActionError,
            ),
      );
    } finally {
      actionInFlight.current = false;
      setProcessing(null);
    }
  }

  const rootCategories = categories.filter((category) => !category.parentId);
  const parentOptions = categories.filter(
    (category) =>
      (category.parentId === null ||
        category.parentId === undefined ||
        category.id === editor?.category?.parentId) &&
      category.id !== editor?.category?.id &&
      (category.isActive !== false ||
        category.id === editor?.category?.parentId),
  );
  const selectedCategoryName = deactivation
    ? locale === "am"
      ? deactivation.nameAm
      : deactivation.nameEn
    : "";
  const deactivateDescription = copy.adminCategoriesDeactivateDescription.replace(
    "{name}",
    selectedCategoryName,
  );

  function renderCategory(category: Category, depth = 0): React.ReactNode {
    const children = childrenByParent.get(category.id) ?? [];
    const active = category.isActive !== false;
    const primaryName = locale === "am" ? category.nameAm : category.nameEn;
    const secondaryName = locale === "am" ? category.nameEn : category.nameAm;

    return (
      <li key={category.id} className={depth > 0 ? "mt-3" : undefined}>
        <article className="rounded-2xl border border-border bg-surface p-4 shadow-soft sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="break-words text-base font-semibold text-foreground sm:text-lg">
                  {primaryName}
                </h3>
                <StatusBadge
                  label={
                    active
                      ? copy.adminCategoriesActive
                      : copy.adminCategoriesInactive
                  }
                  tone={active ? "success" : "neutral"}
                />
                <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-brand">
                  {depth === 0
                    ? copy.adminCategoriesRoot
                    : copy.adminCategoriesSubcategory}
                </span>
              </div>
              <p className="mt-1 break-words text-sm text-muted-foreground">
                {secondaryName}
              </p>
              <p className="mt-3 font-mono text-xs text-muted-foreground">
                /{category.slug}
              </p>
              {(locale === "am"
                ? category.descriptionAm
                : category.descriptionEn) && (
                <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-muted-foreground">
                  {locale === "am"
                    ? category.descriptionAm
                    : category.descriptionEn}
                </p>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              {depth === 0 && active ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openEditor(null, category.id)}
                  disabled={processing !== null}
                >
                  {copy.adminCategoriesAddSubcategory}
                </Button>
              ) : null}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => openEditor(category)}
                disabled={processing !== null}
              >
                {copy.adminCategoriesEdit}
              </Button>
              {active ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => openDeactivation(category)}
                  disabled={processing !== null || children.length > 0}
                  title={
                    children.length > 0
                      ? copy.adminCategoriesChildBlock
                      : undefined
                  }
                  className="text-danger hover:bg-danger/5 hover:text-danger"
                >
                  {copy.adminCategoriesDeactivate}
                </Button>
              ) : null}
            </div>
          </div>
          {active && children.length > 0 ? (
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              {copy.adminCategoriesChildBlock}
            </p>
          ) : null}
        </article>
        {children.length > 0 ? (
          <ul className="ms-4 border-s border-border ps-3 sm:ms-6 sm:ps-4">
            {children.map((child) => renderCategory(child, depth + 1))}
          </ul>
        ) : null}
      </li>
    );
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
                title={copy.adminCategoriesPageTitle}
                description={copy.adminCategoriesPageDescription}
                actions={
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={refreshCategories}
                      disabled={isLoading || processing !== null}
                    >
                      {copy.adminCategoriesRefresh}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => openEditor(null)}
                      disabled={isLoading || processing !== null}
                    >
                      {copy.adminCategoriesAdd}
                    </Button>
                  </>
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

              {!isLoading && !loadError ? (
                <section
                  className="mt-6 grid gap-3 sm:grid-cols-3"
                  aria-label={copy.adminCategoriesCount.replace(
                    "{count}",
                    String(categories.length),
                  )}
                >
                  <div className="rounded-2xl border border-border bg-surface p-4">
                    <p className="text-2xl font-semibold tracking-tight text-foreground">
                      {categories.length}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {copy.adminCategoriesCount.replace(
                        "{count}",
                        String(categories.length),
                      )}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface p-4">
                    <p className="text-2xl font-semibold tracking-tight text-success">
                      {activeCount}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {copy.adminCategoriesActiveCount.replace(
                        "{count}",
                        String(activeCount),
                      )}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface p-4">
                    <p className="text-2xl font-semibold tracking-tight text-muted-foreground">
                      {inactiveCount}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {copy.adminCategoriesInactiveCount.replace(
                        "{count}",
                        String(inactiveCount),
                      )}
                    </p>
                  </div>
                </section>
              ) : null}

              <section className="mt-7" aria-label={copy.adminCategories}>
                {isLoading ? (
                  <div
                    className="space-y-3"
                    role="status"
                    aria-live="polite"
                    aria-busy="true"
                  >
                    <span className="sr-only">
                      {copy.adminCategoriesLoading}
                    </span>
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
                      onClick={refreshCategories}
                    >
                      {dict.dashboard.retry}
                    </Button>
                  </div>
                ) : categories.length === 0 ? (
                  <EmptyState
                    title={copy.adminCategoriesEmptyTitle}
                    description={copy.adminCategoriesEmptyDescription}
                    icon={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        className="h-6 w-6"
                      >
                        <path d="M4 5h16M4 12h16M4 19h16M8 5v14" />
                      </svg>
                    }
                  />
                ) : (
                  <ul className="space-y-4">
                    {rootCategories.map((category) => renderCategory(category))}
                  </ul>
                )}
              </section>
            </Container>
          </main>
        </div>
      </DashboardShell>

      {isDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/40 p-3 sm:p-6">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label={copy.adminCategoriesCloseDialog}
            onClick={closeDialog}
            disabled={processing !== null}
          />
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-category-dialog-title"
            className="relative z-10 my-auto max-h-[calc(100vh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-xl sm:max-h-[calc(100vh-3rem)] sm:p-7"
          >
            {editor ? (
              <form className="space-y-5" onSubmit={submitCategory} noValidate>
                <div>
                  <h2
                    id="admin-category-dialog-title"
                    className="text-xl font-semibold tracking-tight text-foreground"
                  >
                    {editor.category
                      ? copy.adminCategoriesEditTitle
                      : copy.adminCategoriesCreateTitle}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {editor.category
                      ? copy.adminCategoriesEditDescription
                      : copy.adminCategoriesCreateDescription}
                  </p>
                </div>

                {actionError ? (
                  <p className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger" role="alert">
                    {actionError}
                  </p>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="category-name-en"
                      className="mb-1.5 block text-sm font-medium text-foreground"
                    >
                      {copy.adminCategoriesNameEn}
                    </label>
                    <input
                      id="category-name-en"
                      value={formValues.nameEn}
                      onChange={(event) =>
                        updateField("nameEn", event.target.value)
                      }
                      maxLength={255}
                      aria-invalid={Boolean(fieldErrors.nameEn)}
                      aria-describedby={
                        fieldErrors.nameEn ? "category-name-en-error" : undefined
                      }
                      className="min-h-11 w-full rounded-xl border border-control-border bg-background px-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    {fieldErrors.nameEn ? (
                      <p
                        id="category-name-en-error"
                        className="mt-1 text-xs text-danger"
                      >
                        {fieldErrors.nameEn}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label
                      htmlFor="category-name-am"
                      className="mb-1.5 block text-sm font-medium text-foreground"
                    >
                      {copy.adminCategoriesNameAm}
                    </label>
                    <input
                      id="category-name-am"
                      value={formValues.nameAm}
                      onChange={(event) =>
                        updateField("nameAm", event.target.value)
                      }
                      maxLength={255}
                      aria-invalid={Boolean(fieldErrors.nameAm)}
                      aria-describedby={
                        fieldErrors.nameAm ? "category-name-am-error" : undefined
                      }
                      className="min-h-11 w-full rounded-xl border border-control-border bg-background px-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    {fieldErrors.nameAm ? (
                      <p
                        id="category-name-am-error"
                        className="mt-1 text-xs text-danger"
                      >
                        {fieldErrors.nameAm}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="category-slug"
                    className="mb-1.5 block text-sm font-medium text-foreground"
                  >
                    {copy.adminCategoriesSlug}
                  </label>
                  <input
                    id="category-slug"
                    value={formValues.slug}
                    onChange={(event) => updateField("slug", event.target.value)}
                    maxLength={180}
                    autoComplete="off"
                    aria-invalid={Boolean(fieldErrors.slug)}
                    aria-describedby={
                      fieldErrors.slug ? "category-slug-error" : undefined
                    }
                    className="min-h-11 w-full rounded-xl border border-control-border bg-background px-3 font-mono text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  {fieldErrors.slug ? (
                    <p
                      id="category-slug-error"
                      className="mt-1 text-xs text-danger"
                    >
                      {fieldErrors.slug}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="category-description-en"
                      className="mb-1.5 block text-sm font-medium text-foreground"
                    >
                      {copy.adminCategoriesDescriptionEn}
                    </label>
                    <textarea
                      id="category-description-en"
                      value={formValues.descriptionEn}
                      onChange={(event) =>
                        updateField("descriptionEn", event.target.value)
                      }
                      maxLength={5000}
                      rows={3}
                      aria-invalid={Boolean(fieldErrors.descriptionEn)}
                      aria-describedby={
                        fieldErrors.descriptionEn
                          ? "category-description-en-error"
                          : undefined
                      }
                      className="w-full resize-y rounded-xl border border-control-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    {fieldErrors.descriptionEn ? (
                      <p
                        id="category-description-en-error"
                        className="mt-1 text-xs text-danger"
                      >
                        {fieldErrors.descriptionEn}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label
                      htmlFor="category-description-am"
                      className="mb-1.5 block text-sm font-medium text-foreground"
                    >
                      {copy.adminCategoriesDescriptionAm}
                    </label>
                    <textarea
                      id="category-description-am"
                      value={formValues.descriptionAm}
                      onChange={(event) =>
                        updateField("descriptionAm", event.target.value)
                      }
                      maxLength={5000}
                      rows={3}
                      aria-invalid={Boolean(fieldErrors.descriptionAm)}
                      aria-describedby={
                        fieldErrors.descriptionAm
                          ? "category-description-am-error"
                          : undefined
                      }
                      className="w-full resize-y rounded-xl border border-control-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    {fieldErrors.descriptionAm ? (
                      <p
                        id="category-description-am-error"
                        className="mt-1 text-xs text-danger"
                      >
                        {fieldErrors.descriptionAm}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="category-parent"
                      className="mb-1.5 block text-sm font-medium text-foreground"
                    >
                      {copy.adminCategoriesParent}
                    </label>
                    <select
                      id="category-parent"
                      value={formValues.parentId}
                      onChange={(event) =>
                        updateField("parentId", event.target.value)
                      }
                      className="min-h-11 w-full rounded-xl border border-control-border bg-background px-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">{copy.adminCategoriesNoParent}</option>
                      {parentOptions.map((parent) => (
                        <option key={parent.id} value={parent.id}>
                          {locale === "am" ? parent.nameAm : parent.nameEn}
                          {parent.isActive === false
                            ? ` — ${copy.adminCategoriesInactive}`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="category-sort-order"
                      className="mb-1.5 block text-sm font-medium text-foreground"
                    >
                      {copy.adminCategoriesSortOrder}
                    </label>
                    <input
                      id="category-sort-order"
                      type="number"
                      min={0}
                      max={100000}
                      step={1}
                      value={formValues.sortOrder}
                      onChange={(event) =>
                        updateField("sortOrder", event.target.value)
                      }
                      aria-invalid={Boolean(fieldErrors.sortOrder)}
                      aria-describedby={
                        fieldErrors.sortOrder
                          ? "category-sort-order-error"
                          : undefined
                      }
                      className="min-h-11 w-full rounded-xl border border-control-border bg-background px-3 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    {fieldErrors.sortOrder ? (
                      <p
                        id="category-sort-order-error"
                        className="mt-1 text-xs text-danger"
                      >
                        {fieldErrors.sortOrder}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={closeDialog}
                    disabled={processing !== null}
                  >
                    {copy.adminCategoriesCancel}
                  </Button>
                  <Button type="submit" disabled={processing !== null}>
                    {processing === "saving"
                      ? editor.category
                        ? copy.adminCategoriesSaving
                        : copy.adminCategoriesCreating
                      : editor.category
                        ? copy.adminCategoriesSave
                        : copy.adminCategoriesCreate}
                  </Button>
                </div>
              </form>
            ) : deactivation ? (
              <div className="space-y-5">
                <div>
                  <h2
                    id="admin-category-dialog-title"
                    className="text-xl font-semibold tracking-tight text-foreground"
                  >
                    {copy.adminCategoriesDeactivateTitle}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {deactivateDescription}
                  </p>
                </div>
                {actionError ? (
                  <p className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger" role="alert">
                    {actionError}
                  </p>
                ) : null}
                <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={closeDialog}
                    disabled={processing !== null}
                  >
                    {copy.adminCategoriesCancel}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void confirmDeactivation()}
                    disabled={processing !== null}
                    className="bg-danger text-white hover:bg-danger/90"
                  >
                    {processing === "deactivating"
                      ? copy.adminCategoriesDeactivating
                      : copy.adminCategoriesConfirmDeactivate}
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </ProtectedRoute>
  );
}
