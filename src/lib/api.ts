import type { AuthTokens } from "@/types/auth";
import { API_BASE_URL } from "@/config/api";
import {
  clearAuthTokens,
  getAccessToken,
  setAuthTokens,
} from "@/lib/auth-tokens";

export { API_BASE_URL } from "@/config/api";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export type RequestOptions = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  headers?: HeadersInit;
  signal?: AbortSignal;
  timeoutMs?: number;
  auth?: boolean;
  retryOnUnauthorized?: boolean;
  credentials?: RequestCredentials;
};

const DEFAULT_TIMEOUT_MS = 8000;

let refreshPromise: Promise<string> | null = null;
const REFRESH_LOCK_NAME = "hulegeb-auth-refresh";

function isAuthEndpoint(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "");
  return path.endsWith("/auth/login") || path.endsWith("/auth/refresh");
}

export async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const refresh = async () => {
    try {
      const response = await request<AuthTokens>("/auth/refresh", {
        method: "POST",
        auth: false,
        retryOnUnauthorized: false,
      });
      setAuthTokens({ accessToken: response.accessToken });
      return response.accessToken;
    } catch (error) {
      if (isApiError(error) && error.status === 401) clearAuthTokens();
      throw error;
    }
  };

  const refreshAcrossTabs: Promise<string> =
    typeof navigator !== "undefined" && navigator.locks
      ? navigator.locks
          .request<Promise<string>>(REFRESH_LOCK_NAME, refresh)
          .then((result) => result)
      : refresh();

  const pendingRefresh = refreshAcrossTabs.finally(() => {
    refreshPromise = null;
  });
  refreshPromise = pendingRefresh;

  return pendingRefresh;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  if (
    !path ||
    path.startsWith("//") ||
    path.startsWith("\\") ||
    path.includes("\\") ||
    /^[a-z][a-z\d+.-]*:/i.test(path) ||
    path.includes("?") ||
    path.includes("#")
  ) {
    throw new ApiError(
      "API paths must be relative to the configured API base URL.",
      0,
    );
  }

  const baseUrl = new URL(API_BASE_URL);
  const basePath = baseUrl.pathname.replace(/\/+$/, "");
  const relativePath = path.replace(/^\/+/, "");
  const url = new URL(`${basePath}/${relativePath}`, baseUrl.origin);
  const allowedPathPrefix = basePath ? `${basePath}/` : "/";
  if (
    url.origin !== baseUrl.origin ||
    !url.pathname.startsWith(allowedPathPrefix)
  ) {
    throw new ApiError(
      "API paths must stay within the configured API base URL.",
      0,
    );
  }

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function toHeaders(init?: HeadersInit): Headers {
  const headers = new Headers();
  headers.set("Accept", "application/json");
  if (init) {
    new Headers(init).forEach((value, key) => {
      headers.set(key, value);
    });
  }
  return headers;
}

function isBodyInit(value: unknown): value is BodyInit {
  return (
    typeof value === "string" ||
    (typeof Blob !== "undefined" && value instanceof Blob) ||
    (typeof FormData !== "undefined" && value instanceof FormData) ||
    (typeof URLSearchParams !== "undefined" &&
      value instanceof URLSearchParams) ||
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value) ||
    (typeof ReadableStream !== "undefined" &&
      value instanceof ReadableStream)
  );
}

function createHttpError(response: Response, text: string): ApiError {
  const fallback = `Request failed with status ${response.status}.`;
  if (!text) return new ApiError(fallback, response.status);

  try {
    const details: unknown = JSON.parse(text);
    return new ApiError(fallback, response.status, details);
  } catch {
    return new ApiError(fallback, response.status);
  }
}

function isJsonContentType(contentType: string): boolean {
  return /^(?:application\/json|[\w.-]+\/[\w.+-]+\+json)(?:\s*;|$)/i.test(
    contentType.trim(),
  );
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new ApiError("Request timeout must be a positive number.", 0);
  }

  const url = buildUrl(path, options.query);

  const headers = toHeaders(options.headers);

  if (options.auth !== false && !headers.has("Authorization")) {
    const token = getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  let body = options.body;
  if (body !== undefined && body !== null && !isBodyInit(body)) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    body = JSON.stringify(body);
  }

  const requestBody = body as BodyInit | null | undefined;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let externalAbortListener: (() => void) | null = null;
  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort(options.signal.reason);
    } else {
      externalAbortListener = () => controller.abort(options.signal?.reason);
      options.signal.addEventListener("abort", externalAbortListener, {
        once: true,
      });
    }
  }

  let response: Response;
  let responseText: string;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: requestBody,
      signal: controller.signal,
      credentials: options.credentials ?? "include",
    });
    responseText = response.status === 204 ? "" : await response.text();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      if (options.signal?.aborted) {
        throw error;
      }
      throw new ApiError("Request timed out.", 408);
    }
    throw new ApiError(
      error instanceof Error ? error.message : "Network request failed.",
      0,
    );
  } finally {
    clearTimeout(timeout);
    if (externalAbortListener && options.signal) {
      options.signal.removeEventListener("abort", externalAbortListener);
    }
  }

  if (!response.ok) {
    const error = createHttpError(response, responseText);

    if (
      response.status === 401 &&
      options.auth !== false &&
      options.retryOnUnauthorized !== false &&
      !isAuthEndpoint(new URL(url).pathname)
    ) {
      const newToken = await refreshAccessToken();
      const retryHeaders = toHeaders(options.headers);
      retryHeaders.set("Authorization", `Bearer ${newToken}`);
      return request<T>(path, {
        ...options,
        headers: retryHeaders,
        retryOnUnauthorized: false,
      });
    }

    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!isJsonContentType(contentType)) {
    throw new ApiError(
      "The API returned an unexpected content type.",
      502,
      { responseStatus: response.status, contentType },
    );
  }
  if (!responseText.trim()) {
    throw new ApiError("The API returned an empty JSON response.", 502, {
      responseStatus: response.status,
    });
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    throw new ApiError("The API returned malformed JSON.", 502, {
      responseStatus: response.status,
    });
  }
}

export { setAuthTokens, clearAuthTokens, getAccessToken } from "@/lib/auth-tokens";
