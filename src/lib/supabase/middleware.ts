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

  const pathname = request.nextUrl.pathname;
  const isApiRequest = pathname.startsWith("/api/");
  const isAuthPage = ["/login", "/register", "/forgot-password"].includes(
    pathname,
  );
  const isHomePage = pathname === "/";
  const isCallback = pathname === "/auth/callback";
  const isPasswordUpdate = pathname === "/auth/update-password";
  const isOfflinePage = pathname === "/offline";
  const isAccountStatusPage = pathname === "/account-status";
  const isPublicPage =
    isAuthPage || isHomePage || isCallback || isPasswordUpdate || isOfflinePage;

  if (!user && isCallback) {
    return finalize(response);
  }

  if (!user && !isPublicPage) {
    if (isApiRequest) {
      return finalize(
        NextResponse.json(
          { error: "Authentification requise." },
          { status: 401 },
        ),
      );
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return finalize(NextResponse.redirect(loginUrl));
  }

  if (!user) {
    return finalize(response);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("approval_status, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    console.error("Middleware account approval lookup failed.", profileError);
    if (isApiRequest) {
      return finalize(
        NextResponse.json(
          { error: "Impossible de vérifier l’accès au compte." },
          { status: 503 },
        ),
      );
    }
    if (isCallback || isAccountStatusPage || isPasswordUpdate) {
      return finalize(response);
    }
    return finalize(
      NextResponse.redirect(new URL("/account-status", request.url)),
    );
  }

  if (profile.approval_status !== "approved") {
    if (isApiRequest) {
      return finalize(
        NextResponse.json(
          { error: "Votre compte doit être approuvé pour utiliser Lumo." },
          { status: 403 },
        ),
      );
    }
    if (
      isCallback ||
      isAccountStatusPage ||
      isPasswordUpdate ||
      isOfflinePage
    ) {
      return finalize(response);
    }
    return finalize(
      NextResponse.redirect(new URL("/account-status", request.url)),
    );
  }

  if (isAccountStatusPage) {
    return finalize(NextResponse.redirect(new URL("/dashboard", request.url)));
  }

  if (pathname.startsWith("/admin") && !profile.is_admin) {
    return finalize(NextResponse.redirect(new URL("/dashboard", request.url)));
  }

  if (isAuthPage || isHomePage) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return finalize(NextResponse.redirect(dashboardUrl));
  }

  return finalize(response);
}
