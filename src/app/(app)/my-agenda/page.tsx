
"use client";

import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import type { Order, CrmEvent, CrmEventStatus, TeamMember, UserRole, OrderStatus } from "@/types";
import { parseISO, format, isEqual, startOfDay, isSameMonth, isWithinInterval, addDays, isValid, isBefore } from "date-fns"; 
import { es } from "date-fns/locale";
import { CalendarCheck, User, Info, Filter, PartyPopper, Users as UsersIcon, Send, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/app/status-badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getOrdersFS } from "@/services/order-service";
import { getEventsFS } from "@/services/event-service"; 
import { getTeamMembersFS } from "@/services/team-member-service";
import { useToast } from "@/hooks/use-toast";


interface AgendaItemBase {
  id: string;
  itemDate: Date;
  displayTime?: string;
  sourceType: 'order' | 'event';
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

const simplifiedActionTypeOptions = ["Todos", "Acciones de Seguimiento", "Eventos"] as const;
type SimplifiedActionFilterType = typeof simplifiedActionTypeOptions[number];


export default function AgendaPage() {
  const { userRole, teamMember, loading: authContextLoading, dataSignature } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date());
  const [selectedSalesRepForAdmin, setSelectedSalesRepForAdmin] = React.useState<string>("Todos"); 
  const [actionTypeFilter, setActionTypeFilter] = React.useState<SimplifiedActionFilterType>("Todos");
  const [agendaItems, setAgendaItems] = React.useState<AgendaItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [allTeamMembersForAdmin, setAllTeamMembersForAdmin] = React.useState<TeamMember[]>([]);


  React.useEffect(() => {
    async function loadFilterData() {
        if (userRole === 'Admin') {
            setIsLoading(true); 
            try {
                const reps = await getTeamMembersFS(['SalesRep', 'Admin', 'Clavadista']); 
                setAllTeamMembersForAdmin(reps); 
            } catch (error) {
                console.error("Failed to load team members for admin filter", error);
                toast({ title: "Error", description: "No se pudieron cargar los miembros del equipo para el filtro.", variant: "destructive" });
            }
        }
    }
    if (!authContextLoading && userRole === 'Admin') { 
        loadFilterData();
    } 
  }, [userRole, authContextLoading, toast]);


  React.useEffect(() => {
    async function loadAgendaData() {
      setIsLoading(true);
      let fetchedOrderItems: AgendaItem[] = [];
      let fetchedEventItems: AgendaItem[] = [];

      try {
        const [ordersFromFS, eventsFromFS] = await Promise.all([
            (actionTypeFilter === "Todos" || actionTypeFilter === "Acciones de Seguimiento") ? getOrdersFS() : Promise.resolve([]),
            (actionTypeFilter === "Todos" || actionTypeFilter === "Eventos") ? getEventsFS() : Promise.resolve([])
        ]);

        if (actionTypeFilter === "Todos" || actionTypeFilter === "Acciones de Seguimiento") {
            fetchedOrderItems = ordersFromFS
            .filter(order => {
              const isRelevantStatus = ['Seguimiento', 'Fallido', 'Programada'].includes(order.status);
              const dateField = order.status === 'Programada' ? order.visitDate : order.nextActionDate;
              const hasValidDate = dateField && isValid(parseISO(dateField));
                                   
              if (!isRelevantStatus || !hasValidDate) return false;

              if (userRole === 'Admin') {
                if (selectedSalesRepForAdmin === "Todos") return true;
                const selectedMember = allTeamMembersForAdmin.find(rep => rep.id === selectedSalesRepForAdmin);
                if (!selectedMember) return false;
                return (selectedMember.role === 'SalesRep' && selectedMember.name === order.salesRep) ||
                       (selectedMember.role === 'Clavadista' && selectedMember.id === order.clavadistaId);
              } else if (userRole === 'SalesRep' && teamMember) {
                return teamMember.name === order.salesRep;
              } else if (userRole === 'Clavadista' && teamMember) {
                return teamMember.id === order.clavadistaId;
              }
              return false;
            })
            .map(order => ({
              id: order.id,
              itemDate: parseISO((order.status === 'Programada' ? order.visitDate : order.nextActionDate)!),
              sourceType: 'order' as 'order',
              rawItem: order,
            }));
        }

        if (actionTypeFilter === "Todos" || actionTypeFilter === "Eventos") {
          fetchedEventItems = eventsFromFS
            .filter(event => {
              if (!isValid(parseISO(event.startDate))) return false;
              if (userRole === 'Admin') {
                if (selectedSalesRepForAdmin === "Todos") return true;
                return event.assignedTeamMemberIds.includes(selectedSalesRepForAdmin);
              }
              return teamMember ? event.assignedTeamMemberIds.includes(teamMember.id) : false;
            })
            .map(event => ({
              id: event.id,
              itemDate: parseISO(event.startDate),
              sourceType: 'event' as 'event',
              rawItem: event,
            }));
        }
        setAgendaItems([...fetchedOrderItems, ...fetchedEventItems].sort((a, b) => a.itemDate.getTime() - b.itemDate.getTime()));
      } catch (error) {
        console.error("Error loading agenda data:", error);
        toast({ title: "Error al Cargar Agenda", description: "No se pudieron cargar los datos de la agenda.", variant: "destructive"});
      } finally {
        setIsLoading(false);
      }
    }

    if (authContextLoading) {
      setIsLoading(true);
      return;
    }

    const shouldLoad = (userRole === 'Admin' && (!allTeamMembersForAdmin.length && selectedSalesRepForAdmin !== "Todos" ? false : true)) ||
                       (userRole === 'SalesRep' && teamMember) ||
                       (userRole === 'Clavadista' && teamMember);

    if (shouldLoad) {
        loadAgendaData();
    } else {
        setAgendaItems([]);
        setIsLoading(false);
    }
  }, [userRole, teamMember, selectedSalesRepForAdmin, actionTypeFilter, toast, allTeamMembersForAdmin, authContextLoading, dataSignature]);


