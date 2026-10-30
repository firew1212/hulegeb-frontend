"use client";

import { useState } from "react";

import { formatETB } from "@/lib/money";
import type { Product, ProductVariant } from "@/types/catalog";
import { useDictionary, useLocale } from "@/i18n/provider";

export default function ProductDetailClient({
  product,
  locale: localeProp,
}: {
  product: Product;
  locale?: string;
}) {
  const dict = useDictionary();
  const contextLocale = useLocale();
  const locale = localeProp ?? contextLocale;
  const images = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    product.variants.length === 1 ? product.variants[0].id : null,
  );

  const selectedVariant: ProductVariant | undefined = product.variants.find(
    (v) => v.id === selectedVariantId,
  );

  const title = locale === "am" ? product.titleAm : product.titleEn;
  const description = locale === "am" ? product.descriptionAm : product.descriptionEn;
  const categoryName = locale === "am" ? product.category.nameAm : product.category.nameEn;

  function galleryAlt(image: Product["images"][number]) {
    const alt = locale === "am" ? image.altTextAm : image.altTextEn;
    return alt || title;
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div>
        <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-muted shadow-sm">
          {images.length ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={images[activeImage]?.imageUrl}
              alt={galleryAlt(images[activeImage])}
              className="h-full w-full object-contain transition-opacity duration-300"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
              {dict.common.noImage}
            </div>
          )}
        </div>
        {images.length > 1 ? (
          <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
            {images.map((image, index) => (
              <button
                key={image.imageUrl + index}
                type="button"
                onClick={() => setActiveImage(index)}
                aria-label={dict.product.viewImage.replace("{index}", String(index + 1))}
                aria-pressed={activeImage === index}
                className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border transition-all duration-200 ${activeImage === index ? "border-accent ring-2 ring-accent/30" : "border-border hover:border-accent/40"} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.imageUrl}
                  alt={galleryAlt(image)}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {categoryName}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 text-2xl font-semibold text-foreground">
            {selectedVariant
              ? formatETB(selectedVariant.price, locale)
              : product.variants.length > 1
                ? dict.product.selectAnOption
                : product.variants[0]
                  ? formatETB(product.variants[0].price, locale)
                  : "—"}
          </p>
        </div>

        {description ? (
          <p className="text-base leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}

        {product.variants.length > 1 ? (
          <div>
            <p className="text-sm font-medium text-foreground">{dict.product.options}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setSelectedVariantId(variant.id)}
                  aria-pressed={selectedVariantId === variant.id}
                  className={`rounded-full border px-4 py-2 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selectedVariantId === variant.id ? "border-accent bg-accent/10 text-foreground" : "border-border bg-background text-foreground hover:bg-muted"}`}
                >
                  {variant.name}
                </button>
              ))}
            </div>
            {selectedVariant ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {dict.product.inStock.replace("{count}", String(selectedVariant.stockQuantity))}
              </p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                {dict.product.selectOptionToSee}
              </p>
            )}
          </div>
        ) : product.variants[0] ? (
          <p className="text-sm text-muted-foreground">
            {dict.product.inStock.replace("{count}", String(product.variants[0].stockQuantity))}
          </p>
        ) : null}

        <div className="text-xs text-muted-foreground">
          {dict.product.condition}: {product.condition.toLowerCase()}
        </div>
      </div>
    </div>
  );
}
