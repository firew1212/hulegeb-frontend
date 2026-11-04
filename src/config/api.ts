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
    throw new Error("NEXT_PUBLIC_API_BASE_URL must be a valid absolute URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_API_BASE_URL must use http or https.");
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL must not contain credentials, a query, or a fragment.",
    );
  }

  return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
}

export const API_BASE_URL = readApiBaseUrl();
