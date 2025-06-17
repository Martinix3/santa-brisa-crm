
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input"; 
import type { Order, NextActionType, TeamMember, UserRole, OrderStatus } from "@/types";
import { mockOrders, nextActionTypeList, mockTeamMembers } from "@/lib/data";
import { Filter, CalendarDays, ClipboardList, ChevronDown, Edit2, AlertTriangle } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, addDays, isValid, isBefore, startOfDay, isEqual, subDays } from "date-fns";
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import StatusBadge from "@/components/app/status-badge";
import { useToast } from "@/hooks/use-toast";

export default function CrmFollowUpPage() {
  const { userRole, teamMember } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState(""); 
  
  const [salesRepFilter, setSalesRepFilter] = React.useState<string>(() => {
    if (userRole === 'SalesRep' && teamMember) {
      return teamMember.name;
    }
    return "Todos";
  });

  const [actionTypeFilter, setActionTypeFilter] = React.useState<NextActionType | "Todos" | "Visita Programada">("Todos");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);

  const [popoverOpenItemId, setPopoverOpenItemId] = React.useState<string | null>(null);
  const [selectedNewDate, setSelectedNewDate] = React.useState<Date | undefined>(undefined);

  const [followUps, setFollowUps] = React.useState<Order[]>(() =>
    mockOrders.filter(order =>
      // Include items requiring follow-up, failed items with a next action, or programmed visits.
      ((order.status === 'Seguimiento' || order.status === 'Fallido') && order.nextActionDate) ||
      (order.status === 'Programada') 
    )
  );

  const salesRepsForFilter = React.useMemo(() => {
    const reps = new Set(mockTeamMembers
        .filter(m => m.role === 'SalesRep' || m.role === 'Admin')
        .map(m => m.name)
    );
    return ["Todos", ...Array.from(reps)];
  }, []);
  
  const uniqueActionTypesForFilter = ["Todos", ...nextActionTypeList, "Visita Programada"] as (NextActionType | "Todos" | "Visita Programada")[];

  const filteredFollowUps = React.useMemo(() => {
    const todayForFilter = startOfDay(new Date());
    return followUps
      .filter(followUp => {
        if (userRole === 'SalesRep' && teamMember) {
          return followUp.salesRep === teamMember.name;
        }
        if (userRole === 'Admin') {
          return salesRepFilter === "Todos" || followUp.salesRep === salesRepFilter;
        }
        return false; 
      })
      .filter(followUp => {
        if (actionTypeFilter === "Todos") return true;
        if (actionTypeFilter === "Visita Programada") return followUp.status === "Programada";
        return followUp.nextActionType === actionTypeFilter && followUp.status !== "Programada";
      })
      .filter(followUp => {
        if (!dateRange?.from) return true; 
        const dateToCheck = followUp.status === 'Programada' ? followUp.visitDate : followUp.nextActionDate;
        if (!dateToCheck) return true; // If no date, don't filter out by date range
        
        const relevantDateParsed = parseISO(dateToCheck);
        if (!isValid(relevantDateParsed)) return true;

        const fromDate = dateRange.from;
        const toDate = dateRange.to ? addDays(dateRange.to, 1) : addDays(todayForFilter, 10000) ; 
        return relevantDateParsed >= fromDate && relevantDateParsed < toDate;
      })
      .filter(followUp => 
        followUp.clientName.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [followUps, userRole, teamMember, salesRepFilter, actionTypeFilter, dateRange, searchTerm]);

  const handleSaveNewDate = (followUpId: string) => {
    if (!selectedNewDate) return;

    const itemToUpdate = followUps.find(f => f.id === followUpId);
    if (!itemToUpdate) {
        toast({ title: "Error", description: "No se encontró la tarea para actualizar.", variant: "destructive" });
        return;
    }
    
    const isProgrammedItem = itemToUpdate.status === 'Programada';
    const dateFieldToUpdateKey = isProgrammedItem ? 'visitDate' : 'nextActionDate';

    const updatedFollowUps = followUps.map(item => {
      if (item.id === followUpId) {
        return { ...item, [dateFieldToUpdateKey]: format(selectedNewDate, "yyyy-MM-dd") };
      }
      return item;
    });
    setFollowUps(updatedFollowUps);

    const mockOrderIndex = mockOrders.findIndex(order => order.id === followUpId);
    if (mockOrderIndex !== -1) {
       // Directly update the specific date field in mockOrders
      (mockOrders[mockOrderIndex] as any)[dateFieldToUpdateKey] = format(selectedNewDate, "yyyy-MM-dd");
      mockOrders[mockOrderIndex].lastUpdated = format(new Date(), "yyyy-MM-dd");
    }
    
    const followUpClientName = itemToUpdate?.clientName;
    toast({
      title: "Fecha Actualizada",
      description: `La fecha para "${followUpClientName}" ha sido actualizada a ${format(selectedNewDate, "dd/MM/yyyy", { locale: es })}.`,
    });

    setPopoverOpenItemId(null);
    setSelectedNewDate(undefined);
  };

  if (userRole !== 'Admin' && userRole !== 'SalesRep') {
     return (
      <Card>
        <CardHeader><CardTitle>Acceso Denegado</CardTitle></CardHeader>
        <CardContent><p>No tienes permisos para ver esta sección.</p></CardContent>
      </Card>
    );
  }
  
  const pageDescription = userRole === 'Admin'
    ? "Visitas y seguimientos planificados. Puede editar la fecha de próxima acción/visita y ver tareas vencidas."
    : "Tus visitas y seguimientos planificados. Puedes editar la fecha de próxima acción/visita y ver tareas vencidas.";

  const today = startOfDay(new Date());

  return (
    <div className="space-y-6">
      <header className="flex items-center space-x-2">
        <ClipboardList className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline font-semibold">Panel de Tareas de Seguimiento</h1>
      </header>

      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Tareas de Seguimiento y Visitas Programadas</CardTitle>
          <CardDescription>{pageDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <Input
              placeholder="Buscar por cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            {userRole === 'Admin' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Filter className="mr-2 h-4 w-4" />
                    Comercial: {salesRepFilter} <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {salesRepsForFilter.map(rep => (
                    <DropdownMenuCheckboxItem
                      key={rep}
                      checked={salesRepFilter === rep}
                      onCheckedChange={() => setSalesRepFilter(rep)}
                    >
                      {rep}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Filter className="mr-2 h-4 w-4" />
                  Tipo Tarea: {actionTypeFilter === "Visita Programada" ? "Visita Programada" : actionTypeFilter} <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {uniqueActionTypesForFilter.map(action => (
                   <DropdownMenuCheckboxItem
                    key={action}
                    checked={actionTypeFilter === action}
                    onCheckedChange={() => setActionTypeFilter(action)}
                  >
                    {action}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full sm:w-[280px] justify-start text-left font-normal", 
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y", { locale: es })} -{" "}
                        {format(dateRange.to, "LLL dd, y", { locale: es })}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y", { locale: es })
                    )
                  ) : (
                    <span>Fecha Próxima Acción/Visita</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[20%]">Cliente</TableHead>
                  <TableHead className="w-[15%]">Próxima Acción / Tipo Visita</TableHead>
                  <TableHead className="w-[15%]">Fecha Próx. Acción / Visita</TableHead>
                  {userRole === 'Admin' && <TableHead className="w-[15%]">Comercial</TableHead>}
                  <TableHead className="w-[10%] text-center">Estado Tarea</TableHead>
                  <TableHead className="w-[15%]">Notas / Obj. Visita Original</TableHead>
                  <TableHead className="w-[10%]">Fecha Visita Original</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFollowUps.length > 0 ? filteredFollowUps.map((item: Order) => {
                  const canEditDate = userRole === 'Admin' || (userRole === 'SalesRep' && teamMember?.name === item.salesRep);
                  
                  const isProgrammedItem = item.status === 'Programada';
                  const relevantActionDateString = isProgrammedItem ? item.visitDate : item.nextActionDate;
                  const relevantActionDateParsed = relevantActionDateString ? parseISO(relevantActionDateString) : null;
                  
                  const isOverdue = relevantActionDateParsed && isBefore(relevantActionDateParsed, today) && (item.status === 'Seguimiento' || item.status === 'Programada');

                  return (
                  <TableRow key={item.id} className={cn(isOverdue && "bg-yellow-100 dark:bg-yellow-800/30")}>
                    <TableCell className="font-medium">
                        {isOverdue && <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 inline-block mr-1" />}
                        {item.clientName}
                    </TableCell>
                     <TableCell>
                        {isProgrammedItem ? "Visita Programada" : item.nextActionType}
                        {item.nextActionType === "Opción personalizada" && item.nextActionCustom && !isProgrammedItem && (
                            <span className="text-xs text-muted-foreground block ml-2">- {item.nextActionCustom}</span>
                        )}
                    </TableCell>
                    <TableCell className="flex items-center space-x-1 py-3">
                      <span className={cn(isOverdue && "font-semibold")}>
                        {relevantActionDateParsed && isValid(relevantActionDateParsed) ? format(relevantActionDateParsed, "dd/MM/yy", { locale: es }) : 'N/D'}
                      </span>
                      {canEditDate && (
                        <Popover
                          open={popoverOpenItemId === item.id}
                          onOpenChange={(isOpen) => {
                            if (!isOpen) {
                              setPopoverOpenItemId(null);
                              setSelectedNewDate(undefined);
                            } else {
                               setSelectedNewDate(relevantActionDateParsed || new Date());
                               setPopoverOpenItemId(item.id);
                            }
                          }}
                        >
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={selectedNewDate || relevantActionDateParsed}
                              onSelect={setSelectedNewDate}
                              initialFocus
                              disabled={(date) => date < subDays(new Date(),1) && !isEqual(date, subDays(new Date(),1))} 
                              locale={es}
                            />
                            <div className="p-2 border-t flex justify-end space-x-2">
                              <Button variant="outline" size="sm" onClick={() => { setPopoverOpenItemId(null); setSelectedNewDate(undefined); }}>Cancelar</Button>
                              <Button size="sm" onClick={() => handleSaveNewDate(item.id)} disabled={!selectedNewDate}>Guardar Fecha</Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </TableCell>
                    {userRole === 'Admin' && <TableCell>{item.salesRep}</TableCell>}
                    <TableCell className="text-center">
                       <StatusBadge type="order" status={item.status} />
                    </TableCell>
                    <TableCell className="text-xs truncate max-w-[150px]" title={item.notes}>
                        {item.notes || 'N/D'}
                    </TableCell>
                    <TableCell>{item.visitDate && item.status !== 'Programada' ? format(parseISO(item.visitDate), "dd/MM/yy", { locale: es }) : (isProgrammedItem ? "-" : "N/D")}</TableCell>
                  </TableRow>
                )}) : (
                  <TableRow>
                    <TableCell colSpan={userRole === 'Admin' ? 7 : 6} className="h-24 text-center">
                      No hay tareas de seguimiento que coincidan con los filtros.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
         {filteredFollowUps.length > 0 && (
            <CardFooter>
                <p className="text-xs text-muted-foreground">Mostrando {filteredFollowUps.length} tareas de seguimiento y/o visitas programadas.</p>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
