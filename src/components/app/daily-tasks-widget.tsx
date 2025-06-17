
'use client';

import * as React from 'react';
import { useAuth } from '@/contexts/auth-context';
import type { Order, CrmEvent } from '@/types';
import { mockOrders, mockCrmEvents } from '@/lib/data';
import { parseISO, format, isEqual, startOfDay, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import StatusBadge from '@/components/app/status-badge';
import { CalendarCheck, ClipboardList, PartyPopper } from 'lucide-react';
import Link from 'next/link';

interface AgendaItemBase {
  id: string;
  itemDate: Date;
  displayTime?: string;
  sourceType: 'order' | 'event';
  title: string;
  description?: string;
  rawItem: Order | CrmEvent;
}
interface AgendaOrderItem extends AgendaItemBase {
  sourceType: 'order';
  rawItem: Order;
}
interface AgendaCrmEventItem extends AgendaItemBase {
  sourceType: 'event';
  rawItem: CrmEvent;
}
type AgendaItem = AgendaOrderItem | AgendaCrmEventItem;

export default function DailyTasksWidget() {
  const { userRole, teamMember } = useAuth();
  const today = startOfDay(new Date());

  const dailyItems = React.useMemo<AgendaItem[]>(() => {
    if ((!teamMember && userRole === 'SalesRep') || userRole === 'Distributor') {
        return [];
    }

    let relevantOrders: Order[] = [];
    let relevantEvents: CrmEvent[] = [];

    if (userRole === 'Admin') {
      relevantOrders = mockOrders.filter(order =>
        (order.status === 'Seguimiento' || order.status === 'Fallido' || order.status === 'Programada') &&
        (order.status === 'Programada' ? order.visitDate : order.nextActionDate)
      );
      relevantEvents = mockCrmEvents;
    } else if (userRole === 'SalesRep' && teamMember) {
      relevantOrders = mockOrders.filter(order =>
        order.salesRep === teamMember.name &&
        (order.status === 'Seguimiento' || order.status === 'Fallido' || order.status === 'Programada') &&
        (order.status === 'Programada' ? order.visitDate : order.nextActionDate)
      );
      relevantEvents = mockCrmEvents.filter(event =>
        event.assignedTeamMemberIds.includes(teamMember.id)
      );
    }

    const orderAgendaItems: AgendaOrderItem[] = relevantOrders
      .map(order => ({
        id: order.id,
        itemDate: parseISO(order.status === 'Programada' ? order.visitDate! : order.nextActionDate!),
        sourceType: 'order' as 'order',
        title: order.clientName,
        description: order.status === 'Programada' ? 'Visita Programada' : `Acción: ${order.nextActionType}${order.nextActionType === 'Opción personalizada' && order.nextActionCustom ? ` - "${order.nextActionCustom}"` : ''}`,
        rawItem: order,
      }));

    const eventAgendaItems: AgendaCrmEventItem[] = relevantEvents
      .map(event => ({
        id: event.id,
        itemDate: parseISO(event.startDate),
        sourceType: 'event' as 'event',
        title: event.name,
        description: `Tipo: ${event.type}${event.location ? ` en ${event.location}` : ''}`,
        rawItem: event,
      }));

    const allItems = [...orderAgendaItems, ...eventAgendaItems];

    return allItems
      .filter(item => {
        const itemStartDate = startOfDay(item.itemDate);
        if (item.sourceType === 'event' && (item.rawItem as CrmEvent).endDate) {
          const itemEndDate = startOfDay(parseISO((item.rawItem as CrmEvent).endDate!));
          return isWithinInterval(today, { start: itemStartDate, end: itemEndDate });
        }
        return isEqual(itemStartDate, today);
      })
      .sort((a, b) => { // Sort by date, then by type (events first for example)
        if (a.itemDate.getTime() !== b.itemDate.getTime()) {
          return a.itemDate.getTime() - b.itemDate.getTime();
        }
        if (a.sourceType === 'event' && b.sourceType === 'order') return -1;
        if (a.sourceType === 'order' && b.sourceType === 'event') return 1;
        return 0;
      });

  }, [userRole, teamMember, today]);

  if (dailyItems.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No tienes tareas programadas para hoy.
      </div>
    );
  }

  const getLinkForItem = (item: AgendaItem) => {
    if (item.sourceType === 'order') {
      const order = item.rawItem as Order;
      if (order.status === 'Programada') {
        return `/order-form?updateVisitId=${order.id}`;
      }
      return `/crm-follow-up`;
    }
    if (item.sourceType === 'event') {
      return `/events`;
    }
    return '/my-agenda'; // Fallback link
  };
  
  const getIconForItem = (item: AgendaItem) => {
    if (item.sourceType === 'order') return <ClipboardList className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />;
    if (item.sourceType === 'event') return <PartyPopper className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />;
    return <CalendarCheck className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />;
  };


  return (
    <div className="p-1">
      <ScrollArea className="h-[300px] w-full sm:w-[350px] md:w-[400px]">
        <div className="space-y-1 p-2">
          {dailyItems.map(item => (
            <Link href={getLinkForItem(item)} key={item.id} className="block hover:bg-secondary/80 rounded-md transition-colors">
              <Card className="shadow-none border-0 bg-transparent">
                <CardContent className="p-2">
                   <div className="flex items-start space-x-2.5">
                      {getIconForItem(item)}
                      <div className="flex-grow min-w-0"> {/* Added min-w-0 for better truncation */}
                        <p className="text-sm font-semibold leading-tight truncate" title={item.title}>{item.title}</p>
                        <p className="text-xs text-muted-foreground truncate" title={item.description}>{item.description}</p>
                      </div>
                    </div>
                  {item.sourceType === 'order' && (
                    <div className="mt-1.5 flex justify-end">
                       <StatusBadge type="order" status={(item.rawItem as Order).status} className="text-xs px-1.5 py-0.5 h-auto" />
                    </div>
                  )}
                  {item.sourceType === 'event' && (
                     <div className="mt-1.5 flex justify-end">
                        <StatusBadge type="event" status={(item.rawItem as CrmEvent).status} className="text-xs px-1.5 py-0.5 h-auto" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </ScrollArea>
       <Separator />
        <div className="p-2 text-center">
            <Link href="/my-agenda" className="text-sm text-primary hover:underline">
                Ver agenda completa
            </Link>
        </div>
    </div>
  );
}
