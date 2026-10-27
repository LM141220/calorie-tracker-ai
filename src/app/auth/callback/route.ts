import { NextResponse, type NextRequest } from "next/server";

import { getSafeRedirectPath } from "@/lib/auth/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  return NextResponse.redirect(new URL(nextPath, request.url));
}
