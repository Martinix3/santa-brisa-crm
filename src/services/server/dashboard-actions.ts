
'use server';

import { getOrdersFS } from '@/services/order-service';
import { getDirectSalesFS } from '@/services/venta-directa-sb-service';
import { getAccountsFS } from '@/services/account-service';
import { getTeamMembersFS } from '@/services/team-member-service';
import type { Account, Order, TeamMember, DirectSale } from '@/types';
import { EstadoPedido as OrderStatus } from "@ssot";

export async function getDashboardDataAction(): Promise<{
  orders: Order[];
  accounts: Account[];
  teamMembers: TeamMember[];
  directSales: DirectSale[];
}> {
  try {
    const [orders, accounts, teamMembers, directSales] = await Promise.all([
      getOrdersFS(),
      getAccountsFS(),
      getTeamMembersFS(),
      getDirectSalesFS(),
    ]);
    // The data fetched with the admin SDK is serializable by default.
    return { 
        orders: JSON.parse(JSON.stringify(orders)), 
        accounts: JSON.parse(JSON.stringify(accounts)), 
        teamMembers: JSON.parse(JSON.stringify(teamMembers)), 
        directSales: JSON.parse(JSON.stringify(directSales))
    };
  } catch (error) {
    console.error("Error in getDashboardDataAction:", error);
    // Re-throwing the error to let the client-side error boundary catch it.
    throw new Error("Failed to fetch dashboard data. Please check server logs.");
  }
}


export async function updateDistributorOrderStatusAction(
  orderId: string, 
  data: Partial<Pick<Order, 'status' | 'notes' | 'invoiceUrl' | 'invoiceFileName'>>
): Promise<void> {
   try {
    // Basic validation to ensure only allowed fields are updated
    const allowedUpdates: (keyof typeof data)[] = ['status', 'notes', 'invoiceUrl', 'invoiceFileName'];
    const updateData: Partial<Order> = {};

    for (const key of allowedUpdates) {
      if (data[key] !== undefined) {
        (updateData as any)[key] = data[key];
      }
    }
    
    if (Object.keys(updateData).length > 0) {
      await updateFullOrderFS(orderId, updateData);
    }
  } catch (error) {
    console.error(`Error updating order ${orderId} in server action:`, error);
    throw new Error("Failed to update order status.");
  }
}
