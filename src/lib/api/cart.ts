import { request } from "@/lib/api";
import type { Cart } from "@/types/cart";
import type { BuyerOrder } from "@/types/orders";

export type AddCartItemDto = {
  variantId: string;
  quantity: number;
};

export type UpdateCartItemDto = {
  quantity: number;
};

export function getCart(
  options?: { signal?: AbortSignal },
): Promise<Cart> {
  return request<Cart>("/cart", {
    auth: true,
    signal: options?.signal,
  });
}

export function checkoutCart(idempotencyKey: string): Promise<BuyerOrder> {
  return request<BuyerOrder>("/cart/checkout", {
    method: "POST",
    auth: true,
    headers: { "Idempotency-Key": idempotencyKey },
  });
}

export function addCartItem(
  variantId: string,
  quantity: number,
  options?: { signal?: AbortSignal },
): Promise<Cart> {
  return request<Cart>("/cart/items", {
    method: "POST",
    auth: true,
    body: { variantId, quantity },
    signal: options?.signal,
  });
}

export function updateCartItem(
  variantId: string,
  quantity: number,
  options?: { signal?: AbortSignal },
): Promise<Cart> {
  return request<Cart>(`/cart/items/${encodeURIComponent(variantId)}`, {
    method: "PATCH",
    auth: true,
    body: { quantity },
    signal: options?.signal,
  });
}

export function removeCartItem(
  variantId: string,
  options?: { signal?: AbortSignal },
): Promise<Cart> {
  return request<Cart>(`/cart/items/${encodeURIComponent(variantId)}`, {
    method: "DELETE",
    auth: true,
    signal: options?.signal,
  });
}