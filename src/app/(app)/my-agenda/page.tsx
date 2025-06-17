
"use client";

import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import type { Order, TeamMember, OrderStatus, NextActionType, CrmEvent } from "@/types";
import { mockOrders, mockTeamMembers, nextActionTypeList, mockCrmEvents } from "@/lib/data";
import { parseISO, format, isEqual, startOfDay, isSameMonth, isWithinInterval, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarCheck, User, Info, Filter, PartyPopper, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface AgendaItemBase {
  id: string;
  itemDate: Date;
  displayTime?: string; 
  sourceType: 'order' | 'event';
}
interface AgendaOrderItem extends Order, AgendaItemBase {
  sourceType: 'order';
  // Order specific fields are already in Order
}
interface AgendaCrmEventItem extends CrmEvent, AgendaItemBase {
  sourceType: 'event';
  // CrmEvent specific fields are already in CrmEvent
}
type AgendaItem = AgendaOrderItem | AgendaCrmEventItem;


const getStatusBadgeColor = (status: OrderStatus | CrmEvent['status']): string => {
  // Order statuses
  if (['Entregado'].includes(status)) return 'bg-green-500 hover:bg-green-600 text-white';
  if (status === 'Confirmado' && !crmEventStatusList.includes(status as CrmEventStatus) ) return 'bg-[hsl(var(--brand-turquoise-hsl))] hover:brightness-90 text-white'; 
  if (['Enviado'].includes(status)) return 'bg-purple-500 hover:bg-purple-600 text-white'; 
  if (['Pendiente'].includes(status)) return 'bg-yellow-400 hover:bg-yellow-500 text-black'; 
  if (['Procesando'].includes(status)) return 'bg-orange-400 hover:bg-orange-500 text-black'; 
  if (['Cancelado', 'Fallido'].includes(status)) return 'bg-red-500 hover:bg-red-600 text-white';
  if (['Seguimiento'].includes(status)) return 'bg-blue-500 hover:bg-blue-600 text-white'; 

  // Event statuses 
  if (status === 'Confirmado' && crmEventStatusList.includes(status as CrmEventStatus)) return 'bg-blue-500 hover:bg-blue-600 text-white'; 
  if (status === 'Planificado') return 'bg-yellow-400 hover:bg-yellow-500 text-black';
  if (status === 'En Curso') return 'bg-purple-500 hover:bg-purple-600 text-white';
  if (status === 'Completado') return 'bg-green-500 hover:bg-green-600 text-white';
  if (status === 'Pospuesto') return 'bg-orange-400 hover:bg-orange-500 text-black';
  
  return 'bg-gray-400 hover:bg-gray-500 text-white'; // Default
};


export default function AgendaPage() {
  const { userRole, teamMember } = useAuth();
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date());
  const [selectedSalesRep, setSelectedSalesRep] = React.useState<string>("Todos");
  const [actionTypeFilter, setActionTypeFilter] = React.useState<NextActionType | "Todos" | "Evento">("Todos");

  const salesRepsList = React.useMemo(() => {
    return ["Todos", ...mockTeamMembers.filter(m => m.role === 'SalesRep' || m.role === 'Admin').map(m => m.name)];
  }, []);

  const uniqueActionTypesForFilter = ["Todos", ...nextActionTypeList, "Evento"] as (NextActionType | "Todos" | "Evento")[];

  const agendaItems = React.useMemo<AgendaItem[]>(() => {
    const orderFollowUps: AgendaOrderItem[] = mockOrders
      .filter(order => 
        (order.status === 'Seguimiento' || order.status === 'Fallido') && 
        order.nextActionDate &&
        (userRole === 'Admin' ? (selectedSalesRep === "Todos" || order.salesRep === selectedSalesRep) : order.salesRep === teamMember?.name) &&
        (actionTypeFilter === "Todos" || actionTypeFilter === order.nextActionType)
      )
      .map(order => ({
        ...order,
        itemDate: parseISO(order.nextActionDate!),
        sourceType: 'order',
      }));

    const crmEvents: AgendaCrmEventItem[] = mockCrmEvents
      .filter(event =>
        (userRole === 'Admin' ? 
          (selectedSalesRep === "Todos" || event.assignedTeamMemberIds.includes(mockTeamMembers.find(m=>m.name === selectedSalesRep)?.id || '')) 
          : (teamMember && event.assignedTeamMemberIds.includes(teamMember.id))) &&
        (actionTypeFilter === "Todos" || actionTypeFilter === "Evento") // Filter by "Evento" if selected
      )
      .map(event => ({
        ...event,
        itemDate: parseISO(event.startDate),
        sourceType: 'event',
      }));
      
    return [...orderFollowUps, ...crmEvents].sort((a, b) => a.itemDate.getTime() - b.itemDate.getTime());
  }, [userRole, teamMember, selectedSalesRep, actionTypeFilter]);


  const itemsForSelectedDay = React.useMemo(() => {
    if (!selectedDate) return [];
    return agendaItems.filter(item => {
        if (item.sourceType === 'event' && item.endDate) {
             return isWithinInterval(startOfDay(selectedDate), {
                start: startOfDay(item.itemDate),
                end: startOfDay(parseISO(item.endDate))
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
        if (item.sourceType === 'event' && item.endDate) {
            let currentDate = item.itemDate;
            const stopDate = parseISO(item.endDate);
            while(currentDate <= stopDate) {
                datesWithItems.add(format(currentDate, "yyyy-MM-dd"));
                currentDate = addDays(currentDate, 1);
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

  return (
    <div className="space-y-6">
      <header className="flex items-center space-x-2">
          <CalendarCheck className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-headline font-semibold">Agenda de Acciones y Eventos</h1>
      </header>

      <Card className="shadow-subtle">
        <CardHeader>
            <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-xl">Filtros de Agenda</CardTitle>
            </div>
            <CardDescription>Ajusta los filtros para refinar las acciones y eventos mostrados.</CardDescription>
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
               <Select value={actionTypeFilter} onValueChange={(value) => setActionTypeFilter(value as NextActionType | "Todos" | "Evento")}>
                <SelectTrigger id="actionTypeFilterAgenda" className="w-full sm:w-[240px] mt-1">
                    <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                    {uniqueActionTypesForFilter.map(action => (
                    <SelectItem key={action} value={action}>{action}</SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
        </CardContent>
      </Card>


      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 shadow-subtle hover:shadow-md transition-shadow duration-300">
            <CardHeader>
                <CardTitle>Calendario</CardTitle>
                <CardDescription>Selecciona un día para ver detalles. Los días con actividades están resaltados.</CardDescription>
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

        <Card className="md:col-span-1 shadow-subtle hover:shadow-md transition-shadow duration-300">
          <CardHeader>
            <CardTitle>
              Actividades para {selectedDate ? format(selectedDate, "PPP", { locale: es }) : "Hoy"}
            </CardTitle>
            <CardDescription>
                {itemsForSelectedDay.length > 0 
                    ? `Tienes ${itemsForSelectedDay.length} actividad(es) programada(s).`
                    : "No hay actividades programadas para este día."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-3">
              {itemsForSelectedDay.length > 0 ? (
                <ul className="space-y-3">
                  {itemsForSelectedDay.map(item => (
                    <li key={item.id} className="p-3 bg-secondary/30 rounded-md shadow-sm">
                      {item.sourceType === 'order' && (
                        <>
                          <h4 className="font-semibold text-sm mb-1">{item.clientName}</h4>
                          <p className="text-xs text-muted-foreground flex items-center mb-1">
                            <Info size={14} className="mr-1.5 text-primary" />
                            Acción: {item.nextActionType}
                            {item.nextActionType === 'Opción personalizada' && item.nextActionCustom && (
                              <span className="ml-1">- "{item.nextActionCustom}"</span>
                            )}
                          </p>
                          {(userRole === 'Admin' && item.salesRep && selectedSalesRep === "Todos") && ( 
                            <p className="text-xs text-muted-foreground flex items-center mb-1">
                              <User size={14} className="mr-1.5 text-primary" />
                              Comercial: {item.salesRep}
                            </p>
                          )}
                          <div className="flex justify-between items-center mt-1.5">
                            <Badge variant="outline" className="text-xs">
                                Visita original: {format(parseISO(item.visitDate), "dd/MM/yy")}
                            </Badge>
                            <Badge className={cn("text-xs", getStatusBadgeColor(item.status))}>
                              {item.status}
                            </Badge>
                          </div>
                          {item.notes && (
                              <p className="text-xs text-muted-foreground mt-2 pt-1 border-t border-border/50">
                                <span className="font-medium">Notas visita:</span> {item.notes.length > 70 ? item.notes.substring(0, 70) + "..." : item.notes}
                              </p>
                          )}
                        </>
                      )}
                      {item.sourceType === 'event' && (
                        <>
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold text-sm">{item.name}</h4>
                            <Badge className={cn("text-xs", getStatusBadgeColor(item.status))}>
                              {item.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center mb-1">
                            <PartyPopper size={14} className="mr-1.5 text-primary" />
                            Tipo: {item.type}
                          </p>
                          {item.location && (
                            <p className="text-xs text-muted-foreground mb-1">Ubicación: {item.location}</p>
                          )}
                          {(userRole === 'Admin' && selectedSalesRep === "Todos" && item.assignedTeamMemberIds.length > 0) && ( 
                            <p className="text-xs text-muted-foreground flex items-center mb-1">
                              <Users size={14} className="mr-1.5 text-primary" />
                              Responsables: {item.assignedTeamMemberIds.map(id => mockTeamMembers.find(m=>m.id===id)?.name).join(', ')}
                            </p>
                          )}
                           {item.description && (
                              <p className="text-xs text-muted-foreground mt-2 pt-1 border-t border-border/50">
                                <span className="font-medium">Desc:</span> {item.description.length > 70 ? item.description.substring(0, 70) + "..." : item.description}
                              </p>
                          )}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground text-center pt-10">
                  Selecciona un día en el calendario para ver las actividades o asegúrate de tener entradas que coincidan con los filtros.
                </p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

