
'use server';

import { getOrdersFS } from '@/services/order-service';
import { getEventsFS } from '@/services/event-service';
import type { Order, CrmEvent, UserRole, CrmEventStatus } from '@/types';
import { parseISO, isValid, startOfDay, endOfDay, addDays, isWithinInterval } from 'date-fns';

interface GetDailyTasksParams {
  userId: string;
  userName: string;
  userRole: UserRole;
}

interface AgendaItem {
  id: string;
  itemDate: string; // ISO string
  sourceType: 'order' | 'event';
  title: string;
  description?: string;
  rawStatus: string;
  link: string;
}

export async function getDailyTasks({ userId, userName, userRole }: GetDailyTasksParams): Promise<AgendaItem[]> {
  try {
    const [allOrders, allEvents] = await Promise.all([
      getOrdersFS(),
      getEventsFS(),
    ]);

    const localToday = startOfDay(new Date());
    const localNextSevenDaysEnd = endOfDay(addDays(localToday, 6));

    let filteredOrders: Order[] = [];
    let filteredEvents: CrmEvent[] = [];

    if (userRole === 'Admin') {
      filteredOrders = allOrders;
      filteredEvents = allEvents;
    } else if (userRole === 'SalesRep') {
      filteredOrders = allOrders.filter(o => o.salesRep === userName);
      filteredEvents = allEvents.filter(e => e.assignedTeamMemberIds.includes(userId));
    } else if (userRole === 'Clavadista' || userRole === 'Líder Clavadista') {
      filteredOrders = allOrders.filter(o => o.clavadistaId === userId);
      filteredEvents = allEvents.filter(e => e.assignedTeamMemberIds.includes(userId));
    }
    
    const orderItems: AgendaItem[] = filteredOrders
      .filter(o => {
        const dateStr = o.status === 'Programada' ? o.visitDate : o.nextActionDate;
        return (o.status === 'Programada' || o.status === 'Seguimiento' || o.status === 'Fallido') && dateStr && isValid(parseISO(dateStr));
      })
      .map(order => {
        const dateStr = (order.status === 'Programada' ? order.visitDate : order.nextActionDate)!;
        return {
          id: order.id,
          itemDate: dateStr,
          sourceType: 'order',
          title: order.clientName,
          description: order.status === 'Programada' ? 'Visita Programada' : `Acción: ${order.nextActionType || 'N/D'}`,
          rawStatus: order.status,
          link: `/order-form?originatingTaskId=${order.id}`,
        };
      });

    const eventItems: AgendaItem[] = allEvents
      .filter(e => e.startDate && isValid(parseISO(e.startDate)) && e.assignedTeamMemberIds.includes(userId))
      .map(event => ({
        id: event.id,
        itemDate: event.startDate,
        sourceType: 'event',
        title: event.name,
        description: `Tipo: ${event.type}`,
        rawStatus: event.status,
        link: `/events?viewEventId=${event.id}`,
      }));

    const allItems = [...orderItems, ...eventItems];
    
    const finalItems = allItems
      .filter(item => {
        const itemStartDate = startOfDay(parseISO(item.itemDate));
        return isWithinInterval(itemStartDate, { start: localToday, end: localNextSevenDaysEnd });
      })
      .sort((a, b) => {
        const dateA = parseISO(a.itemDate).getTime();
        const dateB = parseISO(b.itemDate).getTime();
        return dateA - dateB;
      });

    return finalItems;

  } catch (error) {
    console.error("Error in getDailyTasks server action:", error);
    throw new Error("Failed to fetch agenda items.");
  }
}
