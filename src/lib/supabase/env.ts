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
  const value = process.env.NEXT_PUBLIC_APP_URL;

  if (!value) {
    throw new Error("NEXT_PUBLIC_APP_URL is not configured.");
  }

  return value.replace(/\/$/, "");
}
