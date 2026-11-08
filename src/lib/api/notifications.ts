import { request } from "@/lib/api";
import type { BuyerNotification } from "@/types/notifications";

export function listBuyerNotifications(
  page = 1,
  limit = 20,
  options?: { signal?: AbortSignal },
): Promise<BuyerNotification[]> {
  return request<BuyerNotification[]>("/notifications", {
    auth: true,
    query: { page, limit },
    signal: options?.signal,
  });
}

export function markBuyerNotificationAsRead(
  notificationId: string,
  options?: { signal?: AbortSignal },
): Promise<void> {
  return request<void>(
    `/notifications/${encodeURIComponent(notificationId)}/read`,
    {
      method: "PATCH",
      auth: true,
      signal: options?.signal,
    },
  );
}
