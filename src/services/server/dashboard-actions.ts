'use server';

import { getOrdersFS, updateFullOrderFS } from '@/services/order-service';
import { getDirectSalesFS } from '@/services/venta-directa-sb-service';
import { getAccountsFS } from '@/services/account-service';
import { getTeamMembersFS } from '@/services/team-member-service';
import type { Account, Order, TeamMember, DirectSale, OrderStatus } from '@/types';

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
    return { orders, accounts, teamMembers, directSales };
  } catch (error) {
    console.error("Error in getDashboardDataAction:", error);
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
