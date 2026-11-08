import { request } from "@/lib/api";
import type {
  PendingSellerApplication,
  SellerApplication,
  SellerApplicationDecision,
  SellerApplicationInput,
} from "@/types/sellers";

export function createSellerApplication(
  input: SellerApplicationInput,
): Promise<SellerApplication> {
  return request<SellerApplication>("/sellers/applications", {
    method: "POST",
    body: input,
    auth: true,
  });
}

export function listPendingSellerApplications(): Promise<
  PendingSellerApplication[]
> {
  return request<PendingSellerApplication[]>("/sellers/applications/pending", {
    auth: true,
  });
}

export function approveSellerApplication(
  applicationId: string,
): Promise<SellerApplicationDecision> {
  return request<SellerApplicationDecision>(
    `/sellers/applications/${applicationId}/approve`,
    {
      method: "POST",
      auth: true,
    },
  );
}

export function rejectSellerApplication(
  applicationId: string,
): Promise<SellerApplicationDecision> {
  return request<SellerApplicationDecision>(
    `/sellers/applications/${applicationId}/reject`,
    {
      method: "POST",
      auth: true,
    },
  );
}
