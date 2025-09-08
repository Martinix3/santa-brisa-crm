
'use client';

import * as React from 'react';
import { useAuth } from '@/contexts/auth-context';
import type { Order, CrmEvent, CrmEventStatus } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import StatusBadge from '@/components/app/status-badge';
import { CalendarCheck, ClipboardList, PartyPopper, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { getDailyTasks } from '@/services/server/agenda-actions';

interface AgendaItem {
  id: string;
  itemDate: string; // Keep as ISO string
  sourceType: 'order' | 'event';
  title: string;
  description?: string;
  rawStatus: string;
  link: string;
}


export default function DailyTasksWidget() {
  const { userRole, teamMember, loading: authLoading, dataSignature } = useAuth();
  const { toast } = useToast();
  const [dailyItems, setDailyItems] = React.useState<AgendaItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const shouldFetch = !authLoading && userRole && teamMember;
    if (!shouldFetch) {
      setIsLoading(false);
      setDailyItems([]);
      return;
    }
    
    async function loadTasks() {
      setIsLoading(true);
      try {
        const items = await getDailyTasks({
          userId: teamMember!.id,
          userName: teamMember!.name,
          userRole: userRole!,
        });
        setDailyItems(items);
      } catch (error: any) {
        console.error("Error fetching data for daily tasks widget:", error);
        toast({
          title: "Error al Cargar Tareas",
          description: error.message || "No se pudieron cargar las tareas.",
          variant: "destructive"
        });
        setDailyItems([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadTasks();
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
            <Link href={item.link} key={item.id} className="block hover:bg-secondary/80 rounded-md transition-colors">
              <Card className="shadow-none border-0 bg-transparent">
                <CardContent className="p-2">
                   <div className="flex items-start space-x-2.5">
                      {getIconForItem(item)}
                      <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-baseline">
                           <p className="text-sm font-semibold leading-tight truncate" title={item.title}>{item.title}</p>
                           <p className="text-xs text-muted-foreground ml-2 flex-shrink-0">{format(new Date(item.itemDate), "dd/MM", { locale: es })}</p>
                        </div>
                        <p className="text-xs text-muted-foreground truncate" title={item.description}>{item.description}</p>
                      </div>
                    </div>
                  {item.sourceType === 'order' && (
                    <div className="mt-1.5 flex justify-end">
                       <StatusBadge type="order" status={item.rawStatus as OrderStatus} className="text-xs px-1.5 py-0.5 h-auto" />
                    </div>
                  )}
                  {item.sourceType === 'event' && (
                     <div className="mt-1.5 flex justify-end">
                        <StatusBadge type="event" status={item.rawStatus as CrmEventStatus} className="text-xs px-1.5 py-0.5 h-auto" />
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
