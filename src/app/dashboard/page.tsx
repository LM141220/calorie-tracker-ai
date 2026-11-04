import type { Metadata } from "next";

import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { requireApprovedAccount } from "@/lib/auth/account-access";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  await requireApprovedAccount();
  return <DashboardClient />;
}
