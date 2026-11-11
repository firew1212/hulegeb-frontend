"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { SellerWorkspace } from "@/components/dashboard/seller-workspace";
import { Button } from "@/components/ui/button";
import { isApiError } from "@/lib/api";
import { getLocalizedApiErrorMessage } from "@/i18n/errors";
import type { Dictionary } from "@/i18n/dictionaries";
import { useDictionary, useLocale } from "@/i18n/provider";
import {
  createSellerImage,
  createSellerProduct,
  createSellerVariant,
  deactivateSellerVariant,
  getSellerProduct,
  listSellerCategories,
  removeSellerImage,
  unpublishSellerProduct,
  updateSellerImage,
  updateSellerProduct,
  updateSellerVariant,
  type SellerImageInput,
  type SellerProductInput,
  type SellerVariantInput,
} from "@/lib/api/seller-products";
import type {
  Category,
  SellerProduct,
  SellerProductImage,
  SellerProductStatus,
  SellerProductVariant,
} from "@/types/catalog";

const CONTROL_CLASS =
  "h-11 w-full rounded-xl border border-control-border bg-surface px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60";
const TEXTAREA_CLASS =
  "min-h-24 w-full rounded-xl border border-control-border bg-surface px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60";
type ProductCondition = "NEW" | "USED" | "REFURBISHED";

type ProductDraft = {
  categoryId: string;
  slug: string;
  titleEn: string;
  titleAm: string;
  descriptionEn: string;
  descriptionAm: string;
  condition: ProductCondition;
};

type PendingProductImage = {
  id: number;
  input: SellerImageInput;
};

const emptyDraft: ProductDraft = {
  categoryId: "",
  slug: "",
  titleEn: "",
  titleAm: "",
  descriptionEn: "",
  descriptionAm: "",
  condition: "NEW",
};

function flattenCategories(categories: Category[]): Category[] {
  return categories.flatMap((category) => [
    category,
    ...(category.children ?? []),
  ]);
}

function isHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !!url.hostname;
  } catch {
    return false;
  }
}

function parseAttributes(value: string): Record<string, unknown> | undefined {
  if (!value.trim()) return undefined;
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("attributes");
  }
  return Object.fromEntries(Object.entries(parsed));
}

function readVariant(
  form: HTMLFormElement,
  creating: boolean,
  messages: SellerProductMessages,
): SellerVariantInput {
  const data = new FormData(form);
  const sku = String(data.get("sku") ?? "").trim();
  const name = String(data.get("name") ?? "").trim();
  const priceText = String(data.get("price") ?? "").trim();
  const stockText = String(data.get("stockQuantity") ?? "").trim();
  const attributesText = String(data.get("attributes") ?? "");
  const price = Number(priceText);
  const stockQuantity = Number(stockText);
  if (
    (creating && (!sku || !/^[A-Za-z0-9._-]{1,100}$/.test(sku))) ||
    !name ||
    name.length > 255 ||
    !priceText ||
    !Number.isFinite(price) ||
    price < 0.01 ||
    price > 9999999999.99 ||
    !/^\d+(?:\.\d{1,2})?$/.test(priceText) ||
    !Number.isInteger(stockQuantity) ||
    stockQuantity < 0
  ) {
    throw new Error(messages.variantValidation);
  }
  let attributes: Record<string, unknown> | undefined;
  try {
    attributes = parseAttributes(attributesText);
  } catch {
    throw new Error(messages.attributesValidation);
  }
  return { sku, name, price, stockQuantity, attributes };
}

