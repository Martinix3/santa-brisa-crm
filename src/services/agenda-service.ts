
'use server';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp } from "firebase-admin/firestore";
import type { Order, CrmEvent } from '@/types';
import { startOfToday, endOfToday, addDays, parseISO, isValid } from 'date-fns';
import { RolUsuario as UserRole } from "@ssot";
import { fromFirestoreOrder } from '@/services/order-service';
import { fromFirestoreEvent } from '@/services/event-service';

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

  const today = startOfToday();
  const sevenDaysFromNow = addDays(endOfToday(), 7);
  const todayTimestamp = Timestamp.fromDate(today);
  const sevenDaysTimestamp = Timestamp.fromDate(sevenDaysFromNow);

  // --- Optimized Queries ---
  const orderQueries = [];
  const eventQueries = [];

  const baseOrderQueryConditions = [
      where('status', 'in', ['Programada', 'Seguimiento']),
  ];
  const baseEventQueryConditions = [
      where('status', 'in', ['Planificado', 'Confirmado', 'En Curso']),
      where('startDate', '>=', todayTimestamp),
      where('startDate', '<=', sevenDaysTimestamp),
  ];

  if (userRole === 'Admin') {
    // Admin sees all tasks/events in the date range
    orderQueries.push(query(collection(db, 'orders'), ...baseOrderQueryConditions));
    eventQueries.push(query(collection(db, 'events'), ...baseEventQueryConditions));
  } else {
    // Non-admins see tasks assigned to them
    orderQueries.push(query(collection(db, 'orders'), ...baseOrderQueryConditions, where('salesRep', '==', userName)));
    if(userRole === 'Clavadista' || userRole === 'Líder Clavadista'){
        orderQueries.push(query(collection(db, 'orders'), ...baseOrderQueryConditions, where('clavadistaId', '==', userId)));
    }
    eventQueries.push(query(collection(db, 'events'), ...baseEventQueryConditions, where('assignedTeamMemberIds', 'array-contains', userId)));
  }

  const [orderSnapshots, eventSnapshots] = await Promise.all([
    Promise.all(orderQueries.map(q => getDocs(q))),
    Promise.all(eventQueries.map(q => getDocs(q))),
  ]);

  const uniqueOrders = new Map<string, Order>();
  orderSnapshots.forEach(snapshot => snapshot.docs.forEach(doc => {
      const order = fromFirestoreOrder(doc);
      const taskDateStr = order.status === 'Programada' ? order.visitDate : order.nextActionDate;
      if (taskDateStr) {
          const taskDate = parseISO(taskDateStr);
          if (isValid(taskDate) && taskDate >= today && taskDate <= sevenDaysFromNow) {
            uniqueOrders.set(doc.id, order);
          }
      }
  }));

  const uniqueEvents = new Map<string, CrmEvent>();
  eventSnapshots.forEach(snapshot => snapshot.docs.forEach(doc => {
      uniqueEvents.set(doc.id, fromFirestoreEvent(doc));
  }));
  
  // --- Formatting ---
  const formattedOrders: AgendaItem[] = Array.from(uniqueOrders.values()).map(o => ({
    id: o.id,
    itemDate: (o.status === 'Programada' ? o.visitDate : o.nextActionDate)!,
    sourceType: 'order',
    title: o.clientName,
    description: o.notes || (o.status === 'Programada' ? 'Visita programada' : 'Tarea de seguimiento'),
    rawStatus: o.status,
    link: `/my-agenda`, 
  }));

  const formattedEvents: AgendaItem[] = Array.from(uniqueEvents.values()).map(e => ({
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
