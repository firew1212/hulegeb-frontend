import { ProductCard } from "@/components/catalog/product-card";
import { ProductRail } from "@/components/catalog/product-rail";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { getLocalizedApiErrorMessage } from "@/i18n/errors";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { listCategories, listProducts } from "@/lib/api/catalog";
import type { Category, Product, ProductImage } from "@/types/catalog";

import { Reveal } from "@/components/home/reveal";
import { CategoryCard } from "@/components/home/category-card";
import { SellerEntryLink } from "@/components/layout/seller-entry-link";

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

  return (
    <main>
      <section
        aria-labelledby="home-entry-title"
        className="overflow-hidden bg-accent-soft/50"
      >
        <Container className="py-9 sm:py-12 lg:py-14">
          <div className="mb-6 max-w-2xl sm:mb-8">
            <p className="text-sm font-semibold tracking-wide text-brand">
              {dict.home.entryEyebrow}
            </p>
            <h1
              id="home-entry-title"
              className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            >
              {dict.home.entryTitle}
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
              {dict.home.entryDescription}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:gap-6">
            <article className="group overflow-hidden rounded-[1.75rem] border border-brand/10 bg-surface shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-lift motion-reduce:transition-none">
              <div className="h-44 overflow-hidden bg-[#f1edff] sm:h-52">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 360 200"
                  className="h-full w-full transition-transform duration-300 group-hover:scale-[1.025] motion-reduce:transition-none"
                  fill="none"
                >
                  <circle cx="280" cy="50" r="66" fill="#E3DAFF" />
                  <circle cx="78" cy="36" r="4" fill="#B5A0FF" />
                  <circle cx="300" cy="151" r="5" fill="#B5A0FF" />
                  <ellipse cx="187" cy="171" rx="105" ry="13" fill="#DED5F8" />
                  <path d="M92 80h100l-9 82h-82l-9-82Z" fill="#7752F7" />
                  <path d="m108 80 7-25h53l8 25" stroke="#7752F7" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M116 101h49" stroke="white" strokeWidth="4" strokeLinecap="round" opacity=".8" />
                  <path d="M181 102h82v60h-82z" fill="#FFCFB8" />
                  <path d="M181 102h82v13h-82z" fill="#F2A98C" />
                  <path d="M197 128h50v34h-50z" fill="#FFF8F2" />
                  <path d="M197 128h50v8h-50z" fill="#F4D6C8" />
                  <path d="M199 68h56v47h-56z" fill="#FFFDF9" />
                  <path d="M199 68h56v11h-56z" fill="#D9CDFB" />
                  <path d="M212 68v47m29-47v47" stroke="#BDAAFF" strokeWidth="3" />
                  <path d="M273 116h30v46h-30z" fill="#A3D7C5" />
                  <path d="M280 116c0-15 17-17 17-30m-17 30c-14-10-13-19-13-19m13 19c13-8 17-17 17-17" stroke="#5C9D82" strokeWidth="4" strokeLinecap="round" />
                  <path d="M270 162h37" stroke="#5C9D82" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </div>
              <div className="p-5 sm:p-7">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
                  {dict.home.buyerLabel}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-[1.7rem]">
                  {dict.home.buyerTitle}
                </h2>
                <p className="mt-2 min-h-12 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {dict.home.buyerDescription}
                </p>
                <Button
                  href={`/${locale}/catalog`}
                  variant="accent"
                  size="md"
                  className="mt-5 gap-2"
                >
                  {dict.home.buyerCta}
                  <span aria-hidden="true">→</span>
                </Button>
              </div>
            </article>

            <article className="group overflow-hidden rounded-[1.75rem] border border-brand/10 bg-surface shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-lift motion-reduce:transition-none">
              <div className="h-44 overflow-hidden bg-[#f2efff] sm:h-52">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 360 200"
                  className="h-full w-full transition-transform duration-300 group-hover:scale-[1.025] motion-reduce:transition-none"
                  fill="none"
                >
                  <circle cx="278" cy="55" r="68" fill="#E4DBFF" />
                  <circle cx="74" cy="46" r="4" fill="#B5A0FF" />
                  <circle cx="299" cy="157" r="5" fill="#B5A0FF" />
                  <ellipse cx="184" cy="171" rx="111" ry="13" fill="#DED5F8" />
                  <path d="M91 91h186v75H91z" fill="#FFFDF9" />
                  <path d="m79 94 18-40h151l19 40H79Z" fill="#7752F7" />
                  <path d="M79 94h188v17H79z" fill="#6841EB" />
                  <path d="M105 54 94 94h32l8-40h-29Zm57 0-3 40h32l-1-40h-28Zm57 0 9 40h32l-11-40h-30Z" fill="#F7F2FF" />
                  <path d="M105 111h56v55h-56z" fill="#E9E1FF" />
                  <path d="M114 120h38v37h-38z" fill="#C9B9FF" />
                  <path d="M180 119h44v47h-44z" fill="#F1C4A9" />
                  <path d="M194 136h16v30h-16z" fill="#A87857" />
                  <circle cx="207" cy="151" r="2" fill="#FFF4D8" />
                  <path d="M242 126h22v40h-22z" fill="#A3D7C5" />
                  <path d="M253 126c0-17 11-22 11-31m-11 31c-13-8-13-17-13-17m13 17c10-8 12-15 12-15" stroke="#5C9D82" strokeWidth="4" strokeLinecap="round" />
                  <path d="M239 166h29" stroke="#5C9D82" strokeWidth="4" strokeLinecap="round" />
                  <path d="M130 42h25" stroke="#B5A0FF" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
              <div className="p-5 sm:p-7">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
                  {dict.home.sellerLabel}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-[1.7rem]">
                  {dict.home.sellerTitle}
                </h2>
                <p className="mt-2 min-h-12 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {dict.home.sellerDescription}
                </p>
                <SellerEntryLink className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-medium text-primary-foreground transition-colors duration-200 hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none">
                  {dict.home.sellerCta}
                  <span aria-hidden="true">→</span>
                </SellerEntryLink>
              </div>
            </article>
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
