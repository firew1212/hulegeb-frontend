import { isApiError } from "@/lib/api";
import type { Dictionary } from "@/i18n/dictionaries";

type ApiErrorMessages = Dictionary["apiErrors"];

export function getLocalizedApiErrorMessage(
  error: unknown,
  messages: ApiErrorMessages,
  fallback = messages.unexpected,
): string {
  if (!isApiError(error)) return fallback;

  if (error.status === 0) return messages.network;
  if (error.status === 400 || error.status === 422) return messages.badRequest;
  if (error.status === 401) return messages.unauthorized;
  if (error.status === 403) return messages.forbidden;
  if (error.status === 404) return messages.notFound;
  if (error.status === 408) return messages.timeout;
  if (error.status === 409) return messages.conflict;
  if (error.status === 429) return messages.rateLimited;
  if (error.status >= 500) return messages.server;
  return fallback;
}
