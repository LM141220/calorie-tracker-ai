"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database.types";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey());
}
