
'use server';

import { getOrdersFS } from '@/services/order-service';
import { getEventsFS } from '@/services/event-service';
import type { Order, CrmEvent, UserRole } from '@/types';
import { startOfToday, endOfToday, addDays, parseISO, isValid } from 'date-fns';

interface AgendaItem {
  id: string;
  itemDate: string; // ISO string
  sourceType: 'order' | 'event';
  title: string;
  description?: string;
  rawStatus: string;
  link: string;
}

export async function getDailyTasks(params: {
  userId: string;
  userName: string;
  userRole: UserRole;
}): Promise<AgendaItem[]> {
  const { userId, userName, userRole } = params;

  const [orders, events] = await Promise.all([
    getOrdersFS(),
    getEventsFS(),
  ]);

  const today = startOfToday();
  const sevenDaysFromNow = endOfToday();

  const relevantOrders = orders.filter(order => {
    const isAssigned =
      userRole === 'Admin' ||
      order.salesRep === userName ||
      order.clavadistaId === userId;
    if (!isAssigned) return false;

    const taskDateStr = order.status === 'Programada' ? order.visitDate : order.nextActionDate;
    if (!taskDateStr || !['Programada', 'Seguimiento'].includes(order.status)) return false;

    const taskDate = parseISO(taskDateStr);
    return isValid(taskDate) && taskDate >= today && taskDate <= sevenDaysFromNow;
  });

  const relevantEvents = events.filter(event => {
    const isAssigned =
      userRole === 'Admin' || event.assignedTeamMemberIds.includes(userId);
    if (!isAssigned || !event.startDate) return false;

    const eventDate = parseISO(event.startDate);
    return isValid(eventDate) && eventDate >= today && eventDate <= sevenDaysFromNow;
  });

  const formattedOrders: AgendaItem[] = relevantOrders.map(o => ({
    id: o.id,
    itemDate: (o.status === 'Programada' ? o.visitDate : o.nextActionDate)!,
    sourceType: 'order',
    title: o.clientName,
    description: o.notes || (o.status === 'Programada' ? 'Visita programada' : 'Tarea de seguimiento'),
    rawStatus: o.status,
    link: `/my-agenda`, 
  }));

  const formattedEvents: AgendaItem[] = relevantEvents.map(e => ({
    id: e.id,
    itemDate: e.startDate,
    sourceType: 'event',
    title: e.name,
    description: `Evento: ${e.type}`,
    rawStatus: e.status,
    link: '/events',
  }));

  const combinedItems = [...formattedOrders, ...formattedEvents];
  
  combinedItems.sort((a, b) => new Date(a.itemDate).getTime() - new Date(b.itemDate).getTime());

  return combinedItems;
}
