import "server-only";

import { notFound, redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import type { AccountApprovalStatus } from "@/types/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

export type CurrentAccountAccess = {
  user: User | null;
  approvalStatus: AccountApprovalStatus | null;
  isAdmin: boolean;
};

export async function getCurrentAccountAccess(
  supabase?: SupabaseServerClient,
): Promise<CurrentAccountAccess> {
  const client = supabase ?? (await createSupabaseServerClient());
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError || !user) {
    if (authError) {
      console.error("Current account authentication check failed.", authError);
    }
    return { user: null, approvalStatus: null, isAdmin: false };
  }

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("approval_status, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Current account approval check failed.", profileError);
    return { user, approvalStatus: null, isAdmin: false };
  }

  return {
    user,
    approvalStatus: profile?.approval_status ?? null,
    isAdmin: profile?.is_admin ?? false,
  };
}

export async function getApprovedUser(
  supabase: SupabaseServerClient,
): Promise<User | null> {
  const access = await getCurrentAccountAccess(supabase);
  return access.approvalStatus === "approved" ? access.user : null;
}

export async function requireApprovedAccount(supabase?: SupabaseServerClient) {
  const access = await getCurrentAccountAccess(supabase);
  if (!access.user) {
    redirect("/login");
  }
  if (access.approvalStatus !== "approved") {
    redirect("/account-status");
  }

  return { user: access.user, isAdmin: access.isAdmin };
}

export async function requireAdminAccount(supabase?: SupabaseServerClient) {
  const access = await requireApprovedAccount(supabase);
  if (!access.isAdmin) {
    notFound();
  }
  return access;
}