function readImage(form: HTMLFormElement, messages: SellerProductMessages): SellerImageInput {
  const data = new FormData(form);
  const imageUrl = String(data.get("imageUrl") ?? "").trim();
  const altTextEn = String(data.get("altTextEn") ?? "").trim();
  const altTextAm = String(data.get("altTextAm") ?? "").trim();
  const sortText = String(data.get("sortOrder") ?? "").trim();
  const sortOrder = Number(sortText);
  if (
    !isHttpsUrl(imageUrl) ||
    imageUrl.length > 2048 ||
    altTextEn.length > 255 ||
    altTextAm.length > 255 ||
    !Number.isInteger(sortOrder) ||
    sortOrder < 0 ||
    sortOrder > 10000
  ) {
    throw new Error(messages.imageValidation);
  }
  return {
    imageUrl,
    altTextEn: altTextEn || undefined,
    altTextAm: altTextAm || undefined,
    sortOrder,
  };
}

function statusTone(status: SellerProductStatus) {
  if (status === "APPROVED") return "success";
  if (status === "PENDING_APPROVAL") return "warning";
  if (status === "REJECTED") return "danger";
  if (status === "DRAFT") return "info";
  if (status === "REMOVED") return "danger";
  return "neutral";
}

function categoryDisplayName(category: Category, locale: string) {
  return locale === "am" ? category.nameAm : category.nameEn;
}

