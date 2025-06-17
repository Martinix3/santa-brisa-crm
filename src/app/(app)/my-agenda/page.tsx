
"use client";

import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import type { Order, TeamMember, OrderStatus, NextActionType } from "@/types";
import { mockOrders, mockTeamMembers, nextActionTypeList } from "@/lib/data";
import { parseISO, format, isEqual, startOfDay, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarCheck, User, Info, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormLabel } from "@/components/ui/form";


interface AgendaEvent extends Order {
  eventDate: Date;
}

const getStatusBadgeColor = (status: OrderStatus): string => {
  switch (status) {
    case 'Entregado': return 'bg-green-500 hover:bg-green-600 text-white';
    case 'Confirmado': return 'bg-[hsl(var(--brand-turquoise-hsl))] hover:brightness-90 text-white';
    case 'Enviado': return 'bg-purple-500 hover:bg-purple-600 text-white';
    case 'Pendiente': return 'bg-yellow-400 hover:bg-yellow-500 text-black';
    case 'Procesando': return 'bg-orange-400 hover:bg-orange-500 text-black';
    case 'Cancelado':
    case 'Fallido': return 'bg-red-500 hover:bg-red-600 text-white';
    case 'Seguimiento': return 'bg-blue-500 hover:bg-blue-600 text-white';
    default: return 'bg-gray-400 hover:bg-gray-500 text-white';
  }
};

export default function AgendaPage() {
  const { userRole, teamMember } = useAuth();
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date());
  const [selectedSalesRep, setSelectedSalesRep] = React.useState<string>("Todos");
  const [actionTypeFilter, setActionTypeFilter] = React.useState<NextActionType | "Todos">("Todos");

  const salesRepsList = React.useMemo(() => {
    return ["Todos", ...mockTeamMembers.filter(m => m.role === 'SalesRep' || m.role === 'Admin').map(m => m.name)];
  }, []);

  const uniqueActionTypesForFilter = ["Todos", ...nextActionTypeList] as (NextActionType | "Todos")[];

  const agendaEvents = React.useMemo<AgendaEvent[]>(() => {
    return mockOrders
      .filter(order => 
        (order.status === 'Seguimiento' || order.status === 'Fallido') && 
        order.nextActionDate &&
        (userRole === 'Admin' ? (selectedSalesRep === "Todos" || order.salesRep === selectedSalesRep) : order.salesRep === teamMember?.name) &&
        (actionTypeFilter === "Todos" || order.nextActionType === actionTypeFilter)
      )
      .map(order => ({
        ...order,
        eventDate: parseISO(order.nextActionDate!),
      }))
      .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
  }, [userRole, teamMember, selectedSalesRep, actionTypeFilter]);

  const eventsForSelectedDay = React.useMemo(() => {
    if (!selectedDate) return [];
    return agendaEvents.filter(event => 
      isEqual(startOfDay(event.eventDate), startOfDay(selectedDate))
    );
  }, [selectedDate, agendaEvents]);

  const eventsInCurrentMonth = React.useMemo(() => {
    return agendaEvents.filter(event => isSameMonth(event.eventDate, currentMonth));
  }, [currentMonth, agendaEvents]);

  const highlightedDaysModifier = React.useMemo(() => {
    const datesWithEvents = new Set(eventsInCurrentMonth.map(event => format(event.eventDate, "yyyy-MM-dd")));
    return Array.from(datesWithEvents).map(dateStr => parseISO(dateStr));
  }, [eventsInCurrentMonth]);

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
          <h1 className="text-3xl font-headline font-semibold">Agenda de Acciones</h1>
      </header>

      <Card className="shadow-subtle">
        <CardHeader>
            <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-xl">Filtros de Agenda</CardTitle>
            </div>
            <CardDescription>Ajusta los filtros para refinar las acciones mostradas en el calendario y la lista.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 items-end">
            {userRole === 'Admin' && (
              <div className="w-full sm:w-auto flex-grow sm:flex-grow-0">
                <FormLabel htmlFor="salesRepFilterAgenda">Comercial</FormLabel>
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
               <FormLabel htmlFor="actionTypeFilterAgenda">Tipo de Acción</FormLabel>
               <Select value={actionTypeFilter} onValueChange={(value) => setActionTypeFilter(value as NextActionType | "Todos")}>
                <SelectTrigger id="actionTypeFilterAgenda" className="w-full sm:w-[240px] mt-1">
                    <SelectValue placeholder="Filtrar por tipo de acción" />
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
                <CardTitle>Calendario de Acciones</CardTitle>
                <CardDescription>Selecciona un día para ver las acciones programadas. Los días con acciones están resaltados.</CardDescription>
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
              Acciones para {selectedDate ? format(selectedDate, "PPP", { locale: es }) : "Hoy"}
            </CardTitle>
            <CardDescription>
                {eventsForSelectedDay.length > 0 
                    ? `Tienes ${eventsForSelectedDay.length} acción(es) programada(s).`
                    : "No hay acciones programadas para este día."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] pr-3">
              {eventsForSelectedDay.length > 0 ? (
                <ul className="space-y-3">
                  {eventsForSelectedDay.map(event => (
                    <li key={event.id} className="p-3 bg-secondary/30 rounded-md shadow-sm">
                      <h4 className="font-semibold text-sm mb-1">{event.clientName}</h4>
                      <p className="text-xs text-muted-foreground flex items-center mb-1">
                        <Info size={14} className="mr-1.5 text-primary" />
                        Acción: {event.nextActionType}
                        {event.nextActionType === 'Opción personalizada' && event.nextActionCustom && (
                          <span className="ml-1">- "{event.nextActionCustom}"</span>
                        )}
                      </p>
                      {userRole === 'Admin' && event.salesRep && selectedSalesRep === "Todos" && ( // Show only if "Todos" is selected or if filtering by specific rep
                        <p className="text-xs text-muted-foreground flex items-center mb-1">
                          <User size={14} className="mr-1.5 text-primary" />
                          Comercial: {event.salesRep}
                        </p>
                      )}
                       {(userRole === 'Admin' && selectedSalesRep !== "Todos" && event.salesRep === selectedSalesRep) && (
                         <p className="text-xs text-muted-foreground flex items-center mb-1">
                            <User size={14} className="mr-1.5 text-primary" />
                            Comercial: {event.salesRep}
                        </p>
                       )}
                      <div className="flex justify-between items-center mt-1.5">
                        <Badge variant="outline" className="text-xs">
                            Visita original: {format(parseISO(event.visitDate), "dd/MM/yy")}
                        </Badge>
                        <Badge className={cn("text-xs", getStatusBadgeColor(event.status))}>
                          {event.status}
                        </Badge>
                      </div>
                       {event.notes && (
                           <p className="text-xs text-muted-foreground mt-2 pt-1 border-t border-border/50">
                            <span className="font-medium">Notas visita:</span> {event.notes.length > 70 ? event.notes.substring(0, 70) + "..." : event.notes}
                           </p>
                       )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground text-center pt-10">
                  Selecciona un día en el calendario para ver las acciones programadas o asegúrate de tener acciones con fecha de seguimiento que coincidan con los filtros.
                </p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
