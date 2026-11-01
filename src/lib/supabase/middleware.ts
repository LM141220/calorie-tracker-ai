import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database.types";
import {
  isInvalidRefreshTokenError,
  isMissingAuthSessionError,
} from "@/lib/supabase/auth-errors";
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
  let clearInvalidSessionCookies = false;
  const nextResponse = () =>
    NextResponse.next({ request: { headers: requestHeaders } });
  const finalize = (response: NextResponse) => {
    if (clearInvalidSessionCookies) {
      for (const { name } of request.cookies.getAll()) {
        if (/^sb-.+-auth-token(?:\.\d+)?$/.test(name)) {
          response.cookies.set(name, "", { path: "/", maxAge: 0 });
        }
      }
    }

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
  let authError: unknown;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
    authError = result.error;
  } catch (error: unknown) {
    authError = error;
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

  const invalidRefreshToken = isInvalidRefreshTokenError(authError);
  if (invalidRefreshToken) {
    clearInvalidSessionCookies = true;
    console.info(
      "Invalid Supabase refresh token; treating request as signed out.",
    );
  } else if (authError && !isMissingAuthSessionError(authError)) {
    console.error(
      "Supabase session verification failed; treating request as signed out.",
      authError,
    );
  }

  const isAuthPage = ["/login", "/register", "/forgot-password"].includes(
    request.nextUrl.pathname,
  );
  const isHomePage = request.nextUrl.pathname === "/";

  if (!user && !isAuthPage && !isHomePage) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return finalize(NextResponse.redirect(loginUrl));
  }

  if (user && (isAuthPage || isHomePage)) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return finalize(NextResponse.redirect(dashboardUrl));
  }

  return finalize(response);
}
