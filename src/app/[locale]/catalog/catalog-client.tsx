"use client";

export const instant = false;

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/catalog/product-card";
import { listCategories, listProducts } from "@/lib/api";
import type { Category, Product } from "@/types/catalog";
import { useDictionary, useLocale } from "@/i18n/provider";

const CONDITIONS = ["NEW", "USED", "REFURBISHED"] as const;

function CatalogContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dict = useDictionary();
  const locale = useLocale();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const page = Number(searchParams.get("page") ?? "1") || 1;
  const limit = 12;
  const q = searchParams.get("q") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const condition = searchParams.get("condition") ?? "";
  const sort = searchParams.get("sort") ?? "newest";
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";

  const [searchInput, setSearchInput] = useState(q);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setSearchInput(q); }, [q]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== q) updateParams({ q: searchInput || null, page: "1" });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    });
    router.replace(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    listCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

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
        condition: (condition as "NEW" | "USED" | "REFURBISHED") || undefined,
        sort: sort as "newest" | "oldest" | "price_asc" | "price_desc",
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
      },
      { signal: controller.signal },
    )
      .then((res) => {
        if (controller.signal.aborted) return;
        setProducts(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        setError(e?.message ?? dict.catalog.error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, q, categoryId, condition, sort, minPrice, maxPrice, dict.catalog.error]);

  const hasFilters = Boolean(q || categoryId || condition || minPrice || maxPrice || sort !== "newest");

  function clearFilters() { router.replace(pathname); }

  const conditionLabel = (c: string) => {
    if (c === "NEW") return dict.catalog.conditionNew;
    if (c === "USED") return dict.catalog.conditionUsed;
    if (c === "REFURBISHED") return dict.catalog.conditionRefurbished;
    return c;
  };

  const sortOptions = [
    { value: "newest", label: "Newest" },
    { value: "oldest", label: "Oldest" },
    { value: "price_asc", label: "Price: low to high" },
    { value: "price_desc", label: "Price: high to low" },
  ];

  return (
    <main>
      <section className="section">
        <Container>
          <SectionHeading eyebrow={dict.catalog.eyebrow} title={dict.catalog.title} description={dict.catalog.description} />
          <div className="mt-6 rounded-2xl border border-border bg-background p-4 md:p-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">{dict.catalog.searchLabel}</span>
                <input type="search" value={searchInput} placeholder={dict.catalog.searchPlaceholder} onChange={(e) => setSearchInput(e.target.value)} className="h-11 rounded-xl border border-border bg-background px-3 text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">{dict.catalog.categoryLabel}</span>
                <select value={categoryId} onChange={(e) => updateParams({ categoryId: e.target.value || null, page: "1" })} className="h-11 rounded-xl border border-border bg-background px-3 text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="">{dict.catalog.allCategories}</option>
                  {categories.map((c) => (<option key={c.id} value={c.id}>{locale === "am" ? c.nameAm : c.nameEn}</option>))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">{dict.catalog.conditionLabel}</span>
                <select value={condition} onChange={(e) => updateParams({ condition: e.target.value || null, page: "1" })} className="h-11 rounded-xl border border-border bg-background px-3 text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="">{dict.catalog.allConditions}</option>
                  {CONDITIONS.map((c) => (<option key={c} value={c}>{conditionLabel(c)}</option>))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">{dict.catalog.sortLabel}</span>
                <select value={sort} onChange={(e) => updateParams({ sort: e.target.value, page: "1" })} className="h-11 rounded-xl border border-border bg-background px-3 text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {sortOptions.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
                </select>
              </label>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">{dict.catalog.minPriceLabel}</span>
                <input type="number" value={minPrice} onChange={(e) => updateParams({ minPrice: e.target.value || null, page: "1" })} className="h-11 rounded-xl border border-border bg-background px-3 text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">{dict.catalog.maxPriceLabel}</span>
                <input type="number" value={maxPrice} onChange={(e) => updateParams({ maxPrice: e.target.value || null, page: "1" })} className="h-11 rounded-xl border border-border bg-background px-3 text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </label>
              <div className="flex items-end">
                {hasFilters ? (<Button variant="ghost" size="md" onClick={clearFilters}>{dict.catalog.clearFilters}</Button>) : null}
              </div>
            </div>
          </div>
          <div className="mt-6 text-sm text-muted-foreground">
            {loading ? dict.catalog.loading : `${total} ${total === 1 ? "product" : "products"}`}
          </div>
          {error ? (
            <div className="mt-8 rounded-2xl border border-border bg-muted p-8 text-center">
              <p className="text-sm text-danger">{error}</p>
              <div className="mt-4"><Button variant="secondary" size="sm" onClick={() => updateParams({})}>{dict.catalog.retry}</Button></div>
            </div>
          ) : loading ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (<div key={i} className="h-72 animate-pulse rounded-2xl border border-border bg-muted" />))}
            </div>
          ) : products.length ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (<ProductCard key={product.id} product={product} locale={locale} />))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-border bg-muted p-8 text-center">
              <p className="text-sm text-muted-foreground">{dict.catalog.empty}</p>
              <div className="mt-4"><Button variant="secondary" size="sm" onClick={clearFilters}>{dict.catalog.clearFilters}</Button></div>
            </div>
          )}
          {totalPages > 1 ? (
            <div className="mt-10 flex items-center justify-center gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => updateParams({ page: String(page - 1) })}>{dict.catalog.previous}</Button>
              <span className="text-sm text-muted-foreground">{dict.catalog.pageOf.replace("{page}", String(page)).replace("{total}", String(totalPages))}</span>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => updateParams({ page: String(page + 1) })}>{dict.catalog.next}</Button>
            </div>
          ) : null}
        </Container>
      </section>
    </main>
  );
}

export default function CatalogClient() {
  return (
    <Suspense fallback={<div className="section"><Container>Loading…</Container></div>}>
      <CatalogContent />
    </Suspense>
  );
}


