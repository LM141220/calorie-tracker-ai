import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database.types";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export async function updateSupabaseSession(request: NextRequest) {
  const performanceEnabled =
    process.env.NODE_ENV !== "production" || process.env.PERF_LOGS === "true";
  const requestId = crypto.randomUUID();
  const middlewareStartedAt = performance.now();
  const middlewareStartedEpoch = Date.now();
  const requestHeaders = new Headers(request.headers);
  if (performanceEnabled) {
    requestHeaders.set("x-lumo-request-id", requestId);
  }
  let authDurationMs = 0;
  const nextResponse = () =>
    NextResponse.next({ request: { headers: requestHeaders } });
  const finalize = (response: NextResponse) => {
    const durationMs = performance.now() - middlewareStartedAt;
    if (performanceEnabled) {
      response.headers.set("x-lumo-request-id", requestId);
      response.headers.set(
        "server-timing",
        `middleware;dur=${durationMs.toFixed(1)}, auth;dur=${authDurationMs.toFixed(1)}`,
      );
      console.info(
        [
          `[PERF SERVER] middleware request=${requestId} path=${request.nextUrl.pathname}`,
          `start=${new Date(middlewareStartedEpoch).toISOString()}`,
          `end=${new Date().toISOString()}`,
          `duration=${durationMs.toFixed(1)}ms`,
        ].join("\n"),
      );
    }
    return response;
  };
  let response = nextResponse();

  const supabase = createServerClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          requestHeaders.set("cookie", request.cookies.toString());
          response = nextResponse();
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const authStartedAt = performance.now();
  const authStartedEpoch = Date.now();
  let user: User | null | undefined;
  try {
    ({
      data: { user },
    } = await supabase.auth.getUser());
  } catch (error: unknown) {
    if (performanceEnabled) {
      const durationMs = performance.now() - middlewareStartedAt;
      console.error(
        [
          `[PERF SERVER] middleware failed request=${requestId} path=${request.nextUrl.pathname}`,
          `start=${new Date(middlewareStartedEpoch).toISOString()}`,
          `end=${new Date().toISOString()}`,
          `duration=${durationMs.toFixed(1)}ms`,
          `error=${error instanceof Error ? error.message : "unknown error"}`,
        ].join("\n"),
      );
    }
    throw error;
  } finally {
    authDurationMs = performance.now() - authStartedAt;
    if (performanceEnabled) {
      console.info(
        [
          `[PERF SERVER] middleware.auth.getUser request=${requestId}`,
          `start=${new Date(authStartedEpoch).toISOString()}`,
          `end=${new Date().toISOString()}`,
          `duration=${authDurationMs.toFixed(1)}ms`,
        ].join("\n"),
      );
    }
  }
  const isAuthPage = ["/login", "/register", "/forgot-password"].includes(
    request.nextUrl.pathname,
  );

  if (!user && !isAuthPage) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return finalize(NextResponse.redirect(loginUrl));
  }

  if (user && isAuthPage) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return finalize(NextResponse.redirect(dashboardUrl));
  }

  return finalize(response);
}
