
'use client';

import * as React from 'react';
import { useAuth } from '@/contexts/auth-context';
import type { Order, CrmEvent, CrmEventStatus } from '@/types';
import { parseISO, format, startOfDay, endOfDay, isWithinInterval, addDays, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import StatusBadge from '@/components/app/status-badge';
import { CalendarCheck, ClipboardList, PartyPopper, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { getOrdersFS } from '@/services/order-service';
import { getEventsFS } from '@/services/event-service'; 
import { useToast } from '@/hooks/use-toast';

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
  const { userRole, teamMember, loading: authLoading, dataSignature } = useAuth();
  const { toast } = useToast();
  const [dailyItems, setDailyItems] = React.useState<AgendaItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const localToday = startOfDay(new Date());
    const localNextSevenDaysEnd = endOfDay(addDays(localToday, 6));

    async function loadTasksInternal() {
      let relevantOrdersFromFS: Order[] = [];
      let relevantEventsFromFS: CrmEvent[] = [];

      try {
        const [fetchedOrders, fetchedEvents] = await Promise.all([
            getOrdersFS(),
            getEventsFS()
        ]);
        relevantOrdersFromFS = fetchedOrders;
        relevantEventsFromFS = fetchedEvents;

      } catch (error) {
        console.error("Error fetching data for daily tasks:", error);
        toast({title: "Error al Cargar Tareas", description: "No se pudieron cargar todas las tareas.", variant: "destructive"})
        setDailyItems([]);
        return; 
      }

      let filteredOrders: Order[] = [];
      let filteredEvents: CrmEvent[] = [];

      if (userRole === 'Admin') {
        filteredOrders = relevantOrdersFromFS.filter(order =>
          (order.status === 'Seguimiento' || order.status === 'Fallido' || order.status === 'Programada') &&
          (order.status === 'Programada' ? order.visitDate : order.nextActionDate) &&
          isValid(parseISO(order.status === 'Programada' ? order.visitDate! : order.nextActionDate!))
        );
        filteredEvents = relevantEventsFromFS.filter(event => isValid(parseISO(event.startDate)));
      } else if (userRole === 'SalesRep' && teamMember) {
        filteredOrders = relevantOrdersFromFS.filter(order =>
          order.salesRep === teamMember.name &&
          (order.status === 'Seguimiento' || order.status === 'Fallido' || order.status === 'Programada') &&
          (order.status === 'Programada' ? order.visitDate : order.nextActionDate) &&
          isValid(parseISO(order.status === 'Programada' ? order.visitDate! : order.nextActionDate!))
        );
        filteredEvents = relevantEventsFromFS.filter(event =>
          event.assignedTeamMemberIds.includes(teamMember.id) && isValid(parseISO(event.startDate))
        );
      } else if (userRole === 'Clavadista' && teamMember) {
        filteredOrders = relevantOrdersFromFS.filter(order =>
          order.clavadistaId === teamMember.id &&
          (order.status === 'Seguimiento' || order.status === 'Fallido' || order.status === 'Programada') &&
          (order.status === 'Programada' ? order.visitDate : order.nextActionDate) &&
          isValid(parseISO(order.status === 'Programada' ? order.visitDate! : order.nextActionDate!))
        );
        filteredEvents = relevantEventsFromFS.filter(event =>
          event.assignedTeamMemberIds.includes(teamMember.id) && isValid(parseISO(event.startDate))
        );
      }


      const orderAgendaItems: AgendaOrderItem[] = filteredOrders
        .map(order => ({
          id: order.id,
          itemDate: parseISO(order.status === 'Programada' ? order.visitDate! : order.nextActionDate!),
          sourceType: 'order' as 'order',
          title: order.clientName,
          description: order.status === 'Programada' ? 'Visita Programada' : `Acción: ${order.nextActionType}${order.nextActionType === 'Opción personalizada' && order.nextActionCustom ? ` - "${order.nextActionCustom}"` : ''}`,
          rawItem: order,
        }));

      const eventAgendaItems: AgendaCrmEventItem[] = filteredEvents
        .map(event => ({
          id: event.id,
          itemDate: parseISO(event.startDate),
          sourceType: 'event' as 'event',
          title: event.name,
          description: `Tipo: ${event.type}${event.location ? ` en ${event.location}` : ''}`,
          rawItem: event,
        }));

      const allItems = [...orderAgendaItems, ...eventAgendaItems];

      setDailyItems(allItems
        .filter(item => {
          const itemStartDate = startOfDay(item.itemDate);
          if (item.sourceType === 'event' && (item.rawItem as CrmEvent).endDate && isValid(parseISO((item.rawItem as CrmEvent).endDate!))) {
            const itemEndDate = startOfDay(parseISO((item.rawItem as CrmEvent).endDate!));
            return (itemStartDate <= localNextSevenDaysEnd && itemEndDate >= localToday);
          }
          return isWithinInterval(itemStartDate, { start: localToday, end: localNextSevenDaysEnd });
        })
        .sort((a, b) => {
          if (a.itemDate.getTime() !== b.itemDate.getTime()) {
            return a.itemDate.getTime() - b.itemDate.getTime();
          }
          if (a.sourceType === 'event' && b.sourceType === 'order') return -1;
          if (a.sourceType === 'order' && b.sourceType === 'event') return 1;
          return 0;
        }));
    }

    if (authLoading) {
      setIsLoading(true);
      return;
    }

    if (!userRole) {
      setIsLoading(false);
      setDailyItems([]);
      return;
    }
    
    if ((userRole === 'SalesRep' || userRole === 'Clavadista') && !teamMember) {
      setIsLoading(false);
      setDailyItems([]);
      return;
    }

    const shouldFetch = userRole === 'Admin' || (teamMember && (userRole === 'SalesRep' || userRole === 'Clavadista'));

    if (shouldFetch) {
      setIsLoading(true);
      loadTasksInternal().finally(() => setIsLoading(false));
    } else {
      setDailyItems([]);
      setIsLoading(false);
    }

  }, [authLoading, userRole, teamMember, dataSignature, toast]);

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center items-center h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (dailyItems.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No tienes próximas tareas programadas.
      </div>
    );
  }

  const getLinkForItem = (item: AgendaItem) => {
    if (item.sourceType === 'order') {
      const order = item.rawItem as Order;
      if (order.status === 'Programada' || order.status === 'Seguimiento' || order.status === 'Fallido') {
        return `/order-form?originatingTaskId=${order.id}`;
      }
      return `/accounts`;
    }
    if (item.sourceType === 'event') {
       return `/events?viewEventId=${item.id}`;
    }
    return '/my-agenda';
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
                      <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-baseline">
                           <p className="text-sm font-semibold leading-tight truncate" title={item.title}>{item.title}</p>
                           <p className="text-xs text-muted-foreground ml-2 flex-shrink-0">{format(item.itemDate, "dd/MM", { locale: es })}</p>
                        </div>
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
                        <StatusBadge type="event" status={(item.rawItem as CrmEvent).status as CrmEventStatus} className="text-xs px-1.5 py-0.5 h-auto" />
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
