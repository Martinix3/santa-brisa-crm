
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input"; 
import type { Order, NextActionType, TeamMember, UserRole, OrderStatus } from "@/types";
import { nextActionTypeList } from "@/lib/data"; 
import { Filter, CalendarDays, ClipboardList, ChevronDown, Edit2, AlertTriangle, MoreHorizontal, Send, Loader2 } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, addDays, isValid, isBefore, startOfDay, isEqual, subDays } from "date-fns";
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import StatusBadge from "@/components/app/status-badge";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { getOrdersFS, updateOrderFS } from "@/services/order-service";
import { getTeamMembersFS } from "@/services/team-member-service"; 


export default function CrmFollowUpPage() {
  const { userRole, teamMember, loading: authContextLoading } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState(""); 
  const [cityFilter, setCityFilter] = React.useState("");
  
  const [selectedUserFilter, setSelectedUserFilter] = React.useState<string>("Todos");

  const [actionTypeFilter, setActionTypeFilter] = React.useState<NextActionType | "Todos" | "Visita Programada">("Todos");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);

  const [popoverOpenItemId, setPopoverOpenItemId] = React.useState<string | null>(null);
  const [selectedNewDate, setSelectedNewDate] = React.useState<Date | undefined>(undefined);

  const [followUps, setFollowUps] = React.useState<Order[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [teamMembersForFilter, setTeamMembersForFilter] = React.useState<TeamMember[]>([]);


  React.useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      try {
        const [fetchedOrders, fetchedTeamMembers] = await Promise.all([
          getOrdersFS(),
          userRole === 'Admin' ? getTeamMembersFS(['SalesRep', 'Admin', 'Clavadista']) : Promise.resolve([])
        ]);
        
        setFollowUps(
          fetchedOrders.filter(order =>
            ((order.status === 'Seguimiento' || order.status === 'Fallido') && order.nextActionDate) ||
            (order.status === 'Programada') 
          )
        );
        if (userRole === 'Admin') {
          setTeamMembersForFilter(fetchedTeamMembers);
        }

      } catch (error) {
        console.error("Error loading follow-ups or team members:", error);
        toast({ title: "Error al Cargar Datos", description: "No se pudieron cargar las tareas o miembros del equipo.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    
    if (authContextLoading) {
        setIsLoading(true);
        return;
    }
    if ((userRole === 'SalesRep' || userRole === 'Clavadista') && !teamMember) {
        setIsLoading(false);
        setFollowUps([]);
        return;
    }

    loadInitialData();
  }, [toast, userRole, teamMember, authContextLoading]);


  const uniqueActionTypesForFilter = ["Todos", ...nextActionTypeList, "Visita Programada"] as (NextActionType | "Todos" | "Visita Programada")[];

  const filteredFollowUps = React.useMemo(() => {
    const todayForFilter = startOfDay(new Date());
    return followUps
      .filter(followUp => {
        if (userRole === 'SalesRep' && teamMember) {
          return followUp.salesRep === teamMember.name;
        }
        if (userRole === 'Clavadista' && teamMember) {
          return followUp.clavadistaId === teamMember.id; // Filter by clavadistaId
        }
        // Admin filter
        if (userRole === 'Admin') {
            if (selectedUserFilter === "Todos") return true;
            const selectedMember = teamMembersForFilter.find(mem => mem.id === selectedUserFilter);
            if (selectedMember) {
                if (selectedMember.role === 'SalesRep' || selectedMember.role === 'Admin') return selectedMember.name === followUp.salesRep;
                if (selectedMember.role === 'Clavadista') return selectedMember.id === followUp.clavadistaId;
            }
            return false; // If selected member not found, show nothing
        }
        return false; // Should not happen if roles are handled
      })
      .filter(followUp => {
        if (actionTypeFilter === "Todos") return true;
        if (actionTypeFilter === "Visita Programada") return followUp.status === "Programada";
        return followUp.nextActionType === actionTypeFilter && followUp.status !== "Programada";
      })
      .filter(followUp => {
        if (!dateRange?.from) return true; 
        const dateToCheckString = followUp.status === 'Programada' ? followUp.visitDate : followUp.nextActionDate;
        if (!dateToCheckString) return true; 
        
        const relevantDateParsed = parseISO(dateToCheckString);
        if (!isValid(relevantDateParsed)) return true;

        const fromDate = dateRange.from;
        const toDate = dateRange.to ? addDays(dateRange.to, 1) : addDays(todayForFilter, 10000) ; 
        return relevantDateParsed >= fromDate && relevantDateParsed < toDate;
      })
      .filter(followUp => 
        followUp.clientName.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(followUp => {
        if (!cityFilter) return true;
        const cityLower = cityFilter.toLowerCase();
        return (followUp.direccionEntrega && followUp.direccionEntrega.toLowerCase().includes(cityLower)) ||
               (followUp.direccionFiscal && followUp.direccionFiscal.toLowerCase().includes(cityLower));
      });
  }, [followUps, userRole, teamMember, selectedUserFilter, teamMembersForFilter, actionTypeFilter, dateRange, searchTerm, cityFilter]);

  const handleSaveNewDate = async (followUpId: string) => {
    if (!selectedNewDate) return;
    setIsLoading(true); 

    const itemToUpdate = followUps.find(f => f.id === followUpId);
    if (!itemToUpdate) {
        toast({ title: "Error", description: "No se encontró la tarea para actualizar.", variant: "destructive" });
        setIsLoading(false);
        return;
    }
    
    const isProgrammedItem = itemToUpdate.status === 'Programada';
    const dateFieldToUpdateKey = isProgrammedItem ? 'visitDate' : 'nextActionDate';
    const newDateString = format(selectedNewDate, "yyyy-MM-dd");

    try {
      const updatePayload: Partial<Order> = { [dateFieldToUpdateKey]: newDateString, lastUpdated: format(new Date(), "yyyy-MM-dd") };
      await updateOrderFS(followUpId, updatePayload);

      setFollowUps(prev => prev.map(item => 
        item.id === followUpId ? { ...item, ...updatePayload } : item
      ));
      
      toast({
        title: "Fecha Actualizada",
        description: `La fecha para "${itemToUpdate.clientName}" ha sido actualizada a ${format(selectedNewDate, "dd/MM/yyyy", { locale: es })}.`,
      });
    } catch (error) {
      console.error("Error updating follow-up date:", error);
      toast({ title: "Error al Actualizar", description: "No se pudo actualizar la fecha en Firestore.", variant: "destructive"});
    } finally {
      setIsLoading(false);
      setPopoverOpenItemId(null);
      setSelectedNewDate(undefined);
    }
  };

  if (!userRole || (userRole !== 'Admin' && userRole !== 'SalesRep' && userRole !== 'Clavadista')) {
     return (
      <Card>
        <CardHeader><CardTitle>Acceso Denegado</CardTitle></CardHeader>
        <CardContent><p>No tienes permisos para ver esta sección.</p></CardContent>
      </Card>
    );
  }
  
  const pageDescription = userRole === 'Admin'
    ? "Administra todas las visitas y seguimientos planificados. Puedes editar la fecha de próxima acción/visita y ver tareas vencidas."
    : "Revisa y gestiona tus visitas y seguimientos planificados. Puedes editar la fecha de próxima acción/visita y ver tareas vencidas.";

  const today = startOfDay(new Date());
  const canFilterByUserForAdmin = userRole === 'Admin';

  return (
    <div className="space-y-6">
      <header className="flex items-center space-x-2">
        <ClipboardList className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline font-semibold">Panel de Tareas de Seguimiento</h1>
      </header>

      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Panel de Seguimiento y Visitas</CardTitle>
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
            <Input
              placeholder="Filtrar por ciudad..."
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="max-w-xs"
            />
            {canFilterByUserForAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto" disabled={isLoading || teamMembersForFilter.length === 0}>
                    <Filter className="mr-2 h-4 w-4" />
                    Usuario: {teamMembersForFilter.find(rep => rep.id === selectedUserFilter)?.name || selectedUserFilter} <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                   <DropdownMenuCheckboxItem
                      key="Todos"
                      checked={selectedUserFilter === "Todos"}
                      onCheckedChange={() => setSelectedUserFilter("Todos")}
                    >
                      Todos
                    </DropdownMenuCheckboxItem>
                  {teamMembersForFilter.map(rep => (
                    <DropdownMenuCheckboxItem
                      key={rep.id}
                      checked={selectedUserFilter === rep.id}
                      onCheckedChange={() => setSelectedUserFilter(rep.id)}
                    >
                      {rep.name} ({rep.role === 'SalesRep' ? 'Rep. Ventas' : rep.role})
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
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Cargando tareas...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[20%]">Cliente</TableHead>
                    <TableHead className="w-[15%]">Próxima Acción / Tipo Visita</TableHead>
                    <TableHead className="w-[15%]">Fecha Próx. Acción / Visita</TableHead>
                    {canFilterByUserForAdmin && <TableHead className="w-[15%]">Comercial/Clavadista</TableHead>}
                    <TableHead className="w-[10%] text-center">Estado Tarea</TableHead>
                    <TableHead className="w-[15%]">Notas / Obj. Visita Original</TableHead>
                    <TableHead className="text-right w-[10%]">Acciones</TableHead> 
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFollowUps.length > 0 ? filteredFollowUps.map((item: Order) => {
                    const canEditDate = userRole === 'Admin' || (userRole === 'SalesRep' && teamMember?.name === item.salesRep) || (userRole === 'Clavadista' && item.clavadistaId === teamMember?.id);
                    const canRegisterResult = userRole === 'Admin' || (userRole === 'SalesRep' && teamMember?.name === item.salesRep) || (userRole === 'Clavadista' && item.clavadistaId === teamMember?.id);
                    
                    const isProgrammedItem = item.status === 'Programada';
                    const relevantActionDateString = isProgrammedItem ? item.visitDate : item.nextActionDate;
                    const relevantActionDateParsed = relevantActionDateString && isValid(parseISO(relevantActionDateString)) ? parseISO(relevantActionDateString) : null;
                    
                    const isOverdue = relevantActionDateParsed && isBefore(relevantActionDateParsed, today) && (item.status === 'Seguimiento' || item.status === 'Programada');
                    
                    let responsibleMemberName = item.salesRep;
                    if (item.clavadistaId) {
                        const clava = teamMembersForFilter.find(tm => tm.id === item.clavadistaId);
                        if (clava) {
                            responsibleMemberName = item.salesRep ? `${item.salesRep} + ${clava.name}` : clava.name;
                        }
                    }

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
                      {canFilterByUserForAdmin && <TableCell>{responsibleMemberName}</TableCell>}
                      <TableCell className="text-center">
                        <StatusBadge type="order" status={item.status} />
                      </TableCell>
                      <TableCell className="text-xs truncate max-w-[150px]" title={item.notes}>
                          {item.notes || 'N/D'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menú</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canRegisterResult && (
                              <DropdownMenuItem asChild>
                                <Link href={`/order-form?updateVisitId=${item.id}`}>
                                  <Send className="mr-2 h-4 w-4" /> Registrar Interacción / Resultado
                                </Link>
                              </DropdownMenuItem>
                            )}
                             {canRegisterResult && <DropdownMenuSeparator />}
                            <DropdownMenuItem asChild>
                              <Link href="/my-agenda">
                                  <CalendarDays className="mr-2 h-4 w-4" /> Ver en Agenda Completa
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )}) : (
                    <TableRow>
                      <TableCell colSpan={canFilterByUserForAdmin ? 7 : 6} className="h-24 text-center">
                        No se encontraron tareas de seguimiento o visitas que coincidan con los filtros seleccionados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
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

    
