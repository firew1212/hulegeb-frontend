import type { Category, Product, ProductListResponse, ProductQuery } from "@/types/catalog";
import type { AuthTokens } from "@/types/auth";
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
} from "@/lib/auth-tokens";

function readApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!raw || !raw.trim()) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is required. Copy .env.example to .env.local and set NEXT_PUBLIC_API_BASE_URL (e.g. http://localhost:3000).",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error(
      `NEXT_PUBLIC_API_BASE_URL is not a valid URL: ${JSON.stringify(raw)}.`,
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      `NEXT_PUBLIC_API_BASE_URL must use http or https (received ${parsed.protocol}).`,
    );
  }

  const pathname = parsed.pathname.replace(/\/+$/, "");
  return `${parsed.origin}${pathname}`;
}

export const API_BASE_URL = readApiBaseUrl();

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
};

const DEFAULT_TIMEOUT_MS = 8000;

let refreshPromise: Promise<string> | null = null;

function isAuthEndpoint(path: string): boolean {
  return path.includes("/auth/login") || path.includes("/auth/refresh");
}

async function refreshAccessToken(): Promise<string> {
  const currentRefreshToken = getRefreshToken();
  if (!currentRefreshToken) {
    throw new ApiError("No refresh token available.", 401);
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await request<AuthTokens>("/auth/refresh", {
        method: "POST",
        body: { refreshToken: currentRefreshToken },
        auth: false,
        retryOnUnauthorized: false,
      });
      setAuthTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      return response.accessToken;
    } catch (error) {
      clearAuthTokens();
      throw error;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const normalizedPath = path.startsWith("http")
    ? path
    : `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const url = new URL(normalizedPath, API_BASE_URL);
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
  if (init) {
    new Headers(init).forEach((value, key) => {
      headers.set(key, value);
    });
  }
  return headers;
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const headers = toHeaders(options.headers);

  if (options.auth !== false && !headers.has("Authorization")) {
    const token = getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  let body: BodyInit | null | undefined = options.body as BodyInit | null | undefined;
  if (
    body !== undefined &&
    body !== null &&
    typeof body === "object" &&
    !(body instanceof FormData) &&
    !(body instanceof Blob) &&
    !(body instanceof URLSearchParams) &&
    !(body instanceof ArrayBuffer) &&
    !(body instanceof ReadableStream)
  ) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    body = JSON.stringify(body);
  }

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
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body: body as BodyInit | null | undefined,
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeout);
    if (externalAbortListener && options.signal) {
      options.signal.removeEventListener("abort", externalAbortListener);
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      if (options.signal?.aborted) {
        throw error;
      }
      throw new ApiError("Request timed out.", 408);
    }
    throw new ApiError(
      error instanceof Error ? error.message : "Network request failed.",
      0,
    );
  }

  clearTimeout(timeout);
  if (externalAbortListener && options.signal) {
    options.signal.removeEventListener("abort", externalAbortListener);
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;
    let details: unknown;
    try {
      const text = await response.text();
      if (text) {
        try {
          const parsedBody = JSON.parse(text) as { message?: unknown; error?: unknown };
          details = parsedBody;
          const candidate = parsedBody?.message;
          if (typeof candidate === "string" && candidate.trim()) {
            message = candidate;
          } else if (Array.isArray(candidate)) {
            const joined = candidate
              .filter((item): item is string => typeof item === "string")
              .join(", ");
            if (joined) message = joined;
          } else if (typeof parsedBody?.error === "string" && parsedBody.error.trim()) {
            message = parsedBody.error;
          } else {
            message = text;
          }
        } catch {
          message = text;
        }
      }
    } catch {
      // ignore body parsing errors
    }

    const error = new ApiError(message, response.status, details);

    if (
      response.status === 401 &&
      options.auth !== false &&
      options.retryOnUnauthorized !== false &&
      !isAuthEndpoint(path)
    ) {
      try {
        const newToken = await refreshAccessToken();
        const retryHeaders = toHeaders(options.headers);
        retryHeaders.set("Authorization", `Bearer ${newToken}`);
        return await request<T>(path, {
          ...options,
          headers: retryHeaders,
          retryOnUnauthorized: false,
        });
      } catch {
        throw error;
      }
    }

    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  if (!contentType.includes("application/json")) {
    return text as unknown as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export function listCategories(options?: { signal?: AbortSignal }): Promise<Category[]> {
  return request<Category[]>("/catalog/categories", { signal: options?.signal });
}

export function listProducts(
  query: ProductQuery = {},
  options?: { signal?: AbortSignal },
): Promise<ProductListResponse> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.q) params.set("q", query.q);
  if (query.categoryId) params.set("categoryId", query.categoryId);
  if (query.subcategoryId) params.set("subcategoryId", query.subcategoryId);
  if (query.minPrice !== undefined) params.set("minPrice", String(query.minPrice));
  if (query.maxPrice !== undefined) params.set("maxPrice", String(query.maxPrice));
  if (query.condition) params.set("condition", query.condition);
  if (query.sort) params.set("sort", query.sort);

  const suffix = params.toString() ? `?${params.toString()}` : "";
  return request<ProductListResponse>(`/catalog/products${suffix}`, {
    signal: options?.signal,
  });
}

export function getProduct(
  productId: string,
  options?: { signal?: AbortSignal },
): Promise<Product> {
  return request<Product>(`/catalog/products/${encodeURIComponent(productId)}`, {
    signal: options?.signal,
  });
}

export { setAuthTokens, clearAuthTokens, getAccessToken, getRefreshToken } from "@/lib/auth-tokens";
