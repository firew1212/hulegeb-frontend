import Link from "next/link";
import { ProductCard } from "@/components/catalog/product-card";
import { ProductRail } from "@/components/catalog/product-rail";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { HeroSearch } from "@/components/home/hero-search";
import { getLocalizedApiErrorMessage } from "@/i18n/errors";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { listCategories, listProducts } from "@/lib/api/catalog";
import type { Category, Product, ProductImage } from "@/types/catalog";

import { Reveal } from "@/components/home/reveal";
import { CategoryCard } from "@/components/home/category-card";

export const instant = false;

type Props = { params: Promise<{ locale: string }> };

function categoryIncludesProduct(category: Category, product: Product): boolean {
  return (
    category.id === product.category.id ||
    (category.children ?? []).some((child) =>
      categoryIncludesProduct(child, product),
    )
  );
}

function findCategoryProduct(category: Category, products: Product[]): Product | undefined {
  return products.find(
    (product) =>
      categoryIncludesProduct(category, product) && product.images.length > 0,
  );
}

function getProductImage(product: Product | undefined): ProductImage | undefined {
  return product?.images.slice().sort((a, b) => a.sortOrder - b.sortOrder)[0];
}

export default async function Home({ params }: Props) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const dict = getDictionary(locale);
  const [categories, productsResult] = await Promise.allSettled([
    listCategories(),
    listProducts({ page: 1, limit: 12, sort: "newest" }),
  ]);
  const categoryList = categories.status === "fulfilled" ? categories.value : [];
  const products = productsResult.status === "fulfilled" ? productsResult.value.data : [];
  const categoryError =
    categories.status === "rejected"
      ? getLocalizedApiErrorMessage(categories.reason, dict.apiErrors, dict.home.categoriesError)
      : null;
  const productsError =
    productsResult.status === "rejected"
      ? getLocalizedApiErrorMessage(productsResult.reason, dict.apiErrors, dict.home.productsError)
      : null;
  const categoryTiles = categoryList.flatMap((category) => [
    category,
    ...(category.children ?? []),
  ]);
  const heroProductImage = getProductImage(
    products.find((product) => product.images.length > 0),
  );

  return (
    <main>
      <div className="bg-brand text-primary-foreground">
        <Container className="flex min-h-10 items-center justify-center gap-2 py-2 text-center text-xs font-medium sm:text-sm">
          <span>{dict.home.announcement}</span>
          <Link
            href={`/${locale}/catalog`}
            className="shrink-0 underline decoration-white/60 underline-offset-4 transition-colors hover:decoration-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none"
          >
            {dict.home.announcementLink}
          </Link>
        </Container>
      </div>

      <section
        aria-labelledby="home-hero-title"
        className="relative isolate overflow-hidden bg-foreground text-white"
      >
        {heroProductImage ? (
          <div className="absolute inset-0 -z-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroProductImage.imageUrl}
              alt=""
              fetchPriority="high"
              className="h-full w-full object-cover object-center"
            />
             <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />
          </div>
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-gradient-to-br from-secondary via-foreground to-brand-active"
          />
        )}
        <Container className="py-14 sm:py-20 lg:py-24">
          <div className="max-w-2xl animate-fade-up">
            <p className="text-sm font-semibold text-white/80">{dict.home.heroEyebrow}</p>
            <h1
              id="home-hero-title"
              className="mt-4 max-w-xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl"
            >
              {dict.home.heroTitle}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
              {dict.home.heroDescription}
            </p>
            <div className="mt-7 max-w-2xl rounded-full bg-surface p-1.5 shadow-lift">
              <HeroSearch />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button href={`/${locale}/catalog`} variant="accent" size="lg">
                {dict.home.browseCatalog}
              </Button>
              <Button
                href="#categories"
                variant="secondary"
                size="lg"
                className="border-white/60 bg-white/10 text-white hover:bg-white/20 active:bg-white/25"
              >
                {dict.home.exploreCategories}
              </Button>
            </div>
          </div>
        </Container>
      </section>

                  <section id="categories" className="section">
        <Container>
          <Reveal delay={0}>
            <SectionHeading
              eyebrow={dict.home.categoriesEyebrow}
              title={dict.home.categoriesTitle}
              description={dict.home.categoriesDescription}
            />
          </Reveal>

          {categoryTiles.length > 0 ? (
            <div className="categories-strip">
              {categoryTiles.map((category, index) => {
                const title = locale === "am" ? category.nameAm : category.nameEn;
                const image = getProductImage(findCategoryProduct(category, products));
                return (
                  <Reveal key={category.id} delay={Math.min(200 + index * 100, 900)}>
                    <CategoryCard
                      category={category}
                      title={title}
                      image={image}
                      locale={locale}
                      eyebrow={dict.home.categoriesEyebrow}
                      explore={dict.home.exploreCategories}
                    />
                  </Reveal>
                );
              })}
            </div>
          ) : null}

          {categoryError ? (
            <p className="mt-6 text-sm text-danger" role="alert">
              {categoryError}
            </p>
          ) : categoryTiles.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              {dict.home.categoriesUnavailable}
            </p>
          ) : null}
        </Container>
      </section>

      <section aria-labelledby="home-campaign-title" className="overflow-hidden bg-accent-soft">
        <Container className="py-12 sm:py-16">
          <div className="grid gap-6 rounded-3xl bg-secondary px-6 py-8 text-white shadow-soft sm:px-10 sm:py-10 md:grid-cols-[1fr_auto] md:items-center">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-white/75">
                {dict.home.campaignEyebrow}
              </p>
              <h2
                id="home-campaign-title"
                className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl"
              >
                {dict.home.campaignTitle}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-white/80">
                {dict.home.campaignDescription}
              </p>
            </div>
            <Button
              href={`/${locale}/catalog`}
              variant="secondary"
              size="lg"
              className="w-fit border-white/60 bg-white text-secondary hover:bg-white/90"
            >
              {dict.home.browseCatalog}
            </Button>
          </div>
        </Container>
      </section>

      <section className="section">
        <Container>
          <SectionHeading
            eyebrow={dict.home.productsEyebrow}
            title={dict.home.productsTitle}
            description={dict.home.productsDescription}
          />
          <div className="mt-8">
            {productsError ? (
              <p className="text-sm text-danger" role="alert">
                {productsError}
              </p>
            ) : products.length > 0 ? (
              <ProductRail label={dict.catalog.productRailLabel}>
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="w-[260px] shrink-0 snap-start sm:w-[280px]"
                  >
                    <ProductCard product={product} locale={locale} />
                  </div>
                ))}
              </ProductRail>
            ) : (
              <div className="rounded-2xl border border-border bg-muted p-8 text-center">
                <p className="text-sm text-muted-foreground">{dict.home.noProducts}</p>
              </div>
            )}
          </div>
        </Container>
      </section>

      <section className="pb-14 sm:pb-20">
        <Container>
          <div className="flex flex-col gap-5 rounded-3xl border border-border bg-surface p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                {dict.home.catalogCtaTitle}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                {dict.home.catalogCtaDescription}
              </p>
            </div>
            <Button
              href={`/${locale}/catalog`}
              variant="accent"
              size="lg"
              className="w-fit shrink-0"
            >
              {dict.home.browseCatalog}
            </Button>
          </div>
        </Container>
      </section>
    </main>
  );
}
