import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { ServerPagePerformance } from "@/lib/performance/server";
import type { Database } from "@/types/database.types";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export async function createSupabaseServerClient(
  performanceTrace?: ServerPagePerformance,
) {
  const cookieStore = await cookies();

  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    global: performanceTrace ? { fetch: performanceTrace.fetch } : undefined,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot mutate cookies; middleware refreshes them.
        }
      },
    },
  });
}
