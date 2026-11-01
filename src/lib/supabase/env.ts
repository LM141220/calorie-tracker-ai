const LOCAL_APP_URL = "http://localhost:3000";

function parseAppUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("NEXT_PUBLIC_APP_URL must be an absolute URL.");
  }

  if (
    process.env.NODE_ENV === "production" &&
    (url.protocol !== "https:" ||
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "[::1]")
  ) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL must be a public HTTPS URL in production.",
    );
  }

  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("NEXT_PUBLIC_APP_URL must be an origin without a path.");
  }

  return url;
}

export function getSupabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!value) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
  }

  return value;
}

export function getSupabaseAnonKey(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!value) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured.");
  }

  return value;
}

export function getAppUrl(): string {
  const value =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.NODE_ENV === "production" ? undefined : LOCAL_APP_URL);

  if (!value) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL must be configured for production authentication redirects.",
    );
  }

  return parseAppUrl(value).origin;
}

export function getMetadataBaseUrl(): URL {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : LOCAL_APP_URL);

  return parseAppUrl(appUrl);
}
