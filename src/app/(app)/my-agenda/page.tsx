"use client";

import * as React from "react";
import { format, isSameDay, parseISO, startOfDay, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, ClipboardList, PartyPopper, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { getOrdersFS } from "@/services/order-service";
import { getEventsFS } from "@/services/event-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import type { Order, CrmEvent, TeamMember, UserRole } from "@/types";
import { Separator } from "@/components/ui/separator";
import StatusBadge from "@/components/app/status-badge";
import Link from "next/link";
import { cn } from "@/lib/utils";

// --- TYPE DEFINITIONS ---
interface AgendaItemBase {
  id: string;
  date: Date;
  type: 'order' | 'event';
  title: string;
  description?: string;
  rawItem: Order | CrmEvent;
}
interface AgendaOrderItem extends AgendaItemBase { type: 'order'; rawItem: Order; }
interface AgendaEventItem extends AgendaItemBase { type: 'event'; rawItem: CrmEvent; }
type AgendaItem = AgendaOrderItem | AgendaEventItem;

type TypeFilter = 'all' | 'tasks' | 'events';

// --- HELPER FUNCTIONS ---
const getAgendaItemIcon = (item: AgendaItem) => {
  if (item.type === 'event') return <PartyPopper className="h-5 w-5 text-blue-500 flex-shrink-0" />;
  if (item.type === 'order') return <ClipboardList className="h-5 w-5 text-green-500 flex-shrink-0" />;
  return <CalendarIcon className="h-5 w-5 text-gray-500 flex-shrink-0" />;
};

// --- MAIN COMPONENT ---
export default function MyAgendaPage() {
  const { userRole, teamMember, dataSignature } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = React.useState(true);
  const [allAgendaItems, setAllAgendaItems] = React.useState<AgendaItem[]>([]);
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);

  // State for filters and selection
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
  const [userFilter, setUserFilter] = React.useState<string>('all');
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>('all');
  
  const isAdmin = userRole === 'Admin';

  React.useEffect(() => {
    async function loadAgendaData() {
      setIsLoading(true);
      try {
        const [orders, events, members] = await Promise.all([
          getOrdersFS(),
          getEventsFS(),
          getTeamMembersFS(['SalesRep', 'Clavadista', 'Admin'])
        ]);

        const orderItems: AgendaItem[] = orders
            .filter(o => {
                const dateStr = o.status === 'Programada' ? o.visitDate : o.nextActionDate;
                return (o.status === 'Programada' || o.status === 'Seguimiento') && dateStr && isValid(parseISO(dateStr));
            })
            .map(o => ({
                id: o.id,
                date: parseISO((o.status === 'Programada' ? o.visitDate : o.nextActionDate)!),
                type: 'order' as const,
                title: o.clientName,
                description: o.nextActionType || `Visita a ${o.clientName}`,
                rawItem: o,
            }));
        
        const eventItems: AgendaItem[] = events
            .filter(e => e.startDate && isValid(parseISO(e.startDate)))
            .map(e => ({
                id: e.id,
                date: parseISO(e.startDate),
                type: 'event' as const,
                title: e.name,
                description: e.type,
                rawItem: e,
            }));
        
        setAllAgendaItems([...orderItems, ...eventItems]);
        setTeamMembers(members);

      } catch (error) {
        console.error("Error loading agenda data:", error);
        toast({ title: "Error al Cargar Agenda", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    loadAgendaData();
  }, [dataSignature, toast]);
  
  const highlightedDays = React.useMemo(() => {
      return allAgendaItems.map(item => startOfDay(item.date));
  }, [allAgendaItems]);

  const filteredItems = React.useMemo(() => {
      if (!selectedDate) return [];

      let items = allAgendaItems.filter(item => isSameDay(item.date, selectedDate));

      if (typeFilter !== 'all') {
          const itemType = typeFilter === 'tasks' ? 'order' : 'event';
          items = items.filter(item => item.type === itemType);
      }
      
      let userFilteredItems;
      if (isAdmin) {
          if (userFilter === 'all') {
              userFilteredItems = items;
          } else {
              userFilteredItems = items.filter(item => {
                  if (item.type === 'order') {
                      const order = item.rawItem as Order;
                      const assignedMember = teamMembers.find(m => m.name === order.salesRep);
                      return assignedMember?.id === userFilter;
                  }
                  if (item.type === 'event') {
                      const event = item.rawItem as CrmEvent;
                      return event.assignedTeamMemberIds.includes(userFilter);
                  }
                  return false;
              });
          }
      } else if (teamMember) {
          userFilteredItems = items.filter(item => {
              if (item.type === 'order') {
                  const order = item.rawItem as Order;
                  return order.salesRep === teamMember.name || order.clavadistaId === teamMember.id;
              }
              if (item.type === 'event') {
                  const event = item.rawItem as CrmEvent;
                  return event.assignedTeamMemberIds.includes(teamMember.id);
              }
              return false;
          });
      } else {
          userFilteredItems = [];
      }
      
      return userFilteredItems.sort((a,b) => a.date.getTime() - b.date.getTime());
  }, [allAgendaItems, selectedDate, typeFilter, userFilter, isAdmin, teamMember, teamMembers]);


  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
  };

  return (
    <div className="flex flex-col h-full">
       <header className="mb-6">
        <h1 className="text-3xl font-headline font-semibold flex items-center gap-2">
            <CalendarIcon className="h-8 w-8 text-primary"/>
            Mi Agenda
        </h1>
        <p className="text-muted-foreground">Planifica y gestiona tus visitas, tareas y eventos.</p>
       </header>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
          {/* Calendar Column */}
          <div className="lg:col-span-1">
              <Card>
                  <CardContent className="p-2">
                      <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={handleDayClick}
                          locale={es}
                          modifiers={{ highlighted: highlightedDays }}
                          modifiersClassNames={{ highlighted: 'day-highlighted' }}
                          className="p-0"
                          classNames={{
                              day_selected: "bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary/90",
                              day_today: "bg-accent text-accent-foreground",
                          }}
                       />
                  </CardContent>
              </Card>
          </div>
          
          {/* Agenda List Column */}
          <div className="lg:col-span-2">
              <Card className="h-full flex flex-col">
                  <CardHeader>
                      <CardTitle>Actividades para el {selectedDate ? format(selectedDate, 'd MMM, yyyy', {locale: es}) : 'día seleccionado'}</CardTitle>
                      <div className="flex flex-col sm:flex-row gap-2 pt-2">
                         {isAdmin && (
                            <Select value={userFilter} onValueChange={setUserFilter}>
                                <SelectTrigger><SelectValue placeholder="Filtrar por usuario..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los Usuarios</SelectItem>
                                    {teamMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                         )}
                         <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
                            <SelectTrigger><SelectValue placeholder="Filtrar por tipo..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todo</SelectItem>
                                <SelectItem value="tasks">Visitas y Tareas</SelectItem>
                                <SelectItem value="events">Eventos</SelectItem>
                            </SelectContent>
                         </Select>
                      </div>
                  </CardHeader>
                  <CardContent className="flex-grow overflow-y-auto pr-3">
                      {isLoading ? (
                          <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                      ) : filteredItems.length > 0 ? (
                          <div className="space-y-4">
                              {filteredItems.map(item => (
                                  <div key={item.id} className="p-3 border rounded-lg shadow-sm bg-background hover:bg-secondary/50 transition-colors">
                                      <div className="flex items-start gap-3">
                                          {getAgendaItemIcon(item)}
                                          <div className="flex-grow">
                                              <p className="font-semibold">{item.title}</p>
                                              <p className="text-sm text-muted-foreground">{item.description}</p>
                                          </div>
                                          <div className="flex flex-col items-end gap-1">
                                            {item.type === 'order' && <StatusBadge type="order" status={(item.rawItem as Order).status}/>}
                                            {item.type === 'event' && <StatusBadge type="event" status={(item.rawItem as CrmEvent).status}/>}
                                          </div>
                                      </div>
                                      <div className="mt-2 text-right">
                                         {item.type === 'order' && (
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={`/order-form?originatingTaskId=${item.id}`}>Registrar Resultado</Link>
                                            </Button>
                                         )}
                                          {item.type === 'event' && (
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={`/events?viewEventId=${item.id}`}>Ver Evento</Link>
                                            </Button>
                                         )}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground text-center">
                              <p>No hay actividades programadas para este día con los filtros seleccionados.</p>
                          </div>
                      )}
                  </CardContent>
              </Card>
          </div>
       </div>
    </div>
  );
}
