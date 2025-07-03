
"use client";

import * as React from "react";
import { format, isSameDay, parseISO, startOfDay, isValid, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, ClipboardList, PartyPopper, Loader2, Filter, ChevronLeft, ChevronRight, Info, User, Send, Briefcase } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { getOrdersFS } from "@/services/order-service";
import { getEventsFS } from "@/services/event-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import type { Order, CrmEvent, TeamMember, UserRole, OrderStatus } from "@/types";
import StatusBadge from "@/components/app/status-badge";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";

// --- TYPE DEFINITIONS ---
type AgendaItemType = 'tarea_comercial' | 'evento';

interface AgendaItemBase {
  id: string;
  date: Date;
  type: AgendaItemType;
  title: string;
  description?: string;
  rawItem: Order | CrmEvent;
}
interface AgendaTareaComercialItem extends AgendaItemBase { type: 'tarea_comercial'; rawItem: Order; }
interface AgendaEventItem extends AgendaItemBase { type: 'evento'; rawItem: CrmEvent; }
type AgendaItem = AgendaTareaComercialItem | AgendaEventItem;

type TypeFilter = 'all' | 'tareas_comerciales' | 'eventos';
type ViewMode = 'day' | 'week' | 'month';

// --- HELPER FUNCTIONS ---
const getAgendaItemIcon = (item: AgendaItem) => {
  switch(item.type) {
    case 'tarea_comercial': return <ClipboardList className="h-4 w-4 text-primary flex-shrink-0" />;
    case 'evento': return <PartyPopper className="h-4 w-4 text-purple-500 flex-shrink-0" />;
    default: return <CalendarIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />;
  }
};

const getInteractionType = (interaction: Order): string => {
    if (interaction.status === 'Programada') return "Visita Programada";
    if (interaction.status === 'Seguimiento') return `Seguimiento: ${interaction.nextActionType || 'N/D'}`;
    return "Tarea Desconocida";
}

