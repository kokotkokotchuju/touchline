import type { Metadata } from "next";
import { getAdminState } from "@/server/admin";
import { getServerEnv } from "@/server/env";
import { checkInfrastructure } from "@/server/infrastructure/check";
import { getFootballSnapshot } from "@/server/football/service";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const [snapshot, state, infrastructure] = await Promise.all([
    getFootballSnapshot(),
    getAdminState(),
    checkInfrastructure(getServerEnv()),
  ]);
  return (
    <AdminDashboard
      snapshot={snapshot}
      state={state}
      infrastructure={infrastructure}
    />
  );
}
