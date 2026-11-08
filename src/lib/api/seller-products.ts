import { request } from "@/lib/api";
import type { Category } from "@/types/catalog";
import type {
  SellerProduct,
  SellerProductImage,
  SellerProductVariant,
} from "@/types/catalog";

export type SellerProductInput = {
  categoryId: string;
  slug: string;
  titleEn: string;
  titleAm: string;
  descriptionEn?: string;
  descriptionAm?: string;
  condition: "NEW" | "USED" | "REFURBISHED";
};

export type SellerVariantInput = {
  sku: string;
  name: string;
  price: number;
  stockQuantity: number;
  attributes?: Record<string, unknown>;
};

export type SellerImageInput = {
  imageUrl: string;
  altTextEn?: string;
  altTextAm?: string;
  sortOrder?: number;
};

function productPath(productId: string) {
  return `/catalog/seller/products/${encodeURIComponent(productId)}`;
}

export function listSellerProducts(): Promise<SellerProduct[]> {
  return request<SellerProduct[]>("/catalog/seller/products", { auth: true });
}

export function getSellerProduct(productId: string): Promise<SellerProduct> {
  return request<SellerProduct>(productPath(productId), { auth: true });
}

export function createSellerProduct(
  input: SellerProductInput,
): Promise<SellerProduct> {
  return request<SellerProduct>("/catalog/seller/products", {
    method: "POST",
    body: input,
    auth: true,
  });
}

export function updateSellerProduct(
  productId: string,
  input: SellerProductInput,
): Promise<SellerProduct> {
  return request<SellerProduct>(productPath(productId), {
    method: "PATCH",
    body: input,
    auth: true,
  });
}

export function unpublishSellerProduct(
  productId: string,
): Promise<SellerProduct> {
  return request<SellerProduct>(productPath(productId), {
    method: "DELETE",
    auth: true,
  });
}

export function createSellerVariant(
  productId: string,
  input: SellerVariantInput,
): Promise<SellerProductVariant> {
  return request<SellerProductVariant>(`${productPath(productId)}/variants`, {
    method: "POST",
    body: input,
    auth: true,
  });
}

export function updateSellerVariant(
  productId: string,
  variantId: string,
  input: Partial<Omit<SellerVariantInput, "sku">> & { isActive?: boolean },
): Promise<SellerProductVariant> {
  return request<SellerProductVariant>(
    `${productPath(productId)}/variants/${encodeURIComponent(variantId)}`,
    { method: "PATCH", body: input, auth: true },
  );
}

export function deactivateSellerVariant(
  productId: string,
  variantId: string,
): Promise<SellerProductVariant> {
  return request<SellerProductVariant>(
    `${productPath(productId)}/variants/${encodeURIComponent(variantId)}`,
    { method: "DELETE", auth: true },
  );
}

export function createSellerImage(
  productId: string,
  input: SellerImageInput,
): Promise<SellerProductImage> {
  return request<SellerProductImage>(`${productPath(productId)}/images`, {
    method: "POST",
    body: input,
    auth: true,
  });
}

export function updateSellerImage(
  productId: string,
  imageId: string,
  input: SellerImageInput,
): Promise<SellerProductImage> {
  return request<SellerProductImage>(
    `${productPath(productId)}/images/${encodeURIComponent(imageId)}`,
    { method: "PATCH", body: input, auth: true },
  );
}

export function removeSellerImage(
  productId: string,
  imageId: string,
): Promise<{ deleted: true }> {
  return request<{ deleted: true }>(
    `${productPath(productId)}/images/${encodeURIComponent(imageId)}`,
    { method: "DELETE", auth: true },
  );
}

export function listSellerCategories(): Promise<Category[]> {
  return request<Category[]>("/catalog/categories", {
    auth: false,
    credentials: "omit",
  });
}
