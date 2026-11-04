import { NextResponse, type NextRequest } from "next/server";

import { getSafeRedirectPath } from "@/lib/auth/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentAccountAccess } from "@/lib/auth/account-access";
import { notifyAdminOfSignup } from "@/services/notifications/signup-notification";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = getSafeRedirectPath(
    request.nextUrl.searchParams.get("next"),
  );

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=auth_callback", request.url),
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL("/login?error=auth_callback", request.url),
    );
  }

  const access = await getCurrentAccountAccess(supabase);
  if (access.user && access.approvalStatus === "pending") {
    await notifyAdminOfSignup({
      email: access.user.email ?? "",
      userId: access.user.id,
      requestedAt: access.user.created_at,
    });
    return NextResponse.redirect(new URL("/account-status", request.url));
  }

  if (!access.user || access.approvalStatus !== "approved") {
    return NextResponse.redirect(new URL("/account-status", request.url));
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}
