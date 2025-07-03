
"use client";

import * as React from "react";
import { format, isSameDay, parseISO, startOfDay, endOfDay, isValid, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, ClipboardList, PartyPopper, Loader2, Filter, ChevronLeft, ChevronRight, Info, User, Send, CalendarDays, Footprints } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { getOrdersFS } from "@/services/order-service";
import { getEventsFS } from "@/services/event-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import type { Order, CrmEvent, TeamMember, UserRole } from "@/types";
import StatusBadge from "@/components/app/status-badge";
import Link from "next/link";
import { cn } from "@/lib/utils";

// --- TYPE DEFINITIONS ---
type AgendaItemType = 'visita' | 'tarea' | 'evento';

interface AgendaItemBase {
  id: string;
  date: Date;
  type: AgendaItemType;
  title: string;
  description?: string;
  rawItem: Order | CrmEvent;
}
interface AgendaVisitaItem extends AgendaItemBase { type: 'visita'; rawItem: Order; }
interface AgendaTareaItem extends AgendaItemBase { type: 'tarea'; rawItem: Order; }
interface AgendaEventItem extends AgendaItemBase { type: 'evento'; rawItem: CrmEvent; }
type AgendaItem = AgendaVisitaItem | AgendaTareaItem | AgendaEventItem;

type TypeFilter = 'all' | 'visitas' | 'tareas' | 'eventos';
type ViewMode = 'day' | 'week' | 'month';

// --- HELPER FUNCTIONS ---
const getAgendaItemIcon = (item: AgendaItem) => {
  switch(item.type) {
    case 'visita': return <Footprints className="h-4 w-4 text-blue-500 flex-shrink-0" />;
    case 'tarea': return <ClipboardList className="h-4 w-4 text-green-500 flex-shrink-0" />;
    case 'evento': return <PartyPopper className="h-4 w-4 text-purple-500 flex-shrink-0" />;
    default: return <CalendarIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />;
  }
};


