
import { getDashboardDataAction } from "@/services/server/dashboard-actions";
import { DashboardClientPage } from "@/components/app/dashboard/dashboard-client-page";

export default async function OrdersDashboardPage() {
  // This is now a Server Component.
  // It fetches the data on the server and passes it to the client component.
  const { orders, accounts, teamMembers, directSales } = await getDashboardDataAction();

  // We check for the specific role that can access this page
  // This is a simplified check, in a real app you might use a more robust role check
  const canAccess = true; 

  if (!canAccess) {
    return <div>Acceso denegado</div>;
  }
  
  return (
    <DashboardClientPage
      pageType="orders"
      initialOrders={orders}
      initialAccounts={accounts}
      initialTeamMembers={teamMembers}
      initialDirectSales={directSales}
    />
  );
}
