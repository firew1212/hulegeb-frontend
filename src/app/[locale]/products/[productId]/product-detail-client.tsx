"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getLocalizedApiErrorMessage } from "@/i18n/errors";
import { useAuth } from "@/lib/auth-context";
import { isApiError } from "@/lib/api";
import { addCartItem } from "@/lib/api/cart";
import { formatETB, priceRange } from "@/lib/money";
import type { Product, ProductVariant } from "@/types/catalog";
import { useDictionary, useLocale } from "@/i18n/provider";

const MAX_CART_QUANTITY = 10;

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
  const router = useRouter();
  const { status: authStatus, user, error: authError } = useAuth();
  const images = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    product.variants.length === 1 ? product.variants[0].id : null,
  );
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [cartFeedback, setCartFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const addToCartInFlight = useRef(false);

  const selectedVariant: ProductVariant | undefined = product.variants.find(
    (v) => v.id === selectedVariantId,
  );
  const availableQuantity = selectedVariant
    ? Math.min(MAX_CART_QUANTITY, Math.max(0, Math.floor(selectedVariant.stockQuantity)))
    : 0;

  const title = locale === "am" ? product.titleAm : product.titleEn;
  const description = locale === "am" ? product.descriptionAm : product.descriptionEn;
  const categoryName = locale === "am" ? product.category.nameAm : product.category.nameEn;
  const condition =
    product.condition === "NEW"
      ? dict.catalog.conditionNew
      : product.condition === "USED"
        ? dict.catalog.conditionUsed
        : dict.catalog.conditionRefurbished;

  function stockMessage(variant: ProductVariant) {
    if (variant.stockQuantity <= 0) return dict.product.outOfStock;

    const count = new Intl.NumberFormat(locale === "am" ? "am-ET" : "en-ET").format(
      variant.stockQuantity,
    );
    return dict.product.inStock.replace("{count}", count);
  }

  function galleryAlt(image: Product["images"][number]) {
    const alt = locale === "am" ? image.altTextAm : image.altTextEn;
    return alt || title;
  }

  function loginPath() {
    const returnTo = `/${locale}/products/${encodeURIComponent(product.id)}`;
    return `/${locale}/login?returnTo=${encodeURIComponent(returnTo)}`;
  }

  async function handleAddToCart() {
    if (addToCartInFlight.current || !selectedVariant || availableQuantity === 0) return;

    if (authStatus === "unauthenticated" || authStatus === "expired") {
      router.push(loginPath());
      return;
    }

    if (authStatus === "initializing") return;
    if (authStatus === "error") {
      setCartFeedback({
        type: "error",
        message: authError === "network" ? dict.apiErrors.network : dict.apiErrors.server,
      });
      return;
    }
    if (!user?.roles.includes("BUYER")) {
      setCartFeedback({ type: "error", message: dict.apiErrors.forbidden });
      return;
    }

    addToCartInFlight.current = true;
    setIsAddingToCart(true);
    setCartFeedback(null);
    try {
      await addCartItem(selectedVariant.id, quantity);
      setCartFeedback({ type: "success", message: dict.product.addedToCart });
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        router.replace(loginPath());
        return;
      }

      setCartFeedback({
        type: "error",
        message:
          isApiError(error) && error.status === 400
            ? dict.product.cartStockChanged
            : getLocalizedApiErrorMessage(error, dict.apiErrors),
      });
    } finally {
      addToCartInFlight.current = false;
      setIsAddingToCart(false);
    }
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
          <div
            role="group"
            aria-label={dict.product.imageGallery}
            className="mt-4 flex gap-3 overflow-x-auto pb-1"
          >
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
          <p
            aria-live="polite"
            aria-atomic="true"
            className="mt-4 text-2xl font-semibold text-foreground"
          >
            {selectedVariant
              ? formatETB(selectedVariant.price, locale)
              : product.variants.length > 1
                ? priceRange(product.variants, locale)
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
            <div role="group" aria-label={dict.product.options} className="mt-3 flex flex-wrap gap-2">
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  disabled={isAddingToCart}
                  onClick={() => {
                    setSelectedVariantId(variant.id);
                    setQuantity(1);
                    setCartFeedback(null);
                  }}
                  aria-pressed={selectedVariantId === variant.id}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 ${selectedVariantId === variant.id ? "border-accent bg-accent/10 font-semibold text-foreground ring-2 ring-accent/30" : "border-border bg-background text-foreground hover:border-accent/50 hover:bg-muted"}`}
                >
                  {variant.name}
                </button>
              ))}
            </div>
            {selectedVariant ? (
              <p
                role="status"
                aria-live="polite"
                className={`mt-3 text-sm ${selectedVariant.stockQuantity > 0 ? "text-muted-foreground" : "font-medium text-destructive"}`}
              >
                <span className="sr-only">
                  {dict.product.selectedVariant.replace("{variant}", selectedVariant.name)}{" "}
                </span>
                {stockMessage(selectedVariant)}
              </p>
            ) : (
              <p role="status" aria-live="polite" className="mt-3 text-sm text-muted-foreground">
                {dict.product.selectOptionToSee}
              </p>
            )}
          </div>
        ) : product.variants[0] ? (
          <p
            role="status"
            aria-live="polite"
            className={`text-sm ${product.variants[0].stockQuantity > 0 ? "text-muted-foreground" : "font-medium text-destructive"}`}
          >
            {stockMessage(product.variants[0])}
          </p>
        ) : null}

        <div className="text-xs text-muted-foreground">
          {dict.product.condition}: {condition}
        </div>

        {product.variants.length > 0 ? (
          <div className="flex flex-col items-start gap-3">
            <div className="flex items-center gap-3">
              <label htmlFor="product-quantity" className="text-sm font-medium text-foreground">
                {dict.product.quantity}
              </label>
              <select
                id="product-quantity"
                value={availableQuantity > 0 ? quantity : ""}
                disabled={availableQuantity === 0 || isAddingToCart}
                onChange={(event) => {
                  setQuantity(Number(event.target.value));
                  setCartFeedback(null);
                }}
                className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              >
                {availableQuantity > 0 ? (
                  Array.from({ length: availableQuantity }, (_, index) => (
                    <option key={index + 1} value={index + 1}>
                      {index + 1}
                    </option>
                  ))
                ) : (
                  <option value="">
                    {selectedVariant ? dict.product.outOfStock : dict.product.selectAnOption}
                  </option>
                )}
              </select>
            </div>
            {product.variants.length > 1 && !selectedVariant ? (
              <p className="text-sm text-muted-foreground">{dict.product.selectVariantToAdd}</p>
            ) : null}
            <Button
              type="button"
              disabled={
                !selectedVariant ||
                availableQuantity === 0 ||
                authStatus === "initializing" ||
                isAddingToCart
              }
              onClick={() => void handleAddToCart()}
              aria-busy={isAddingToCart}
            >
              {isAddingToCart ? dict.product.addingToCart : dict.product.addToCart}
            </Button>
            {cartFeedback ? (
              <p
                role={cartFeedback.type === "error" ? "alert" : "status"}
                aria-live={cartFeedback.type === "error" ? "assertive" : "polite"}
                className={`text-sm ${cartFeedback.type === "error" ? "text-destructive" : "text-muted-foreground"}`}
              >
                {cartFeedback.message}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
