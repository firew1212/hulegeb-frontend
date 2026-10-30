import { notFound } from "next/navigation";
export const instant = false;
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { getProduct } from "@/lib/api";
import ProductDetailClient from "./product-detail-client";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

type Props = { params: Promise<{ locale: string; productId: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale: rawLocale, productId } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const dict = getDictionary(locale);
  try {
    const product = await getProduct(productId);
    const title = locale === "am" ? product.titleAm : product.titleEn;
    return {
      title: dict.metadata.productTitle.replace("{title}", title),
      description: (locale === "am" ? product.descriptionAm : product.descriptionEn) ?? dict.metadata.productDescriptionFallback,
    };
  } catch {
    return { title: dict.metadata.notFoundTitle };
  }
}

export default async function ProductPage({ params }: Props) {
  const { locale: rawLocale, productId } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const dict = getDictionary(locale);
  let product;
  try {
    product = await getProduct(productId);
  } catch {
    notFound();
  }
  return (
    <main>
      <section className="section">
        <Container>
          <div className="mb-6">
            <Button href={`/${locale}/catalog`} variant="ghost" size="sm">
              {dict.common.backToCatalog}
            </Button>
          </div>
          <ProductDetailClient product={product!} locale={locale} />
        </Container>
      </section>
    </main>
  );
}
