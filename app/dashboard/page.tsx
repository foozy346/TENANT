import { redirect } from "next/navigation";

import DashboardClient from "@/components/dashboard/DashboardClient";
import { getDashboardData } from "@/services/dashboard";
import { getCurrentUser } from "@/services/user";

export const dynamic = "force-dynamic";

const DashboardPage = async () => {
  const user = await getCurrentUser();
  if (!user) redirect("/?auth=login");

  const data = await getDashboardData();
  return <DashboardClient data={data} />;
};

export default DashboardPage;