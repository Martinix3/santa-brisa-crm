
'use server';

import { adminDb as db } from '@/lib/firebaseAdmin';
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

  // This is the fix: We remove the 'status' filter from the query
  // to avoid Firestore's "cannot have range filters on different fields" limitation.
  // We will filter by status after fetching the data.
  const scheduledOrderConditions = [
      where('visitDate', '>=', todayTimestamp),
      where('visitDate', '<=', sevenDaysTimestamp),
  ];
  const followUpOrderConditions = [
      where('nextActionDate', '>=', todayTimestamp),
      where('nextActionDate', '<=', sevenDaysTimestamp),
  ];

  const baseEventQueryConditions = [
      where('status', 'in', ['Planificado', 'Confirmado', 'En Curso']),
      where('startDate', '>=', todayTimestamp),
      where('startDate', '<=', sevenDaysTimestamp),
  ];

  if (userRole === 'Admin') {
    // Admin sees all tasks/events in the date range
    orderQueries.push(query(collection(db, 'orders'), ...scheduledOrderConditions));
    orderQueries.push(query(collection(db, 'orders'), ...followUpOrderConditions));
    eventQueries.push(query(collection(db, 'events'), ...baseEventQueryConditions));
  } else {
    // Non-admins see tasks assigned to them
    orderQueries.push(query(collection(db, 'orders'), ...scheduledOrderConditions, where('salesRep', '==', userName)));
    orderQueries.push(query(collection(db, 'orders'), ...followUpOrderConditions, where('salesRep', '==', userName)));

    if(userRole === 'Clavadista' || userRole === 'Líder Clavadista'){
        orderQueries.push(query(collection(db, 'orders'), ...scheduledOrderConditions, where('clavadistaId', '==', userId)));
        orderQueries.push(query(collection(db, 'orders'), ...followUpOrderConditions, where('clavadistaId', '==', userId)));
    }
    eventQueries.push(query(collection(db, 'events'), ...baseEventQueryConditions, where('assignedTeamMemberIds', 'array-contains', userId)));
  }

  const [orderSnapshots, eventSnapshots] = await Promise.all([
    Promise.all(orderQueries.map(q => getDocs(q))),
    Promise.all(eventQueries.map(q => getDocs(q))),
  ]);

  const uniqueOrders = new Map<string, Order>();
  orderSnapshots.flat().forEach(snapshot => snapshot.docs.forEach(doc => {
      const order = fromFirestoreOrder(doc);
      // Filter by status here, after fetching
      if (['Programada', 'Seguimiento'].includes(order.status)) {
        uniqueOrders.set(doc.id, order);
      }
  }));

  const uniqueEvents = new Map<string, CrmEvent>();
  eventSnapshots.flat().forEach(snapshot => snapshot.docs.forEach(doc => {
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