  const itemsForSelectedDay = React.useMemo(() => {
    if (!selectedDate) return [];
    return agendaItems.filter(item => {
        if (item.sourceType === 'event' && (item.rawItem as CrmEvent).endDate && isValid(parseISO((item.rawItem as CrmEvent).endDate!))) {
             return isWithinInterval(startOfDay(selectedDate), {
                start: startOfDay(item.itemDate),
                end: startOfDay(parseISO((item.rawItem as CrmEvent).endDate!))
            });
        }
        return isEqual(startOfDay(item.itemDate), startOfDay(selectedDate));
    });
  }, [selectedDate, agendaItems]);

  const itemsInCurrentMonth = React.useMemo(() => {
    return agendaItems.filter(item => isSameMonth(item.itemDate, currentMonth));
  }, [currentMonth, agendaItems]);

  const highlightedDaysModifier = React.useMemo(() => {
    const datesWithItems = new Set<string>();
    itemsInCurrentMonth.forEach(item => {
        if (isValid(item.itemDate)) { 
            datesWithItems.add(format(item.itemDate, "yyyy-MM-dd"));
            if (item.sourceType === 'event') {
                const event = item.rawItem as CrmEvent;
                if (event.endDate && isValid(parseISO(event.endDate))) {
                    let currentDateIterator = item.itemDate;
                    const stopDate = parseISO(event.endDate);
                    while(currentDateIterator <= stopDate) {
                        datesWithItems.add(format(currentDateIterator, "yyyy-MM-dd"));
                        currentDateIterator = addDays(currentDateIterator, 1);
                    }
                }
            }
        }
    });
    return Array.from(datesWithItems).map(dateStr => parseISO(dateStr)).filter(isValid);
  }, [itemsInCurrentMonth]);

  const modifiers = {
    highlighted: highlightedDaysModifier,
    selected: selectedDate ? [selectedDate] : [],
  };

  const modifiersClassNames = {
    highlighted: 'bg-primary/20 rounded-full font-bold',
    selected: 'bg-primary text-primary-foreground rounded-full',
  };