// --- MAIN COMPONENT ---
export default function MyAgendaPage() {
  const { userRole, teamMember, dataSignature } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = React.useState(true);
  const [allAgendaItems, setAllAgendaItems] = React.useState<AgendaItem[]>([]);
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);

  // State for filters and selection
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [userFilter, setUserFilter] = React.useState<string>('all');
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>('all');
  const [viewMode, setViewMode] = React.useState<ViewMode>('day');
  
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

        const visitaItems: AgendaItem[] = orders
            .filter(o => o.status === 'Programada' && o.visitDate && isValid(parseISO(o.visitDate)))
            .map(o => ({
                id: o.id,
                date: parseISO(o.visitDate!),
                type: 'visita',
                title: `Visita a ${o.clientName}`,
                description: o.notes || 'Visita de captación/seguimiento programada.',
                rawItem: o,
            }));
        
        const tareaItems: AgendaItem[] = orders
            .filter(o => o.status === 'Seguimiento' && o.nextActionDate && isValid(parseISO(o.nextActionDate)))
            .map(o => ({
                id: o.id,
                date: parseISO(o.nextActionDate!),
                type: 'tarea',
                title: `Seguimiento con ${o.clientName}`,
                description: o.nextActionType || 'Realizar seguimiento',
                rawItem: o,
            }));
        
        const eventItems: AgendaItem[] = events
            .filter(e => e.startDate && isValid(parseISO(e.startDate)))
            .map(e => ({
                id: e.id,
                date: parseISO(e.startDate),
                type: 'evento' as const,
                title: e.name,
                description: e.type,
                rawItem: e,
            }));
        
        setAllAgendaItems([...visitaItems, ...tareaItems, ...eventItems]);
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

  const teamMembersMap = React.useMemo(() => new Map(teamMembers.map(m => [m.id, m])), [teamMembers]);
  
  const filteredItemsForHighlight = React.useMemo(() => {
    let items = allAgendaItems;

    if (typeFilter !== 'all') {
      items = items.filter(item => {
        if(typeFilter === 'visitas') return item.type === 'visita';
        if(typeFilter === 'tareas') return item.type === 'tarea';
        if(typeFilter === 'eventos') return item.type === 'evento';
        return false;
      });
    }
    
    let userFilteredItems;
    if (isAdmin) {
        if (userFilter !== 'all') {
            userFilteredItems = items.filter(item => {
                if (item.type === 'visita' || item.type === 'tarea') {
                    const order = item.rawItem as Order;
                    const assignedMember = teamMembers.find(m => m.name === order.salesRep);
                    return assignedMember?.id === userFilter || order.clavadistaId === userFilter;
                }
                if (item.type === 'evento') {
                    const event = item.rawItem as CrmEvent;
                    return event.assignedTeamMemberIds.includes(userFilter);
                }
                return false;
            });
        } else {
            userFilteredItems = items;
        }
    } else if (teamMember) {
        userFilteredItems = items.filter(item => {
            if (item.type === 'visita' || item.type === 'tarea') {
                const order = item.rawItem as Order;
                return order.salesRep === teamMember.name || order.clavadistaId === teamMember.id;
            }
            if (item.type === 'evento') {
                const event = item.rawItem as CrmEvent;
                return event.assignedTeamMemberIds.includes(teamMember.id);
            }
            return false;
        });
    } else {
        userFilteredItems = [];
    }
    return userFilteredItems;
  }, [allAgendaItems, typeFilter, userFilter, isAdmin, teamMember, teamMembers]);


  const highlightedDays = React.useMemo(() => {
    const dates = filteredItemsForHighlight.map(item => {
        const d = startOfDay(item.date);
        d.setHours(12, 0, 0, 0); 
        return d;
    });
    const uniqueDates = Array.from(new Set(dates.map(d => d.getTime()))).map(time => new Date(time));
    return uniqueDates;
  }, [filteredItemsForHighlight]);

  const { interval, itemsForView } = React.useMemo(() => {
      let intervalStart, intervalEnd;
      if (viewMode === 'day') {
          intervalStart = startOfDay(selectedDate);
          intervalEnd = endOfDay(selectedDate);
      } else if (viewMode === 'week') {
          intervalStart = startOfWeek(selectedDate, { locale: es });
          intervalEnd = endOfWeek(selectedDate, { locale: es });
      } else { // month
          intervalStart = startOfMonth(selectedDate);
          intervalEnd = endOfMonth(selectedDate);
      }
      
      const items = filteredItemsForHighlight
          .filter(item => isWithinInterval(item.date, { start: intervalStart, end: intervalEnd }))
          .sort((a,b) => a.date.getTime() - b.date.getTime());

      return { interval: { start: intervalStart, end: intervalEnd }, itemsForView: items };
  }, [selectedDate, viewMode, filteredItemsForHighlight]);

  const itemsGroupedByDay = React.useMemo(() => {
      const grouped = new Map<string, AgendaItem[]>();
      itemsForView.forEach(item => {
          const dayKey = format(item.date, 'yyyy-MM-dd');
          if (!grouped.has(dayKey)) {
              grouped.set(dayKey, []);
          }
          grouped.get(dayKey)!.push(item);
      });
      return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [itemsForView]);

  const handleDateChange = (direction: 'prev' | 'next') => {
    if (viewMode === 'day') {
        const sortedUniqueDays = Array.from(
            new Set(filteredItemsForHighlight.map(item => startOfDay(item.date).getTime()))
        ).sort((a, b) => a - b);
        
        const currentDayStart = startOfDay(selectedDate).getTime();

        if (direction === 'next') {
            const nextDay = sortedUniqueDays.find(day => day > currentDayStart);
            if (nextDay) {
                setSelectedDate(new Date(nextDay));
            } else {
                const newDate = new Date(selectedDate);
                newDate.setDate(newDate.getDate() + 1);
                setSelectedDate(newDate);
            }
        } else { // prev
            const prevDay = sortedUniqueDays.reverse().find(day => day < currentDayStart);
             if (prevDay) {
                setSelectedDate(new Date(prevDay));
            } else {
                const newDate = new Date(selectedDate);
                newDate.setDate(newDate.getDate() - 1);
                setSelectedDate(newDate);
            }
        }
    } else {
        const newDate = new Date(selectedDate);
        if (viewMode === 'week') newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        setSelectedDate(newDate);
    }
  };
  
  const getActionText = (order: Order) => {
    if (order.status === 'Programada') return "Visita de nuevo";
    if (order.status === 'Seguimiento' && order.nextActionType === 'Opción personalizada') return order.nextActionCustom || "Seguimiento personalizado";
    return order.nextActionType || "Seguimiento";
  };

  return (
    <div className="flex flex-col h-full space-y-6">
       <header>
        <h1 className="text-3xl font-headline font-semibold flex items-center gap-2">
            <CalendarIcon className="h-8 w-8 text-primary"/>
            Agenda del Equipo
        </h1>
        <p className="text-muted-foreground">Planifica y gestiona tus visitas, tareas y eventos.</p>
       </header>

       <Card>
         <CardHeader>
            <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5 text-muted-foreground"/>Filtros de Agenda</CardTitle>
            <CardDescription>Utiliza los filtros para personalizar la vista de tu agenda, mostrando acciones de seguimiento o eventos específicos.</CardDescription>
         </CardHeader>
         <CardContent className="flex flex-col sm:flex-row gap-4">
             {isAdmin && (
                <div className="flex-1 min-w-[180px]">
                    <p className="text-sm font-medium mb-1">Comercial / Clavadista</p>
                    <Select value={userFilter} onValueChange={setUserFilter}>
                        <SelectTrigger><SelectValue placeholder="Filtrar por usuario..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {teamMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
             )}
             <div className="flex-1 min-w-[180px]">
                 <p className="text-sm font-medium mb-1">Tipo de Entrada</p>
                 <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
                    <SelectTrigger><SelectValue placeholder="Filtrar por tipo..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todo</SelectItem>
                        <SelectItem value="visitas">Visitas</SelectItem>
                        <SelectItem value="tareas">Tareas</SelectItem>
                        <SelectItem value="eventos">Eventos</SelectItem>
                    </SelectContent>
                 </Select>
             </div>
             <div className="flex-1 min-w-[180px]">
                 <p className="text-sm font-medium mb-1">Vista</p>
                 <div className="flex items-center gap-1 rounded-md bg-muted p-1">
                     <Button variant={viewMode === 'day' ? 'primary' : 'ghost'} className="flex-1" onClick={() => setViewMode('day')}>Día</Button>
                     <Button variant={viewMode === 'week' ? 'primary' : 'ghost'} className="flex-1" onClick={() => setViewMode('week')}>Semana</Button>
                     <Button variant={viewMode === 'month' ? 'primary' : 'ghost'} className="flex-1" onClick={() => setViewMode('month')}>Mes</Button>
                 </div>
             </div>
         </CardContent>
       </Card>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
          <div className="lg:col-span-1">
              <Card>
                  <CardHeader>
                      <CardTitle>Calendario de Actividades</CardTitle>
                      <CardDescription>Navega por el calendario para seleccionar un día específico.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-2">
                      <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(day) => { if(day) { setSelectedDate(day); setViewMode('day'); } }}
                          locale={es}
                          modifiers={{ highlighted: highlightedDays }}
                          className="p-0"
                          classNames={{
                              day_selected: "bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary/90",
                              day_today: "bg-accent text-accent-foreground",
                          }}
                       />
                        <div className="flex items-center flex-wrap space-x-4 text-xs text-muted-foreground mt-4 p-2">
                            <div className="flex items-center gap-1.5"><Footprints className="h-4 w-4 text-blue-500"/> Visita</div>
                            <div className="flex items-center gap-1.5"><ClipboardList className="h-4 w-4 text-green-500"/> Tarea</div>
                            <div className="flex items-center gap-1.5"><PartyPopper className="h-4 w-4 text-purple-500"/> Evento</div>
                        </div>
                  </CardContent>
              </Card>
          </div>
          
          <div className="lg:col-span-2">
              <Card className="h-full flex flex-col">
                  <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle>Actividades para {format(selectedDate, 'dd MMMM, yyyy', {locale: es})}</CardTitle>
                        <div className="flex gap-2">
                            <Button variant="outline" size="icon" onClick={() => handleDateChange('prev')}><ChevronLeft className="h-4 w-4"/></Button>
                            <Button variant="outline" size="icon" onClick={() => handleDateChange('next')}><ChevronRight className="h-4 w-4"/></Button>
                        </div>
                      </div>
                  </CardHeader>
                  <CardContent className="flex-grow overflow-y-auto pr-3">
                      {isLoading ? (
                          <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                      ) : itemsForView.length > 0 ? (
                        <div className="space-y-4">
                            {itemsForView.map(item => {
                                const order = (item.type === 'visita' || item.type === 'tarea') ? item.rawItem as Order : null;
                                const event = item.type === 'evento' ? item.rawItem as CrmEvent : null;
                                const originalOrderDate = order?.originatingTaskId ? allAgendaItems.find(i => i.id === order.originatingTaskId)?.date : null;

                                return (
                                <div key={item.id} className="p-3 border rounded-lg shadow-sm bg-background hover:bg-secondary/50 transition-colors">
                                  <div className="flex justify-between items-start">
                                    <h4 className="font-semibold text-base flex items-center gap-2">{getAgendaItemIcon(item)} {item.title}</h4>
                                    {order && <StatusBadge type="order" status={order.status}/>}
                                    {event && <StatusBadge type="event" status={event.status}/>}
                                  </div>
                                  <div className="text-sm text-muted-foreground mt-2 space-y-1 pl-6">
                                      <p className="flex items-center gap-2"><Info className="h-4 w-4"/> Acción: {item.description}</p>
                                      {order && <p className="flex items-center gap-2"><User className="h-4 w-4"/> Responsable(s): {order.salesRep}{order.clavadistaId ? `, ${teamMembersMap.get(order.clavadistaId)?.name || 'Clavadista'}` : ''}</p>}
                                      {event && event.assignedTeamMemberIds.length > 0 && <p className="flex items-center gap-2"><User className="h-4 w-4"/> Asignados: {event.assignedTeamMemberIds.map(id => teamMembersMap.get(id)?.name).filter(Boolean).join(', ')}</p>}
                                      {originalOrderDate && <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4"/> Fecha Original Visita: {format(originalOrderDate, 'dd/MM/yy')}</p>}
                                  </div>
                                  {(order || event) && (
                                    <Button asChild size="sm" className="w-full mt-3 bg-primary hover:bg-primary/90">
                                      <Link href={order ? `/order-form?originatingTaskId=${item.id}` : `/events?viewEventId=${item.id}`}>
                                        <Send className="mr-2 h-4 w-4"/> {order ? "Registrar Resultado" : "Ver Detalles del Evento"}
                                      </Link>
                                    </Button>
                                  )}
                                </div>
                              )
                            })}
                        </div>
                      ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground text-center">
                              <p>No hay actividades programadas con los filtros seleccionados.</p>
                          </div>
                      )}
                  </CardContent>
              </Card>
          </div>
       </div>
    </div>
  );
}