export default function SellerProductFormClient({
  mode,
  productId,
}: {
  mode: "create" | "edit";
  productId?: string;
}) {
  const dict = useDictionary();
  const locale = useLocale();
  const router = useRouter();
  const messages = dict.sellerProducts;
  const isEditing = mode === "edit";
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [categoryReload, setCategoryReload] = useState(0);
  const [product, setProduct] = useState<SellerProduct | null>(null);
  const [productLoading, setProductLoading] = useState(isEditing);
  const [productError, setProductError] = useState<string | null>(null);
  const [productReload, setProductReload] = useState(0);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [pendingImages, setPendingImages] = useState<PendingProductImage[]>([]);
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [mutation, setMutation] = useState<string | null>(null);
  const operationInFlight = useRef(false);
  const productSubmitInFlight = useRef(false);
  const pendingImageId = useRef(0);
  const activeProductId = productId ?? createdProductId;

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCategoriesLoading(true);
    setCategoriesError(null);
    listSellerCategories()
      .then((response) => {
        if (active) setCategories(flattenCategories(response).filter((item) => item.isActive !== false));
      })
      .catch((requestError: unknown) => {
        if (active) {
          setCategoriesError(
            getLocalizedApiErrorMessage(
              requestError,
              dict.apiErrors,
              messages.categoriesError,
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
  }, [categoryReload, dict.apiErrors, messages.categoriesError]);

  useEffect(() => {
    if (!isEditing || !productId) return;
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProductLoading(true);
    setProductError(null);
    getSellerProduct(productId)
      .then((response) => {
        if (!active) return;
        setProduct(response);
        setDraft({
          categoryId: response.category.id,
          slug: response.slug,
          titleEn: response.titleEn,
          titleAm: response.titleAm,
          descriptionEn: response.descriptionEn ?? "",
          descriptionAm: response.descriptionAm ?? "",
          condition: response.condition,
        });
      })
      .catch((requestError: unknown) => {
        if (active) {
          setProductError(
            isApiError(requestError) && requestError.status === 404
              ? messages.productNotFound
              : getLocalizedApiErrorMessage(
                  requestError,
                  dict.apiErrors,
                  messages.loadError,
                ),
          );
        }
      })
      .finally(() => {
        if (active) setProductLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    dict.apiErrors,
    isEditing,
    messages.loadError,
    messages.productNotFound,
    productId,
    productReload,
  ]);

  function displayStatus(status: SellerProductStatus) {
    return messages.statuses[status];
  }

  function updateDraft<Key extends keyof ProductDraft>(key: Key, value: ProductDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function buildProductInput(): SellerProductInput {
    const slug = draft.slug.trim();
    const titleEn = draft.titleEn.trim();
    const titleAm = draft.titleAm.trim();
    const descriptionEn = draft.descriptionEn.trim();
    const descriptionAm = draft.descriptionAm.trim();
    if (
      !draft.categoryId ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
      slug.length > 180 ||
      !titleEn ||
      titleEn.length > 255 ||
      !titleAm ||
      titleAm.length > 255 ||
      descriptionEn.length > 5000 ||
      descriptionAm.length > 5000
    ) {
      throw new Error(messages.productValidation);
    }
    return {
      categoryId: draft.categoryId,
      slug,
      titleEn,
      titleAm,
      condition: draft.condition,
      descriptionEn: descriptionEn || undefined,
      descriptionAm: descriptionAm || undefined,
    };
  }

  async function handleProductSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (productSubmitInFlight.current || operationInFlight.current) return;
    productSubmitInFlight.current = true;
    setSavingProduct(true);
    setFormError(null);
    setFeedback(null);
    let createdDuringSubmit = false;
    let submittingPendingImages = false;
    try {
      const input = buildProductInput();
      if (isEditing && productId) {
        const updated = await updateSellerProduct(productId, input);
        setProduct(updated);
        setFeedback(messages.pendingApprovalFeedback);
      } else {
        const savedProduct = createdProductId
          ? await updateSellerProduct(createdProductId, input)
          : await createSellerProduct(input);
        if (!createdProductId) {
          createdDuringSubmit = true;
          setCreatedProductId(savedProduct.id);
        }
        setProduct(savedProduct);
        submittingPendingImages = pendingImages.length > 0;
        for (const pendingImage of pendingImages) {
          const image = await createSellerImage(savedProduct.id, pendingImage.input);
          setProduct((current) =>
            current
              ? {
                  ...current,
                  status: "PENDING_APPROVAL",
                  images: [...current.images, image].sort(
                    (a, b) => a.sortOrder - b.sortOrder,
                  ),
                }
              : current,
          );
          setPendingImages((current) =>
            current.filter((item) => item.id !== pendingImage.id),
          );
        }
        router.push(
          `/${locale}/dashboard/seller/products/${encodeURIComponent(savedProduct.id)}`,
        );
      }
    } catch (requestError: unknown) {
      const errorMessage =
        requestError instanceof Error && !("status" in requestError)
          ? requestError.message
          : getLocalizedApiErrorMessage(
              requestError,
              dict.apiErrors,
              messages.saveError,
            );
      setFormError(
        (createdDuringSubmit || createdProductId) && submittingPendingImages
          ? `${messages.imageSubmissionFailed} ${errorMessage}`
          : errorMessage,
      );
    } finally {
      productSubmitInFlight.current = false;
      setSavingProduct(false);
    }
  }

  async function runMutation(
    key: string,
    operation: () => Promise<void>,
    options: { markPending?: boolean; successMessage?: string } = {},
  ): Promise<boolean> {
    if (operationInFlight.current) return false;
    operationInFlight.current = true;
    setMutation(key);
    setFormError(null);
    setFeedback(null);
    try {
      await operation();
      if (options.markPending !== false) {
        setProduct((current) =>
          current ? { ...current, status: "PENDING_APPROVAL" } : current,
        );
      }
      setFeedback(options.successMessage ?? messages.pendingApprovalFeedback);
      return true;
    } catch (requestError: unknown) {
      setFormError(
        getLocalizedApiErrorMessage(
          requestError,
          dict.apiErrors,
          messages.saveError,
        ),
      );
      return false;
    } finally {
      operationInFlight.current = false;
      setMutation(null);
    }
  }

  async function saveVariant(
    variantId: string | null,
    input: SellerVariantInput,
  ): Promise<boolean> {
    if (!activeProductId) return false;
    return runMutation(variantId ?? "variant-new", async () => {
      const saved = variantId
        ? await updateSellerVariant(activeProductId, variantId, {
            name: input.name,
            price: input.price,
            stockQuantity: input.stockQuantity,
            attributes: input.attributes ?? {},
          })
        : await createSellerVariant(activeProductId, input);
      setProduct((current) =>
        current
          ? {
              ...current,
              variants: variantId
                ? current.variants.map((variant) =>
                    variant.id === saved.id ? saved : variant,
                  )
                : [...current.variants, saved],
            }
          : current,
      );
    });
  }

  async function removeVariant(variant: SellerProductVariant) {
    if (!activeProductId) return;
    await runMutation(variant.id, async () => {
      if (variant.isActive) {
        await deactivateSellerVariant(activeProductId, variant.id);
        setProduct((current) =>
          current
            ? {
                ...current,
                variants: current.variants.map((item) =>
                  item.id === variant.id ? { ...item, isActive: false } : item,
                ),
              }
            : current,
        );
      } else {
        const restored = await updateSellerVariant(activeProductId, variant.id, {
          isActive: true,
        });
        setProduct((current) =>
          current
            ? {
                ...current,
                variants: current.variants.map((item) =>
                  item.id === variant.id ? restored : item,
                ),
              }
            : current,
        );
      }
    });
  }

  async function saveImage(
    imageId: string | null,
    input: SellerImageInput,
  ): Promise<boolean> {
    if (!activeProductId) return false;
    return runMutation(imageId ?? "image-new", async () => {
      const saved = imageId
        ? await updateSellerImage(activeProductId, imageId, input)
        : await createSellerImage(activeProductId, input);
      setProduct((current) =>
        current
          ? {
              ...current,
              images: imageId
                ? current.images.map((image) =>
                    image.id === saved.id ? saved : image,
                  )
                : [...current.images, saved].sort(
                    (a, b) => a.sortOrder - b.sortOrder,
                  ),
            }
          : current,
      );
    });
  }

  async function deleteImage(image: SellerProductImage) {
    if (!activeProductId) return;
    await runMutation(image.id, async () => {
      await removeSellerImage(activeProductId, image.id);
      setProduct((current) =>
        current
          ? {
              ...current,
              images: current.images.filter((item) => item.id !== image.id),
            }
          : current,
      );
    });
  }

  async function unpublish() {
    if (!activeProductId || !product) return;
    if (!window.confirm(messages.unpublishConfirmation)) return;
    await runMutation(
      "unpublish",
      async () => {
      const updated = await unpublishSellerProduct(activeProductId);
      setProduct(updated);
      },
      { markPending: false, successMessage: messages.unpublishedFeedback },
    );
  }

  const categoryChoices = categories.some(
    (category) => category.id === product?.category.id,
  )
    ? categories
    : product
      ? [product.category, ...categories]
      : categories;

  return (
    <ProtectedRoute roles={["SELLER"]}>
      <SellerWorkspace
        title={isEditing ? messages.editTitle : messages.createTitle}
      >
        {productLoading ? (
          <p className="text-sm text-muted-foreground" role="status" aria-busy="true">
            {messages.loading}
          </p>
        ) : productError ? (
          <div className="rounded-2xl border border-danger/30 bg-surface p-6" role="alert">
            <p className="text-sm text-danger">{productError}</p>
            <Button
              className="mt-4"
              size="sm"
              variant="secondary"
              onClick={() => setProductReload((value) => value + 1)}
            >
              {messages.retry}
            </Button>
          </div>
        ) : (
          <>
            <PageHeader
              title={isEditing ? messages.editTitle : messages.createTitle}
              description={isEditing ? messages.editDescription : messages.createDescription}
              actions={
                <>
                  {product ? (
                    <StatusBadge
                      label={displayStatus(product.status)}
                      tone={statusTone(product.status)}
                    />
                  ) : null}
                  <Button
                    href={`/${locale}/dashboard/seller/products`}
                    variant="secondary"
                  >
                    {messages.backToProducts}
                  </Button>
                  {product && product.status !== "UNAVAILABLE" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={mutation !== null || savingProduct}
                      onClick={() => void unpublish()}
                    >
                      {mutation === "unpublish" ? messages.unpublishing : messages.unpublish}
                    </Button>
                  ) : null}
                </>
              }
            />

            {product ? (
              <p
                className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                  product.status === "REJECTED"
                    ? "border border-danger/30 bg-danger-soft text-danger"
                    : product.status === "PENDING_APPROVAL"
                      ? "border border-warning/30 bg-warning-soft text-warning"
                      : product.status === "APPROVED"
                        ? "border border-success/30 bg-success-soft text-success"
                        : "bg-accent-soft text-brand"
                }`}
              >
                {messages.statusDescription[product.status]}
              </p>
            ) : null}

            {formError ? (
              <p className="mt-4 rounded-xl border border-danger/30 bg-surface px-4 py-3 text-sm text-danger" role="alert">
                {formError}
              </p>
            ) : null}
            {feedback ? (
              <p className="mt-4 rounded-xl border border-success/30 bg-surface px-4 py-3 text-sm text-success" role="status">
                {feedback}
              </p>
            ) : null}

            <form
              onSubmit={(event) => void handleProductSubmit(event)}
              className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6"
            >
              <h2 className="text-lg font-semibold text-foreground">{messages.productInformation}</h2>
              {categoriesError ? (
                <div className="mt-4 rounded-xl border border-danger/30 p-4" role="alert">
                  <p className="text-sm text-danger">{categoriesError}</p>
                  <Button
                    className="mt-3"
                    size="sm"
                    variant="secondary"
                    type="button"
                    onClick={() => setCategoryReload((value) => value + 1)}
                  >
                    {messages.retry}
                  </Button>
                </div>
              ) : null}
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <Field label={messages.categoryLabel} required>
                  <select
                    className={CONTROL_CLASS}
                    value={draft.categoryId}
                    onChange={(event) => updateDraft("categoryId", event.target.value)}
                    required
                    disabled={categoriesLoading || savingProduct}
                  >
                    <option value="">{categoriesLoading ? messages.loading : messages.selectCategory}</option>
                    {categoryChoices.map((category) => (
                      <option key={category.id} value={category.id}>
                        {categoryDisplayName(category, locale)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={messages.slugLabel} required>
                  <input
                    className={CONTROL_CLASS}
                    value={draft.slug}
                    onChange={(event) => updateDraft("slug", event.target.value)}
                    required
                    maxLength={180}
                    pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                    placeholder={messages.slugPlaceholder}
                    disabled={savingProduct}
                  />
                </Field>
                <Field label={messages.titleEnLabel} required>
                  <input
                    className={CONTROL_CLASS}
                    value={draft.titleEn}
                    onChange={(event) => updateDraft("titleEn", event.target.value)}
                    required
                    maxLength={255}
                    disabled={savingProduct}
                  />
                </Field>
                <Field label={messages.titleAmLabel} required>
                  <input
                    className={CONTROL_CLASS}
                    value={draft.titleAm}
                    onChange={(event) => updateDraft("titleAm", event.target.value)}
                    required
                    maxLength={255}
                    disabled={savingProduct}
                  />
                </Field>
                <Field label={messages.conditionLabel} required>
                  <select
                    className={CONTROL_CLASS}
                    value={draft.condition}
                    onChange={(event) =>
                      updateDraft(
                        "condition",
                        event.target.value as ProductDraft["condition"],
                      )
                    }
                    disabled={savingProduct}
                  >
                    <option value="NEW">{dict.catalog.conditionNew}</option>
                    <option value="USED">{dict.catalog.conditionUsed}</option>
                    <option value="REFURBISHED">{dict.catalog.conditionRefurbished}</option>
                  </select>
                </Field>
                <div className="md:col-span-2">
                  <Field label={messages.descriptionEnLabel}>
                    <textarea
                      className={TEXTAREA_CLASS}
                      value={draft.descriptionEn}
                      onChange={(event) => updateDraft("descriptionEn", event.target.value)}
                      maxLength={5000}
                      disabled={savingProduct}
                    />
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Field label={messages.descriptionAmLabel}>
                    <textarea
                      className={TEXTAREA_CLASS}
                      value={draft.descriptionAm}
                      onChange={(event) => updateDraft("descriptionAm", event.target.value)}
                      maxLength={5000}
                      disabled={savingProduct}
                    />
                  </Field>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button type="submit" disabled={savingProduct || categoriesLoading || !!categoriesError}>
                  {savingProduct
                    ? messages.saving
                    : isEditing
                      ? messages.saveProduct
                      : createdProductId
                        ? messages.retryImages
                        : messages.createProduct}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  href={`/${locale}/dashboard/seller/products`}
                >
                  {messages.cancel}
                </Button>
              </div>
            </form>

            {!isEditing ? (
              <section className="mt-8 rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
                <h2 className="text-lg font-semibold text-foreground">{messages.imagesTitle}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{messages.imagesDescription}</p>
                {pendingImages.length > 0 ? (
                  <ul className="mt-5 grid gap-4 sm:grid-cols-2">
                    {pendingImages.map(({ id, input }) => (
                      <li key={id} className="rounded-xl border border-border p-4">
                        <ProductImagePreview
                          src={input.imageUrl}
                          alt={input.altTextEn || input.altTextAm || messages.imagePreview}
                        />
                        <p className="mt-3 break-all text-sm text-foreground">{input.imageUrl}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {messages.sortOrderLabel}: {input.sortOrder ?? 0}
                        </p>
                        <Button
                          className="mt-3"
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={savingProduct}
                          onClick={() =>
                            setPendingImages((current) =>
                              current.filter((image) => image.id !== id),
                            )
                          }
                        >
                          {messages.removeImage}
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="mt-5">
                  <ImageDraftEditor
                    key={pendingImages.length}
                    busy={savingProduct}
                    messages={messages}
                    initialSortOrder={pendingImages.length}
                    onAdd={(input) => {
                      pendingImageId.current += 1;
                      setPendingImages((current) => [
                        ...current,
                        { id: pendingImageId.current, input },
                      ]);
                    }}
                  />
                </div>
              </section>
            ) : null}

            {product && activeProductId ? (
              <div className="mt-8 grid gap-6">
                <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">{messages.variantsTitle}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{messages.variantsDescription}</p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-4">
                    {product.variants.map((variant) => (
                      <VariantEditor
                        key={variant.id}
                        variant={variant}
                        busy={mutation !== null || savingProduct}
                        pendingKey={mutation}
                        messages={messages}
                        onSave={(input) => saveVariant(variant.id, input)}
                        onToggle={() => void removeVariant(variant)}
                      />
                    ))}
                    <VariantEditor
                      key="new-variant"
                      busy={mutation !== null || savingProduct}
                      pendingKey={mutation}
                      messages={messages}
                      onSave={(input) => saveVariant(null, input)}
                    />
                  </div>
                </section>

                <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
                  <h2 className="text-lg font-semibold text-foreground">{messages.imagesTitle}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{messages.imagesDescription}</p>
                  <div className="mt-5 grid gap-4">
                    {product.images.map((image) => (
                      <ImageEditor
                        key={image.id}
                        image={image}
                        busy={mutation !== null || savingProduct}
                        messages={messages}
                        onSave={(input) => saveImage(image.id, input)}
                        onRemove={() => void deleteImage(image)}
                      />
                    ))}
                    <ImageEditor
                      key="new-image"
                      busy={mutation !== null || savingProduct}
                      messages={messages}
                      initialSortOrder={product.images.length}
                      onSave={(input) => saveImage(null, input)}
                    />
                  </div>
                </section>
              </div>
            ) : null}
          </>
        )}
      </SellerWorkspace>
    </ProtectedRoute>
  );
}

function Field({
  children,
  label,
  required = false,
}: {
  children: React.ReactNode;
  label: string;
  required?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

type SellerProductMessages = Dictionary["sellerProducts"];

function VariantEditor({
  variant,
  busy,
  pendingKey,
  messages,
  onSave,
  onToggle,
}: {
  variant?: SellerProductVariant;
  busy: boolean;
  pendingKey: string | null;
  messages: SellerProductMessages;
  onSave: (input: SellerVariantInput) => Promise<boolean>;
  onToggle?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const saveInFlight = useRef(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saveInFlight.current) return;
    const form = event.currentTarget;
    saveInFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      const saved = await onSave(readVariant(form, !variant, messages));
      if (!variant && saved) form.reset();
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error ? submitError.message : messages.saveError,
      );
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="rounded-xl border border-border p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium text-foreground">
          {variant ? variant.name : messages.addVariant}
        </h3>
        {variant ? (
          <StatusBadge
            label={variant.isActive ? messages.active : messages.inactive}
            tone={variant.isActive ? "success" : "neutral"}
          />
        ) : null}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={messages.skuLabel} required={!variant}>
          <input
            className={CONTROL_CLASS}
            name="sku"
            defaultValue={variant?.sku ?? ""}
            required={!variant}
            maxLength={100}
            pattern="[A-Za-z0-9._-]+"
            readOnly={!!variant}
            disabled={busy || saving}
          />
        </Field>
        <Field label={messages.variantNameLabel} required>
          <input
            className={CONTROL_CLASS}
            name="name"
            defaultValue={variant?.name ?? ""}
            required
            maxLength={255}
            disabled={busy || saving}
          />
        </Field>
        <Field label={messages.priceLabel} required>
          <input
            className={CONTROL_CLASS}
            name="price"
            defaultValue={variant?.price ?? ""}
            required
            type="number"
            min="0.01"
            max="9999999999.99"
            step="0.01"
            inputMode="decimal"
            disabled={busy || saving}
          />
        </Field>
        <Field label={messages.stockLabel} required>
          <input
            className={CONTROL_CLASS}
            name="stockQuantity"
            defaultValue={variant?.stockQuantity ?? 0}
            required
            type="number"
            min="0"
            step="1"
            disabled={busy || saving}
          />
        </Field>
        <div className="sm:col-span-2 lg:col-span-4">
          <Field label={messages.attributesLabel}>
            <textarea
              className={TEXTAREA_CLASS}
              name="attributes"
              defaultValue={
                variant?.attributes ? JSON.stringify(variant.attributes, null, 2) : ""
              }
              placeholder={messages.attributesPlaceholder}
              disabled={busy || saving}
            />
          </Field>
        </div>
      </div>
      {error ? <p className="mt-3 text-sm text-danger" role="alert">{error}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={busy || saving}>
          {saving || pendingKey === (variant?.id ?? "variant-new")
            ? messages.saving
            : variant
              ? messages.saveVariant
              : messages.addVariant}
        </Button>
        {variant && onToggle ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy || saving}
            onClick={onToggle}
          >
            {pendingKey === variant.id
              ? messages.saving
              : variant.isActive
                ? messages.removeVariant
                : messages.restoreVariant}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function ProductImagePreview({ src, alt }: { src: string; alt: string }) {
  if (!isHttpsUrl(src)) return null;
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <Image
        src={src}
        alt={alt}
        width={600}
        height={400}
        unoptimized
        className="h-48 w-full object-contain"
        loading="lazy"
      />
    </div>
  );
}

function ImageDraftEditor({
  busy,
  messages,
  initialSortOrder,
  onAdd,
}: {
  busy: boolean;
  messages: SellerProductMessages;
  initialSortOrder: number;
  onAdd: (input: SellerImageInput) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError(null);
    try {
      onAdd(readImage(form, messages));
      form.reset();
      setPreviewUrl("");
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error ? submitError.message : messages.imageValidation,
      );
    }
  }

  return (
    <form
      noValidate
      onSubmit={submit}
      className="rounded-xl border border-border p-4"
    >
      <h3 className="font-medium text-foreground">{messages.addImage}</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label={messages.imageUrlLabel} required>
            <input
              className={CONTROL_CLASS}
              name="imageUrl"
              type="url"
              placeholder="https://"
              maxLength={2048}
              required
              disabled={busy}
              onChange={(event) => setPreviewUrl(event.target.value.trim())}
            />
          </Field>
          <ProductImagePreview src={previewUrl} alt={messages.imagePreview} />
        </div>
        <Field label={messages.altTextEnLabel}>
          <input
            className={CONTROL_CLASS}
            name="altTextEn"
            maxLength={255}
            disabled={busy}
          />
        </Field>
        <Field label={messages.altTextAmLabel}>
          <input
            className={CONTROL_CLASS}
            name="altTextAm"
            maxLength={255}
            disabled={busy}
          />
        </Field>
        <Field label={messages.sortOrderLabel} required>
          <input
            className={CONTROL_CLASS}
            name="sortOrder"
            type="number"
            min="0"
            max="10000"
            step="1"
            defaultValue={initialSortOrder}
            required
            disabled={busy}
          />
        </Field>
      </div>
      {error ? <p className="mt-3 text-sm text-danger" role="alert">{error}</p> : null}
      <div className="mt-4">
        <Button type="submit" size="sm" disabled={busy}>
          {messages.addImage}
        </Button>
      </div>
    </form>
  );
}

function ImageEditor({
  image,
  busy,
  messages,
  initialSortOrder,
  onSave,
  onRemove,
}: {
  image?: SellerProductImage;
  busy: boolean;
  messages: SellerProductMessages;
  initialSortOrder?: number;
  onSave: (input: SellerImageInput) => Promise<boolean>;
  onRemove?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState(image?.imageUrl ?? "");
  const [saving, setSaving] = useState(false);
  const saveInFlight = useRef(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saveInFlight.current) return;
    const form = event.currentTarget;
    saveInFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      const saved = await onSave(readImage(form, messages));
      if (!image && saved) {
        form.reset();
        setPreviewUrl("");
      }
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error ? submitError.message : messages.saveError,
      );
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void submit(event)}
      className="rounded-xl border border-border p-4"
    >
      <h3 className="font-medium text-foreground">
        {image ? messages.editImage : messages.addImage}
      </h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label={messages.imageUrlLabel} required>
            <input
              className={CONTROL_CLASS}
              name="imageUrl"
              type="url"
              defaultValue={image?.imageUrl ?? ""}
              placeholder="https://"
              maxLength={2048}
              required
              disabled={busy || saving}
              onChange={(event) => setPreviewUrl(event.target.value.trim())}
            />
          </Field>
          <ProductImagePreview
            src={previewUrl}
            alt={
              image?.altTextEn ||
              image?.altTextAm ||
              messages.imagePreview
            }
          />
        </div>
        <Field label={messages.altTextEnLabel}>
          <input
            className={CONTROL_CLASS}
            name="altTextEn"
            defaultValue={image?.altTextEn ?? ""}
            maxLength={255}
            disabled={busy || saving}
          />
        </Field>
        <Field label={messages.altTextAmLabel}>
          <input
            className={CONTROL_CLASS}
            name="altTextAm"
            defaultValue={image?.altTextAm ?? ""}
            maxLength={255}
            disabled={busy || saving}
          />
        </Field>
        <Field label={messages.sortOrderLabel} required>
          <input
            className={CONTROL_CLASS}
            name="sortOrder"
            type="number"
            min="0"
            max="10000"
            step="1"
            defaultValue={image?.sortOrder ?? initialSortOrder ?? 0}
            required
            disabled={busy || saving}
          />
        </Field>
      </div>
      {error ? <p className="mt-3 text-sm text-danger" role="alert">{error}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={busy || saving}>
          {saving ? messages.saving : image ? messages.saveImage : messages.addImage}
        </Button>
        {image && onRemove ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy || saving}
            onClick={onRemove}
          >
            {messages.removeImage}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
