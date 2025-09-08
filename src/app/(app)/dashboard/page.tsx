
import { getDashboardDataAction } from "@/services/server/dashboard-actions";
import { DashboardClientPage } from "@/components/app/dashboard/dashboard-client-page";

export default async function DashboardPage() {
  const { orders, accounts, teamMembers, directSales } = await getDashboardDataAction();

  return (
    <DashboardClientPage
      initialOrders={orders}
      initialAccounts={accounts}
      initialTeamMembers={teamMembers}
      initialDirectSales={directSales}
    />
  );
}
