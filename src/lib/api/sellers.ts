import { request } from "@/lib/api";
import type { SellerApplication, SellerApplicationInput } from "@/types/sellers";

export function createSellerApplication(
  input: SellerApplicationInput,
): Promise<SellerApplication> {
  return request<SellerApplication>("/sellers/applications", {
    method: "POST",
    body: input,
    auth: true,
  });
}
