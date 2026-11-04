import { request } from "@/lib/api";
import type { BuyerOrder, OrderContact } from "@/types/orders";

export function listBuyerOrders(
  page = 1,
  limit = 5,
  options?: { signal?: AbortSignal },
): Promise<BuyerOrder[]> {
  return request<BuyerOrder[]>("/orders", {
    auth: true,
    query: { page, limit },
    signal: options?.signal,
  });
}

export function getBuyerOrder(
  orderId: string,
  options?: { signal?: AbortSignal },
): Promise<BuyerOrder> {
  return request<BuyerOrder>(`/orders/${encodeURIComponent(orderId)}`, {
    auth: true,
    signal: options?.signal,
  });
}

export function selectPaymentOption(
  orderId: string,
  paymentOption: "DEPOSIT" | "FULL",
  options?: { signal?: AbortSignal },
): Promise<BuyerOrder> {
  return request<BuyerOrder>(`/orders/${encodeURIComponent(orderId)}/payment`, {
    method: "PATCH",
    auth: true,
    body: { paymentOption },
    signal: options?.signal,
  });
}

export function getOfficialContact(
  orderId: string,
  options?: { signal?: AbortSignal },
): Promise<OrderContact> {
  return request<OrderContact>("/orders/contact", {
    auth: true,
    query: { orderId },
    signal: options?.signal,
  });
}
