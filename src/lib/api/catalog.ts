import { request } from "@/lib/api";
import type {
  Category,
  Product,
  ProductListResponse,
  ProductQuery,
} from "@/types/catalog";

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
