"use client";

export const instant = false;

import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/catalog/product-card";
import { listCategories, listProducts } from "@/lib/api/catalog";
import type { Category, Product } from "@/types/catalog";
import { useDictionary, useLocale } from "@/i18n/provider";
import { getLocalizedApiErrorMessage } from "@/i18n/errors";

const CONDITIONS = ["NEW", "USED", "REFURBISHED"] as const;
const SORTS = ["newest", "oldest", "price_asc", "price_desc"] as const;
const CONTROL_CLASS_NAME =
  "h-11 w-full rounded-xl border border-control-border bg-surface px-3 text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Condition = (typeof CONDITIONS)[number];
type Sort = (typeof SORTS)[number];
type PriceDraftState = {
  sourceMinPrice: string | null;
  sourceMaxPrice: string | null;
  min: string;
  max: string;
  error: string | null;
};

function isCondition(value: string): value is Condition {
  return CONDITIONS.some((condition) => condition === value);
}

function isSort(value: string): value is Sort {
  return SORTS.some((sort) => sort === value);
}

function parseNonnegativePrice(value: string | null): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function categoryName(category: Category, locale: string) {
  return locale === "am" ? category.nameAm : category.nameEn;
}

function CatalogContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dict = useDictionary();
  const locale = useLocale();

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [categoriesRequest, setCategoriesRequest] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productsRequest, setProductsRequest] = useState(0);

  const rawPage = searchParams.get("page");
  const parsedPage = rawPage === null ? 1 : Number(rawPage);
  const page =
    Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const limit = 12;
  const q = searchParams.get("q") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const subcategoryId = searchParams.get("subcategoryId") ?? "";
  const rawCondition = searchParams.get("condition") ?? "";
  const condition = isCondition(rawCondition) ? rawCondition : "";
  const rawSort = searchParams.get("sort") ?? "";
  const sort = isSort(rawSort) ? rawSort : "newest";
  const minPriceParam = searchParams.get("minPrice");
  const maxPriceParam = searchParams.get("maxPrice");
  const parsedMinPrice = parseNonnegativePrice(minPriceParam);
  const parsedMaxPrice = parseNonnegativePrice(maxPriceParam);
  const validPriceRange =
    parsedMinPrice === undefined ||
    parsedMaxPrice === undefined ||
    parsedMinPrice <= parsedMaxPrice;
  const appliedMinPrice = validPriceRange ? parsedMinPrice : undefined;
  const appliedMaxPrice = validPriceRange ? parsedMaxPrice : undefined;

  const [searchDraft, setSearchDraft] = useState({ query: q, value: q });
  const searchInput = searchDraft.query === q ? searchDraft.value : q;
  const [priceDraftState, setPriceDraftState] = useState<PriceDraftState>({
    sourceMinPrice: minPriceParam,
    sourceMaxPrice: maxPriceParam,
    min: minPriceParam ?? "",
    max: maxPriceParam ?? "",
    error: null,
  });
  const priceDraftIsCurrent =
    priceDraftState.sourceMinPrice === minPriceParam &&
    priceDraftState.sourceMaxPrice === maxPriceParam;
  const minPriceDraft = priceDraftIsCurrent
    ? priceDraftState.min
    : minPriceParam ?? "";
  const maxPriceDraft = priceDraftIsCurrent
    ? priceDraftState.max
    : maxPriceParam ?? "";
  const priceError = priceDraftIsCurrent ? priceDraftState.error : null;

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      });
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== q) {
        updateParams({ q: searchInput || null, page: "1" });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, q, updateParams]);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCategoriesLoading(true);
    setCategoriesError(null);
    listCategories()
      .then((data) => {
        if (active) setCategories(data);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setCategoriesError(
            getLocalizedApiErrorMessage(
              requestError,
              dict.apiErrors,
              dict.catalog.categoriesError,
            ),
          );
        }
      })
      .finally(() => {
        if (active) setCategoriesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [categoriesRequest, dict.apiErrors, dict.catalog.categoriesError]);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    listProducts(
      {
        page,
        limit,
        q: q || undefined,
        categoryId: categoryId || undefined,
        subcategoryId: subcategoryId || undefined,
        condition: condition || undefined,
        sort,
        minPrice: appliedMinPrice,
        maxPrice: appliedMaxPrice,
      },
      { signal: controller.signal },
    )
      .then((response) => {
        if (controller.signal.aborted) return;
        setProducts(response.data);
        setTotal(response.total);
        setTotalPages(response.totalPages);
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          getLocalizedApiErrorMessage(
            requestError,
            dict.apiErrors,
            dict.catalog.error,
          ),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [
    page,
    q,
    categoryId,
    subcategoryId,
    condition,
    sort,
    appliedMinPrice,
    appliedMaxPrice,
    productsRequest,
    dict.apiErrors,
    dict.catalog.error,
  ]);

  const rootCategories = categories.filter((category) => !category.parentId);
  const selectedCategory = rootCategories.find(
    (category) => category.id === categoryId,
  );
  const subcategories = selectedCategory?.children ?? [];
  const selectedSubcategory = subcategories.find(
    (category) => category.id === subcategoryId,
  );

  const conditionLabel = (value: string) => {
    if (value === "NEW") return dict.catalog.conditionNew;
    if (value === "USED") return dict.catalog.conditionUsed;
    if (value === "REFURBISHED") return dict.catalog.conditionRefurbished;
    return value;
  };

  const sortOptions: { value: Sort; label: string }[] = [
    { value: "newest", label: dict.catalog.sortNewest },
    { value: "oldest", label: dict.catalog.sortOldest },
    { value: "price_asc", label: dict.catalog.sortPriceAscending },
    { value: "price_desc", label: dict.catalog.sortPriceDescending },
  ];

  const activeFilters: string[] = [];
  if (q) activeFilters.push(`${dict.catalog.searchLabel}: ${q}`);
  if (selectedCategory) {
    activeFilters.push(
      `${dict.catalog.categoryLabel}: ${categoryName(selectedCategory, locale)}`,
    );
  }
  if (selectedSubcategory) {
    activeFilters.push(
      `${dict.catalog.subcategoryLabel}: ${categoryName(selectedSubcategory, locale)}`,
    );
  }
  if (condition) {
    activeFilters.push(
      `${dict.catalog.conditionLabel}: ${conditionLabel(condition)}`,
    );
  }
  if (appliedMinPrice !== undefined || appliedMaxPrice !== undefined) {
    const min = appliedMinPrice?.toLocaleString(locale) ?? "—";
    const max = appliedMaxPrice?.toLocaleString(locale) ?? "—";
    activeFilters.push(
      `${dict.catalog.minPriceLabel}: ${min} · ${dict.catalog.maxPriceLabel}: ${max}`,
    );
  }
  if (sort !== "newest" && rawSort) {
    activeFilters.push(
      `${dict.catalog.sortLabel}: ${sortOptions.find((option) => option.value === sort)?.label ?? ""}`,
    );
  }

  const hasFilters = Boolean(
    q ||
      categoryId ||
      subcategoryId ||
      rawCondition ||
      minPriceParam ||
      maxPriceParam ||
      (rawSort && rawSort !== "newest"),
  );

  function clearFilters() {
    setSearchDraft({ query: q, value: "" });
    setPriceDraftState({
      sourceMinPrice: minPriceParam,
      sourceMaxPrice: maxPriceParam,
      min: "",
      max: "",
      error: null,
    });
    router.replace(pathname);
  }

  function updatePriceDraft(updates: Partial<Pick<PriceDraftState, "min" | "max">>) {
    setPriceDraftState({
      sourceMinPrice: minPriceParam,
      sourceMaxPrice: maxPriceParam,
      min: minPriceDraft,
      max: maxPriceDraft,
      error: null,
      ...updates,
    });
  }

  function applyPriceFilters() {
    const min = parseNonnegativePrice(minPriceDraft);
    const max = parseNonnegativePrice(maxPriceDraft);
    const hasInvalidInput =
      (minPriceDraft.trim() !== "" && min === undefined) ||
      (maxPriceDraft.trim() !== "" && max === undefined);
    if (hasInvalidInput || (min !== undefined && max !== undefined && min > max)) {
      setPriceDraftState({
        sourceMinPrice: minPriceParam,
        sourceMaxPrice: maxPriceParam,
        min: minPriceDraft,
        max: maxPriceDraft,
        error: dict.catalog.priceValidation,
      });
      return;
    }

    setPriceDraftState({
      sourceMinPrice: minPriceParam,
      sourceMaxPrice: maxPriceParam,
      min: minPriceDraft,
      max: maxPriceDraft,
      error: null,
    });
    updateParams({
      minPrice: min === undefined ? null : String(min),
      maxPrice: max === undefined ? null : String(max),
      page: "1",
    });
  }

  function resetPriceFilters() {
    setPriceDraftState({
      sourceMinPrice: minPriceParam,
      sourceMaxPrice: maxPriceParam,
      min: "",
      max: "",
      error: null,
    });
    updateParams({ minPrice: null, maxPrice: null, page: "1" });
  }

  function retryCategories() {
    setCategoriesError(null);
    setCategoriesLoading(true);
    setCategoriesRequest((request) => request + 1);
  }

  function retryProducts() {
    setError(null);
    setLoading(true);
    setProductsRequest((request) => request + 1);
  }

  return (
    <main aria-busy={loading}>
      <section className="bg-gradient-to-b from-[#f7f4ff] via-background to-background py-8 sm:py-12">
        <Container>
          <header className="max-w-3xl">
            <p className="inline-flex rounded-full border border-brand/15 bg-brand/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-brand">
              {dict.catalog.eyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
              {dict.catalog.title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {dict.catalog.description}
            </p>
          </header>

          {rootCategories.length > 0 ? (
            <nav
              className="mt-6 flex gap-2 overflow-x-auto pb-2"
              aria-label={dict.catalog.categoryLabel}
            >
              <button
                type="button"
                aria-pressed={!categoryId}
                onClick={() =>
                  updateParams({
                    categoryId: null,
                    subcategoryId: null,
                    page: "1",
                  })
                }
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${
                  !categoryId
                    ? "border-brand bg-brand text-white shadow-soft"
                    : "border-border bg-surface text-foreground hover:border-brand/40 hover:text-brand"
                }`}
              >
                {dict.catalog.allCategories}
              </button>
              {rootCategories.map((category) => {
                const isSelected = categoryId === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() =>
                      updateParams({
                        categoryId: category.id,
                        subcategoryId: null,
                        page: "1",
                      })
                    }
                    className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${
                      isSelected
                        ? "border-brand bg-brand text-white shadow-soft"
                        : "border-border bg-surface text-foreground hover:border-brand/40 hover:text-brand"
                    }`}
                  >
                    {categoryName(category, locale)}
                  </button>
                );
              })}
            </nav>
          ) : null}

          {categoriesError ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger/5 p-4">
              <p className="text-sm text-danger" role="alert">
                {categoriesError}
              </p>
              <Button
                variant="secondary"
                size="sm"
                disabled={categoriesLoading}
                onClick={retryCategories}
              >
                {dict.catalog.retry}
              </Button>
            </div>
          ) : null}

          <fieldset className="mt-5 rounded-2xl border border-border/70 bg-surface p-4 shadow-soft sm:p-5 md:p-6">
            <legend className="px-2 text-sm font-semibold text-foreground">
              {dict.catalog.filters}
            </legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
              <label className="flex min-w-0 flex-col gap-1.5 text-sm lg:col-span-2">
                <span className="font-medium text-foreground">
                  {dict.catalog.searchLabel}
                </span>
                <span className="relative">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <input
                    type="search"
                    value={searchInput}
                    placeholder={dict.catalog.searchPlaceholder}
                    onChange={(event) =>
                      setSearchDraft({ query: q, value: event.target.value })
                    }
                    className={`${CONTROL_CLASS_NAME} h-12 border-brand/25 bg-background pl-11 text-base shadow-sm`}
                  />
                </span>
              </label>
              <label className="flex min-w-0 flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">
                  {dict.catalog.categoryLabel}
                </span>
                <select
                  value={categoryId}
                  aria-busy={categoriesLoading}
                  onChange={(event) =>
                    updateParams({
                      categoryId: event.target.value || null,
                      subcategoryId: null,
                      page: "1",
                    })
                  }
                  className={CONTROL_CLASS_NAME}
                >
                  <option value="">{dict.catalog.allCategories}</option>
                  {rootCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {categoryName(category, locale)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-0 flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">
                  {dict.catalog.subcategoryLabel}
                </span>
                <select
                  value={subcategoryId}
                  disabled={!selectedCategory || subcategories.length === 0}
                  onChange={(event) =>
                    updateParams({
                      subcategoryId: event.target.value || null,
                      page: "1",
                    })
                  }
                  className={CONTROL_CLASS_NAME}
                >
                  <option value="">{dict.catalog.allSubcategories}</option>
                  {subcategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {categoryName(category, locale)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-0 flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">
                  {dict.catalog.conditionLabel}
                </span>
                <select
                  value={condition}
                  onChange={(event) =>
                    updateParams({
                      condition: event.target.value || null,
                      page: "1",
                    })
                  }
                  className={CONTROL_CLASS_NAME}
                >
                  <option value="">{dict.catalog.allConditions}</option>
                  {CONDITIONS.map((value) => (
                    <option key={value} value={value}>
                      {conditionLabel(value)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-0 flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">
                  {dict.catalog.sortLabel}
                </span>
                <select
                  value={sort}
                  onChange={(event) =>
                    updateParams({ sort: event.target.value, page: "1" })
                  }
                  className={CONTROL_CLASS_NAME}
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">
                  {dict.catalog.minPriceLabel}
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={minPriceDraft}
                  aria-invalid={Boolean(priceError)}
                  aria-describedby={priceError ? "price-filter-error" : undefined}
                  onChange={(event) =>
                    updatePriceDraft({ min: event.target.value })
                  }
                  className={CONTROL_CLASS_NAME}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">
                  {dict.catalog.maxPriceLabel}
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={maxPriceDraft}
                  aria-invalid={Boolean(priceError)}
                  aria-describedby={priceError ? "price-filter-error" : undefined}
                  onChange={(event) =>
                    updatePriceDraft({ max: event.target.value })
                  }
                  className={CONTROL_CLASS_NAME}
                />
              </label>
              <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-1">
                <Button variant="primary" size="md" onClick={applyPriceFilters}>
                  {dict.catalog.applyPrices}
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={resetPriceFilters}
                >
                  {dict.catalog.resetPrices}
                </Button>
              </div>
            </div>
            {priceError ? (
              <p
                id="price-filter-error"
                className="mt-3 text-sm text-danger"
                role="alert"
              >
                {priceError}
              </p>
            ) : null}
            {hasFilters ? (
              <div className="mt-4">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  {dict.catalog.clearFilters}
                </Button>
              </div>
            ) : null}
          </fieldset>

          {activeFilters.length > 0 ? (
            <section className="mt-4" aria-labelledby="active-filters-heading">
              <h2
                id="active-filters-heading"
                className="mb-2 text-sm font-medium text-foreground"
              >
                {dict.catalog.activeFilters}
              </h2>
              <ul className="flex flex-wrap gap-2">
                {activeFilters.map((filter) => (
                  <li
                    key={filter}
                    className="rounded-full border border-brand/20 bg-brand/5 px-3 py-1.5 text-sm text-foreground"
                  >
                    {filter}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <p
            className="mt-5 text-sm font-medium text-muted-foreground"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {loading
              ? dict.catalog.loading
              : dict.catalog.resultsCount.replace("{count}", String(total))}
          </p>

          {error ? (
            <div
              className="mt-8 rounded-2xl border border-danger/30 bg-danger/5 p-8 text-center"
              role="alert"
            >
              <p className="text-sm text-danger">{error}</p>
              <div className="mt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={loading}
                  onClick={retryProducts}
                >
                  {dict.catalog.retry}
                </Button>
              </div>
            </div>
          ) : loading ? (
            <div
              className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              aria-hidden="true"
            >
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-3xl border border-border/70 bg-surface shadow-card"
                >
                  <div className="aspect-square animate-pulse bg-muted motion-reduce:animate-none" />
                  <div className="space-y-3 p-4 sm:p-5">
                    <div className="h-3 w-1/3 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                    <div className="h-4 w-4/5 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                    <div className="h-4 w-2/3 animate-pulse rounded bg-muted motion-reduce:animate-none" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  locale={locale}
                />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-border bg-surface p-8 text-center shadow-card">
              <p className="text-sm text-muted-foreground">
                {dict.catalog.empty}
              </p>
              <div className="mt-4">
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  {dict.catalog.clearFilters}
                </Button>
              </div>
            </div>
          )}

          {!loading && !error && totalPages > 1 ? (
            <nav
              className="mt-10 flex items-center justify-center gap-2"
              aria-label={dict.catalog.pagination}
            >
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) })}
              >
                {dict.catalog.previous}
              </Button>
              <span className="text-sm text-muted-foreground" aria-live="polite">
                {dict.catalog.pageOf
                  .replace("{page}", String(page))
                  .replace("{total}", String(totalPages))}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: String(page + 1) })}
              >
                {dict.catalog.next}
              </Button>
            </nav>
          ) : null}
        </Container>
      </section>
    </main>
  );
}

export default function CatalogClient() {
  const dict = useDictionary();
  return (
    <Suspense
      fallback={
        <div className="section" role="status" aria-live="polite">
          <Container>{dict.catalog.loading}</Container>
        </div>
      }
    >
      <CatalogContent />
    </Suspense>
  );
}
