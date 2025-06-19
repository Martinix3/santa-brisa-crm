
"use client";

import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import type { Order, CrmEvent, CrmEventStatus } from "@/types"; // Removed TeamMember, OrderStatus, NextActionType as direct imports if not used
import { mockTeamMembers, mockCrmEvents } from "@/lib/data"; // mockOrders removed
import { parseISO, format, isEqual, startOfDay, isSameMonth, isWithinInterval, addDays, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarCheck, User, Info, Filter, PartyPopper, Users as UsersIcon, Send, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/app/status-badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getOrdersFS } from "@/services/order-service";
import { useToast } from "@/hooks/use-toast";


interface AgendaItemBase {
  id: string;
  itemDate: Date;
  displayTime?: string;
  sourceType: 'order' | 'event';
}
interface AgendaOrderItem extends Order, AgendaItemBase {
  sourceType: 'order';
}
interface AgendaCrmEventItem extends CrmEvent, AgendaItemBase {
  sourceType: 'event';
}
type AgendaItem = AgendaOrderItem | AgendaCrmEventItem;

const simplifiedActionTypeOptions = ["Todos", "Acciones de Seguimiento", "Eventos"] as const;
type SimplifiedActionFilterType = typeof simplifiedActionTypeOptions[number];


export default function AgendaPage() {
  const { userRole, teamMember } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date());
  const [selectedSalesRep, setSelectedSalesRep] = React.useState<string>("Todos");
  const [actionTypeFilter, setActionTypeFilter] = React.useState<SimplifiedActionFilterType>("Todos");
  const [agendaItems, setAgendaItems] = React.useState<AgendaItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);


  const salesRepsList = React.useMemo(() => {
    return ["Todos", ...mockTeamMembers.filter(m => m.role === 'SalesRep' || m.role === 'Admin').map(m => m.name)];
  }, []);

  React.useEffect(() => {
    async function loadAgendaData() {
      setIsLoading(true);
      let fetchedOrderItems: AgendaOrderItem[] = [];
      let fetchedEventItems: AgendaCrmEventItem[] = [];

      try {
        if (actionTypeFilter === "Todos" || actionTypeFilter === "Acciones de Seguimiento") {
          const ordersFromFS = await getOrdersFS();
          fetchedOrderItems = ordersFromFS
            .filter(order =>
              (order.status === 'Seguimiento' || order.status === 'Fallido' || order.status === 'Programada') &&
              (order.status === 'Programada' ? order.visitDate : order.nextActionDate) &&
              isValid(parseISO(order.status === 'Programada' ? order.visitDate! : order.nextActionDate!)) &&
              (userRole === 'Admin' ? (selectedSalesRep === "Todos" || order.salesRep === selectedSalesRep) : order.salesRep === teamMember?.name)
            )
            .map(order => ({
              ...order,
              itemDate: parseISO(order.status === 'Programada' ? order.visitDate! : order.nextActionDate!),
              sourceType: 'order' as 'order',
            }));
        }

        if (actionTypeFilter === "Todos" || actionTypeFilter === "Eventos") {
          // Events are still from mockCrmEvents
          fetchedEventItems = mockCrmEvents
            .filter(event =>
              isValid(parseISO(event.startDate)) &&
              (userRole === 'Admin' ?
                (selectedSalesRep === "Todos" || event.assignedTeamMemberIds.includes(mockTeamMembers.find(m=>m.name === selectedSalesRep)?.id || ''))
                : (teamMember && event.assignedTeamMemberIds.includes(teamMember.id)))
            )
            .map(event => ({
              ...event,
              itemDate: parseISO(event.startDate),
              sourceType: 'event' as 'event',
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
    loadAgendaData();
  }, [userRole, teamMember, selectedSalesRep, actionTypeFilter, toast]);


  const itemsForSelectedDay = React.useMemo(() => {
    if (!selectedDate) return [];
    return agendaItems.filter(item => {
        if (item.sourceType === 'event' && (item as AgendaCrmEventItem).endDate && isValid(parseISO((item as AgendaCrmEventItem).endDate!))) {
             return isWithinInterval(startOfDay(selectedDate), {
                start: startOfDay(item.itemDate),
                end: startOfDay(parseISO((item as AgendaCrmEventItem).endDate!))
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
        datesWithItems.add(format(item.itemDate, "yyyy-MM-dd"));
        if (item.sourceType === 'event' && (item as AgendaCrmEventItem).endDate && isValid(parseISO((item as AgendaCrmEventItem).endDate!))) {
            let currentDateIterator = item.itemDate;
            const stopDate = parseISO((item as AgendaCrmEventItem).endDate!);
            while(currentDateIterator <= stopDate) {
                datesWithItems.add(format(currentDateIterator, "yyyy-MM-dd"));
                currentDateIterator = addDays(currentDateIterator, 1);
            }
        }
    });
    return Array.from(datesWithItems).map(dateStr => parseISO(dateStr));
  }, [itemsInCurrentMonth]);

  const modifiers = {
    highlighted: highlightedDaysModifier,
    selected: selectedDate ? [selectedDate] : [],
  };

  const modifiersClassNames = {
    highlighted: 'bg-primary/20 rounded-full font-bold',
    selected: 'bg-primary text-primary-foreground rounded-full',
  };

  if (userRole !== 'Admin' && userRole !== 'SalesRep') {
     return (
      <Card>
        <CardHeader><CardTitle>Acceso Denegado</CardTitle></CardHeader>
        <CardContent><p>No tienes permisos para ver esta sección.</p></CardContent>
      </Card>
    );
  }
  
  const pageTitle = userRole === 'Admin' ? "Agenda del Equipo" : "Mi Agenda Personal";

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
            {userRole === 'Admin' && (
              <div className="w-full sm:w-auto flex-grow sm:flex-grow-0">
                <Label htmlFor="salesRepFilterAgenda">Comercial</Label>
                <Select value={selectedSalesRep} onValueChange={setSelectedSalesRep}>
                    <SelectTrigger id="salesRepFilterAgenda" className="w-full sm:w-[200px] mt-1">
                    <SelectValue placeholder="Filtrar por comercial" />
                    </SelectTrigger>
                    <SelectContent>
                    {salesRepsList.map(rep => (
                        <SelectItem key={rep} value={rep}>{rep}</SelectItem>
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
                      const orderItem = item.sourceType === 'order' ? item as AgendaOrderItem : null;
                      const eventItem = item.sourceType === 'event' ? item as AgendaCrmEventItem : null;
                      const isOverdue = orderItem && (orderItem.status === 'Programada' || orderItem.status === 'Seguimiento') && isValid(item.itemDate) && isBefore(item.itemDate, startOfDay(new Date()));


                      return (
                      <li key={item.id} className={cn("p-3 bg-secondary/30 rounded-md shadow-sm", isOverdue && "border-l-4 border-yellow-500")}>
                        {orderItem && (
                          <>
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-semibold text-sm">{orderItem.clientName}</h4>
                              {isOverdue && <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />}
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center mb-1">
                              <Info size={14} className="mr-1.5 text-primary" />
                              {orderItem.status === 'Programada' ? 'Visita Programada' : `Acción: ${orderItem.nextActionType}`}
                              {orderItem.status !== 'Programada' && orderItem.nextActionType === 'Opción personalizada' && orderItem.nextActionCustom && (
                                <span className="ml-1">- "{orderItem.nextActionCustom}"</span>
                              )}
                            </p>
                            {(userRole === 'Admin' && orderItem.salesRep && selectedSalesRep === "Todos") && (
                              <p className="text-xs text-muted-foreground flex items-center mb-1">
                                <User size={14} className="mr-1.5 text-primary" />
                                Comercial: {orderItem.salesRep}
                              </p>
                            )}
                            <div className="flex justify-between items-center mt-1.5">
                              <StatusBadge type="order" status={orderItem.status} className="text-xs" />
                              {isValid(parseISO(orderItem.visitDate)) && 
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
                            {(orderItem.status === 'Programada' || orderItem.status === 'Seguimiento' || orderItem.status === 'Fallido') && (
                              <Button asChild size="sm" className="mt-3 w-full">
                                <Link href={`/order-form?updateVisitId=${orderItem.id}`}>
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
                            {(userRole === 'Admin' && selectedSalesRep === "Todos" && eventItem.assignedTeamMemberIds.length > 0) && (
                              <p className="text-xs text-muted-foreground flex items-center mb-1">
                                <UsersIcon size={14} className="mr-1.5 text-primary" />
                                Responsables: {eventItem.assignedTeamMemberIds.map(id => mockTeamMembers.find(m=>m.id===id)?.name).join(', ')}
                              </p>
                            )}
                            {eventItem.description && (
                                <p className="text-xs text-muted-foreground mt-2 pt-1 border-t border-border/50" title={eventItem.description}>
                                  <span className="font-medium">Desc:</span> {eventItem.description.length > 70 ? eventItem.description.substring(0, 70) + "..." : eventItem.description}
                                </p>
                            )}
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
