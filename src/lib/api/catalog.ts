import { request } from "@/lib/api";
import type {
  Category,
  CreateCategoryInput,
  AdminProduct,
  PendingAdminProduct,
  Product,
  ProductListResponse,
  ProductQuery,
  UpdateCategoryInput,
} from "@/types/catalog";

export function listPendingAdminProducts(options?: {
  signal?: AbortSignal;
}): Promise<PendingAdminProduct[]> {
  return request<PendingAdminProduct[]>("/catalog/admin/products/pending", {
    auth: true,
    signal: options?.signal,
  });
}

export function approveAdminProduct(
  productId: string,
): Promise<AdminProduct> {
  return request<AdminProduct>(
    `/catalog/admin/products/${encodeURIComponent(productId)}/approve`,
    { method: "POST", auth: true },
  );
}

export function rejectAdminProduct(
  productId: string,
): Promise<AdminProduct> {
  return request<AdminProduct>(
    `/catalog/admin/products/${encodeURIComponent(productId)}/reject`,
    { method: "POST", auth: true },
  );
}

export function listAdminCategories(): Promise<Category[]> {
  return request<Category[]>("/catalog/admin/categories", { auth: true });
}

export function createCategory(input: CreateCategoryInput): Promise<Category> {
  return request<Category>("/catalog/admin/categories", {
    method: "POST",
    body: input,
    auth: true,
  });
}

export function updateCategory(
  categoryId: string,
  input: UpdateCategoryInput,
): Promise<Category> {
  return request<Category>(
    `/catalog/admin/categories/${encodeURIComponent(categoryId)}`,
    {
      method: "PATCH",
      body: input,
      auth: true,
    },
  );
}

export function deactivateCategory(categoryId: string): Promise<Category> {
  return request<Category>(
    `/catalog/admin/categories/${encodeURIComponent(categoryId)}/deactivate`,
    {
      method: "PATCH",
      auth: true,
    },
  );
}

export function listCategories(options?: { signal?: AbortSignal }): Promise<Category[]> {
  return request<Category[]>("/catalog/categories", {
    auth: false,
    credentials: "omit",
    signal: options?.signal,
  });
}

export function listProducts(
  query: ProductQuery = {},
  options?: { signal?: AbortSignal },
): Promise<ProductListResponse> {
  return request<ProductListResponse>("/catalog/products", {
    auth: false,
    credentials: "omit",
    query,
    signal: options?.signal,
  });
}

export function getProduct(
  productId: string,
  options?: { signal?: AbortSignal },
): Promise<Product> {
  return request<Product>(`/catalog/products/${encodeURIComponent(productId)}`, {
    auth: false,
    credentials: "omit",
    signal: options?.signal,
  });
}
