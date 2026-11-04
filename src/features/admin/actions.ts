"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentAccountAccess } from "@/lib/auth/account-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const reviewSchema = z.object({
  profileId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  comment: z.string().trim().max(1000).optional(),
});

export type ReviewAccountResult = {
  success: boolean;
  message: string;
};

export async function reviewAccountRequestAction(
  input: unknown,
): Promise<ReviewAccountResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Demande invalide.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const access = await getCurrentAccountAccess(supabase);
  if (!access.user || access.approvalStatus !== "approved" || !access.isAdmin) {
    return { success: false, message: "Accès administrateur requis." };
  }

  const { error } = await supabase.rpc("review_account_request", {
    p_profile_id: parsed.data.profileId,
    p_decision: parsed.data.decision,
    p_comment: parsed.data.comment || null,
  });

  if (error) {
    console.error("Account approval review failed.", error);
    return {
      success: false,
      message:
        "Cette demande n’a pas pu être traitée. Actualisez la page puis réessayez.",
    };
  }

  revalidatePath("/admin/approvals");
  revalidatePath("/account-status");
  return {
    success: true,
    message:
      parsed.data.decision === "approved"
        ? "Compte approuvé."
        : "Demande refusée.",
  };
}