// --- MAIN COMPONENT ---
export default function MyAgendaPage() {
  const { userRole, teamMember, dataSignature } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = React.useState(true);
  const [allAgendaItems, setAllAgendaItems] = React.useState<AgendaItem[]>([]);
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [selectedItem, setSelectedItem] = React.useState<AgendaItem | null>(null);

  // State for filters and selection
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const [userFilter, setUserFilter] = React.useState<string>('all');
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>('all');
  const [viewMode, setViewMode] = React.useState<ViewMode>('week');
  
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

        const tareaComercialItems: AgendaItem[] = orders
            .filter(o => (o.status === 'Programada' || o.status === 'Seguimiento') && (o.status === 'Programada' ? o.visitDate : o.nextActionDate) && isValid(parseISO((o.status === 'Programada' ? o.visitDate : o.nextActionDate)!)))
            .map(o => ({
                id: o.id,
                date: parseISO((o.status === 'Programada' ? o.visitDate : o.nextActionDate)!),
                type: 'tarea_comercial',
                title: `Interacción con ${o.clientName}`,
                description: getInteractionType(o),
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
        
        setAllAgendaItems([...tareaComercialItems, ...eventItems]);
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
        if(typeFilter === 'tareas_comerciales') return item.type === 'tarea_comercial';
        if(typeFilter === 'eventos') return item.type === 'evento';
        return false;
      });
    }
    
    let userFilteredItems;
    if (isAdmin) {
        if (userFilter !== 'all') {
            userFilteredItems = items.filter(item => {
                if (item.type === 'tarea_comercial') {
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
            if (item.type === 'tarea_comercial') {
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


  const { commercialTaskDays, eventDays } = React.useMemo(() => {
    const commercial = new Set<number>();
    const event = new Set<number>();

    filteredItemsForHighlight.forEach(item => {
        const date = startOfDay(item.date);
        date.setHours(12); // Normalize date to prevent TZ issues
        if (item.type === 'tarea_comercial') {
            commercial.add(date.getTime());
        } else if (item.type === 'evento') {
            event.add(date.getTime());
        }
    });

    return {
        commercialTaskDays: Array.from(commercial).map(time => new Date(time)),
        eventDays: Array.from(event).map(time => new Date(time)),
    };
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
    const newDate = new Date(selectedDate);
    if (viewMode === 'day') {
        const sortedUniqueDays = Array.from(
            new Set(filteredItemsForHighlight.map(item => startOfDay(item.date).getTime()))
        ).sort((a, b) => a - b);
        
        const currentDayStart = startOfDay(selectedDate).getTime();

        if (direction === 'next') {
            const nextDay = sortedUniqueDays.find(day => day > currentDayStart);
            setSelectedDate(nextDay ? new Date(nextDay) : new Date(newDate.setDate(newDate.getDate() + 1)));
        } else { // prev
            const prevDay = sortedUniqueDays.reverse().find(day => day < currentDayStart);
            setSelectedDate(prevDay ? new Date(prevDay) : new Date(newDate.setDate(newDate.getDate() - 1)));
        }
    } else {
        if (viewMode === 'week') newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        setSelectedDate(newDate);
    }
  };
  
   const handleItemClick = (item: AgendaItem) => {
    setSelectedItem(item);
  };
  
  return (
    <Sheet open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
    <div className="flex flex-col h-full space-y-6">
       <header>
        <h1 className="text-3xl font-headline font-semibold flex items-center gap-2">
            <CalendarIcon className="h-8 w-8 text-primary"/>
            Agenda del Equipo
        </h1>
        <div className="flex items-center flex-wrap space-x-4 text-xs text-muted-foreground mt-2 p-2">
            <div className="flex items-center gap-1.5"><ClipboardList className="h-4 w-4 text-primary"/> Tarea Comercial</div>
            <div className="flex items-center gap-1.5"><PartyPopper className="h-4 w-4 text-purple-500"/> Evento</div>
            <div className="flex items-center gap-1.5 opacity-50"><Briefcase className="h-4 w-4 text-blue-500"/> Tarea Admin. (Próx.)</div>
        </div>
       </header>

       <Card>
         <CardHeader>
            <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5 text-muted-foreground"/>Filtros de Agenda</CardTitle>
            <CardDescription>Utiliza los filtros para personalizar la vista de tu agenda.</CardDescription>
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
                        <SelectItem value="tareas_comerciales">Tareas Comerciales</SelectItem>
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
                          modifiers={{ 
                            commercial: commercialTaskDays,
                            event: eventDays
                          }}
                          modifiersStyles={{
                            commercial: { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' },
                            event: { backgroundColor: 'hsl(262.1 83.3% 57.8%)', color: 'hsl(var(--primary-foreground))' }
                          }}
                          className="p-0"
                          classNames={{
                              day_selected: "bg-black text-white hover:bg-black/90 focus:bg-black/90",
                              day_today: "bg-accent text-accent-foreground",
                          }}
                       />
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
                            {itemsForView.map(item => (
                                <SheetTrigger asChild key={item.id}>
                                <button className="w-full text-left" onClick={() => handleItemClick(item)}>
                                    <Card className="hover:bg-secondary/50 transition-colors shadow-sm">
                                        <CardContent className="p-3 flex items-start gap-3">
                                            {getAgendaItemIcon(item)}
                                            <div className="flex-grow">
                                                <h4 className="font-semibold text-base">{item.title}</h4>
                                                <p className="text-sm text-muted-foreground">{item.description}</p>
                                            </div>
                                            {item.type === 'tarea_comercial' && <StatusBadge type="order" status={(item.rawItem as Order).status}/>}
                                        </CardContent>
                                    </Card>
                                </button>
                                </SheetTrigger>
                              )
                            )}
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

       {selectedItem && (
         <SheetContent>
            <SheetHeader>
                <SheetTitle className="flex items-center gap-2">{getAgendaItemIcon(selectedItem)} {selectedItem.title}</SheetTitle>
                <SheetDescription>
                    {selectedItem.description}
                    <p className="font-medium text-foreground mt-2">{format(selectedItem.date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es })}</p>
                </SheetDescription>
            </SheetHeader>
            <div className="py-4 space-y-4">
                {selectedItem.type === 'tarea_comercial' && (
                  <Button asChild className="w-full">
                    <Link href={`/order-form?originatingTaskId=${selectedItem.id}`}><Send className="mr-2 h-4 w-4"/>Registrar Resultado</Link>
                  </Button>
                )}
                 {selectedItem.type === 'evento' && (
                  <Button asChild className="w-full">
                    <Link href={`/events?viewEventId=${selectedItem.id}`}><Info className="mr-2 h-4 w-4"/>Ver Detalles del Evento</Link>
                  </Button>
                )}
                {selectedItem.type === 'tarea_comercial' && (
                    <div className="text-sm space-y-2">
                        <p><strong>Responsable:</strong> {(selectedItem.rawItem as Order).salesRep}</p>
                        {(selectedItem.rawItem as Order).clavadistaId && <p><strong>Clavadista:</strong> {teamMembersMap.get((selectedItem.rawItem as Order).clavadistaId!)?.name || 'N/D'}</p>}
                    </div>
                )}
                 {selectedItem.type === 'evento' && (
                     <div className="text-sm space-y-2">
                        <p><strong>Responsables:</strong> {(selectedItem.rawItem as CrmEvent).assignedTeamMemberIds.map(id => teamMembersMap.get(id)?.name).filter(Boolean).join(', ')}</p>
                     </div>
                 )}
            </div>
         </SheetContent>
        )}
    </div>
    </Sheet>
  );
}