  if (authContextLoading && !userRole) { 
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Cargando autenticación...</p>
      </div>
    );
  }

  if (!userRole || (userRole === 'Distributor')) { 
     return (
      <Card>
        <CardHeader><CardTitle>Acceso Denegado</CardTitle></CardHeader>
        <CardContent><p>No tienes permisos para ver esta sección o la agenda no aplica a tu rol.</p></CardContent>
      </Card>
    );
  }

  const pageTitle = userRole === 'Admin' ? "Agenda del Equipo" : "Mi Agenda Personal";
  const canFilterByUser = userRole === 'Admin';

  return (
    <div className="space-y-6">
      <header className="flex items-center space-x-2">
          <CalendarCheck className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-headline font-semibold">{pageTitle}</h1>
      </header>

      <Card className="shadow-subtle">
        <CardHeader>
            <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-xl">Filtros de Agenda</CardTitle>
            </div>
            <CardDescription>Utiliza los filtros para personalizar la vista de tu agenda, mostrando acciones de seguimiento o eventos específicos.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 items-end">
            {canFilterByUser && (
              <div className="w-full sm:w-auto flex-grow sm:flex-grow-0">
                <Label htmlFor="salesRepFilterAgenda">Comercial / Clavadista</Label>
                <Select 
                    value={selectedSalesRepForAdmin} 
                    onValueChange={setSelectedSalesRepForAdmin} 
                    disabled={allTeamMembersForAdmin.length === 0 && userRole ==='Admin'}
                >
                    <SelectTrigger id="salesRepFilterAgenda" className="w-full sm:w-[200px] mt-1">
                    <SelectValue placeholder="Filtrar por responsable" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    {allTeamMembersForAdmin.map(rep => (
                        <SelectItem key={rep.id} value={rep.id}>{rep.name} ({rep.role === 'SalesRep' ? 'Rep. Ventas' : rep.role})</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
              </div>
            )}
            <div className="w-full sm:w-auto flex-grow sm:flex-grow-0">
               <Label htmlFor="actionTypeFilterAgenda">Tipo de Entrada</Label>
               <Select value={actionTypeFilter} onValueChange={(value) => setActionTypeFilter(value as SimplifiedActionFilterType)}>
                <SelectTrigger id="actionTypeFilterAgenda" className="w-full sm:w-[240px] mt-1">
                    <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                    {simplifiedActionTypeOptions.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
        </CardContent>
      </Card>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 shadow-subtle hover:shadow-md transition-shadow duration-300">
            <CardHeader>
                <CardTitle>Calendario de Actividades</CardTitle>
                <CardDescription>Navega por el calendario para seleccionar un día específico. Los días con acciones o eventos programados aparecerán resaltados.</CardDescription>
            </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              modifiers={modifiers}
              modifiersClassNames={modifiersClassNames}
              locale={es}
              className="rounded-md border p-3"
              disabled={{ before: new Date(2000,0,1) }}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-subtle hover:shadow-md transition-shadow duration-300">
          <CardHeader>
            <CardTitle>
              {selectedDate ? `Actividades para ${format(selectedDate, "PPP", { locale: es })}` : "Actividades del Día"}
            </CardTitle>
            <CardDescription>
                {isLoading ? "Cargando actividades..." : (itemsForSelectedDay.length > 0
                    ? `Tienes ${itemsForSelectedDay.length} actividad(es) programada(s).`
                    : `No tienes actividades programadas para este día${selectedDate ? "" : " actual"}, o no coinciden con los filtros aplicados.`)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="flex justify-center items-center h-[450px]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
              <ScrollArea className="h-[450px] pr-3">
                {itemsForSelectedDay.length > 0 ? (
                  <ul className="space-y-3">
                    {itemsForSelectedDay.map(item => {
                      const orderItem = item.sourceType === 'order' ? item.rawItem as Order : null;
                      const eventItem = item.sourceType === 'event' ? item.rawItem as CrmEvent : null;
                      
                      const isOverdue = item.sourceType === 'order' && 
                                        orderItem && 
                                        (orderItem.status === 'Programada' || orderItem.status === 'Seguimiento') && 
                                        isValid(item.itemDate) && 
                                        isBefore(item.itemDate, startOfDay(new Date()));
                      
                      let teamMemberDisplay: string | null = null;
                      if (userRole === 'Admin' && selectedSalesRepForAdmin === "Todos") {
                          if (orderItem) {
                              const assignedRep = allTeamMembersForAdmin.find(tm => tm.name === orderItem.salesRep);
                              teamMemberDisplay = assignedRep ? `${assignedRep.name} (Comercial)` : orderItem.salesRep;
                              if (orderItem.clavadistaId) {
                                const clava = allTeamMembersForAdmin.find(tm => tm.id === orderItem.clavadistaId);
                                if (clava) teamMemberDisplay += `, ${clava.name} (Clavadista)`;
                              }
                          } else if (eventItem) {
                              const assignedMembers = allTeamMembersForAdmin
                                  .filter(tm => eventItem.assignedTeamMemberIds.includes(tm.id))
                                  .map(tm => `${tm.name} (${tm.role === 'SalesRep' ? 'Rep. Ventas' : tm.role})`);
                              if (assignedMembers.length > 0) {
                                teamMemberDisplay = assignedMembers.join(', ');
                              }
                          }
                      }


                      return (
                      <li key={item.id} className={cn("p-3 bg-secondary/30 rounded-md shadow-sm", isOverdue && "border-l-4 border-yellow-500")}>
                        {orderItem && (
                          <>
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-semibold text-sm">{orderItem.clientName}</h4>
                              {isOverdue && <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 inline-block mr-1" />}
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center mb-1">
                              <Info size={14} className="mr-1.5 text-primary" />
                              {orderItem.status === 'Programada' ? 'Visita Programada' : `Acción: ${orderItem.nextActionType}`}
                              {orderItem.status !== 'Programada' && orderItem.nextActionType === 'Opción personalizada' && orderItem.nextActionCustom && (
                                <span className="ml-1">- "{orderItem.nextActionCustom}"</span>
                              )}
                            </p>
                            {teamMemberDisplay && (
                              <p className="text-xs text-muted-foreground flex items-center mb-1">
                                <User size={14} className="mr-1.5 text-primary" />
                                Responsable(s): {teamMemberDisplay}
                              </p>
                            )}
                            <div className="flex justify-between items-center mt-1.5">
                              <StatusBadge type="order" status={orderItem.status} className="text-xs" />
                              {orderItem.visitDate && isValid(parseISO(orderItem.visitDate)) &&
                                <span className="text-xs text-muted-foreground">
                                    Fecha Original Visita: {format(parseISO(orderItem.visitDate), "dd/MM/yy", {locale: es})}
                                </span>
                              }
                            </div>
                            {orderItem.notes && (
                                <p className="text-xs text-muted-foreground mt-2 pt-1 border-t border-border/50" title={orderItem.notes}>
                                  <span className="font-medium">{(orderItem.status === 'Programada' && orderItem.notes) ? "Objetivo/Comentarios:" : "Notas visita:"}</span> {orderItem.notes.length > 70 ? orderItem.notes.substring(0, 70) + "..." : orderItem.notes}
                                </p>
                            )}
                            {(orderItem.status === 'Programada' || orderItem.status === 'Seguimiento' || orderItem.status === 'Fallido') && (userRole === 'Admin' || (userRole === 'SalesRep' && orderItem.salesRep === teamMember?.name) || (userRole === 'Clavadista' && orderItem.clavadistaId === teamMember?.id)) && (
                              <Button asChild size="sm" className="mt-3 w-full">
                                <Link href={`/order-form?originatingTaskId=${orderItem.id}`}>
                                  <Send className="mr-2 h-4 w-4" /> Registrar Resultado de Interacción
                                </Link>
                              </Button>
                            )}
                          </>
                        )}
                        {eventItem && (
                          <>
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-semibold text-sm">{eventItem.name}</h4>
                              <StatusBadge type="event" status={(eventItem.rawItem as CrmEvent).status as CrmEventStatus} />
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center mb-1">
                              <PartyPopper size={14} className="mr-1.5 text-primary" />
                              Tipo: {eventItem.type}
                            </p>
                            {eventItem.location && (
                              <p className="text-xs text-muted-foreground mb-1">Ubicación: {eventItem.location}</p>
                            )}
                            {eventItem.endDate && isValid(parseISO(eventItem.endDate)) && format(parseISO(eventItem.endDate), "yyyy-MM-dd") !== format(item.itemDate, "yyyy-MM-dd") && (
                                <p className="text-xs text-muted-foreground mb-1">
                                  Finaliza: {format(parseISO(eventItem.endDate), "dd/MM/yy", { locale: es })}
                                </p>
                              )}
                            {teamMemberDisplay && (
                              <p className="text-xs text-muted-foreground flex items-center mb-1">
                                <UsersIcon size={14} className="mr-1.5 text-primary" />
                                Responsables: {teamMemberDisplay}
                              </p>
                            )}
                            {eventItem.description && (
                                <p className="text-xs text-muted-foreground mt-2 pt-1 border-t border-border/50" title={eventItem.description}>
                                  <span className="font-medium">Desc:</span> {eventItem.description.length > 70 ? eventItem.description.substring(0, 70) + "..." : eventItem.description}
                                </p>
                            )}
                            <Button asChild size="sm" variant="outline" className="mt-3 w-full">
                                <Link href={`/events?viewEventId=${eventItem.id}`}>
                                  <Info className="mr-2 h-4 w-4" /> Ver Detalles del Evento
                                </Link>
                            </Button>
                          </>
                        )}
                      </li>
                    );})}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground text-center pt-10">
                    Selecciona un día en el calendario para ver tus actividades programadas. Si has aplicado filtros, asegúrate de que haya tareas o eventos que coincidan.
                  </p>
                )}
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    