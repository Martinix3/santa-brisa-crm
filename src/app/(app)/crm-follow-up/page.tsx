
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input"; 
import type { Order, NextActionType, TeamMember, UserRole, OrderStatus } from "@/types";
import { mockOrders, nextActionTypeList, mockTeamMembers } from "@/lib/data";
import { Filter, CalendarDays, ClipboardList, ChevronDown, Edit2 } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, addDays, isValid } from "date-fns";
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

  const [actionTypeFilter, setActionTypeFilter] = React.useState<NextActionType | "Todos">("Todos");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);

  // State for managing Popover and date editing
  const [editingFollowUpId, setEditingFollowUpId] = React.useState<string | null>(null);
  const [popoverOpenItemId, setPopoverOpenItemId] = React.useState<string | null>(null);
  const [selectedNewDate, setSelectedNewDate] = React.useState<Date | undefined>(undefined);

  // Using a state for initialFollowUps to allow direct modification
  const [followUps, setFollowUps] = React.useState<Order[]>(() => 
    mockOrders.filter(order => 
      (order.status === 'Seguimiento' || order.status === 'Fallido') && order.nextActionType
    )
  );

  const salesRepsForFilter = React.useMemo(() => {
    const reps = new Set(mockTeamMembers
        .filter(m => m.role === 'SalesRep' || m.role === 'Admin')
        .map(m => m.name)
    );
    return ["Todos", ...Array.from(reps)];
  }, []);
  
  const uniqueActionTypes = ["Todos", ...nextActionTypeList] as (NextActionType | "Todos")[];

  const filteredFollowUps = React.useMemo(() => {
    return followUps // Use the state variable here
      .filter(followUp => {
        if (userRole === 'SalesRep' && teamMember) {
          return followUp.salesRep === teamMember.name;
        }
        if (userRole === 'Admin') {
          return salesRepFilter === "Todos" || followUp.salesRep === salesRepFilter;
        }
        return false; 
      })
      .filter(followUp =>
        actionTypeFilter === "Todos" || followUp.nextActionType === actionTypeFilter
      )
      .filter(followUp => {
        if (!dateRange?.from || !followUp.nextActionDate) return true; 
        const nextActionDateParsed = parseISO(followUp.nextActionDate);
        if (!isValid(nextActionDateParsed)) return true; // Skip if date is invalid

        const fromDate = dateRange.from;
        const toDate = dateRange.to ? addDays(dateRange.to, 1) : addDays(new Date(), 10000) ; 
        return nextActionDateParsed >= fromDate && nextActionDateParsed < toDate;
      })
      .filter(followUp => 
        followUp.clientName.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [followUps, userRole, teamMember, salesRepFilter, actionTypeFilter, dateRange, searchTerm]);

  const handleSaveNewDate = (followUpId: string) => {
    if (!selectedNewDate) return;

    const updatedFollowUps = followUps.map(item => {
      if (item.id === followUpId) {
        return { ...item, nextActionDate: format(selectedNewDate, "yyyy-MM-dd") };
      }
      return item;
    });
    setFollowUps(updatedFollowUps);

    // Update mockOrders as well
    const mockOrderIndex = mockOrders.findIndex(order => order.id === followUpId);
    if (mockOrderIndex !== -1) {
      mockOrders[mockOrderIndex].nextActionDate = format(selectedNewDate, "yyyy-MM-dd");
    }
    
    const followUpItem = followUps.find(item => item.id === followUpId);
    toast({
      title: "Fecha Actualizada",
      description: `La fecha de seguimiento para "${followUpItem?.clientName}" ha sido actualizada a ${format(selectedNewDate, "dd/MM/yyyy", { locale: es })}.`,
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
    ? "Visitas que requieren una próxima acción o que fueron fallidas pero tienen seguimiento planificado. Puede editar la fecha de próxima acción."
    : "Tus visitas que requieren una próxima acción o que fueron fallidas pero tienen seguimiento planificado. Puedes editar la fecha de próxima acción.";


  return (
    <div className="space-y-6">
      <header className="flex items-center space-x-2">
        <ClipboardList className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline font-semibold">Panel de Tareas de Seguimiento</h1>
      </header>

      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Tareas de Seguimiento de Clientes</CardTitle>
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
                  Acción: {actionTypeFilter} <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {uniqueActionTypes.map(action => (
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
                    <span>Fecha Próxima Acción</span>
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
                  <TableHead className="w-[10%]">Visita Original</TableHead>
                  {userRole === 'Admin' && <TableHead className="w-[15%]">Comercial</TableHead>}
                  <TableHead className="w-[25%]">Próxima Acción</TableHead>
                  <TableHead className="w-[15%]">Fecha Próx. Acción</TableHead>
                  <TableHead className="w-[10%] text-center">Estado Original</TableHead>
                  <TableHead className="w-[10%]">Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFollowUps.length > 0 ? filteredFollowUps.map((item: Order) => {
                  const canEditDate = userRole === 'Admin' || (userRole === 'SalesRep' && teamMember?.name === item.salesRep);
                  const itemDate = item.nextActionDate ? parseISO(item.nextActionDate) : null;

                  return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.clientName}</TableCell>
                    <TableCell>{item.visitDate ? format(parseISO(item.visitDate), "dd/MM/yy", { locale: es }) : "N/D"}</TableCell>
                    {userRole === 'Admin' && <TableCell>{item.salesRep}</TableCell>}
                    <TableCell>
                        {item.nextActionType}
                        {item.nextActionType === "Opción personalizada" && item.nextActionCustom && (
                            <span className="text-xs text-muted-foreground block ml-2">- {item.nextActionCustom}</span>
                        )}
                    </TableCell>
                    <TableCell className="flex items-center space-x-1">
                      <span>
                        {itemDate && isValid(itemDate) ? format(itemDate, "dd/MM/yy", { locale: es }) : 'N/D'}
                      </span>
                      {canEditDate && (
                        <Popover
                          open={popoverOpenItemId === item.id}
                          onOpenChange={(isOpen) => {
                            if (!isOpen) {
                              setPopoverOpenItemId(null);
                              setSelectedNewDate(undefined);
                            } else {
                               setSelectedNewDate(item.nextActionDate ? parseISO(item.nextActionDate) : new Date());
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
                              selected={selectedNewDate}
                              onSelect={setSelectedNewDate}
                              initialFocus
                              disabled={(date) => date < subDays(new Date(),1) && !isEqual(date, subDays(new Date(),1))} // Allow past date only if it's the original date
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
                    <TableCell className="text-center">
                       <StatusBadge type="order" status={item.status} />
                    </TableCell>
                    <TableCell className="text-xs truncate max-w-[150px]" title={item.notes}>
                        {item.notes || 'N/D'}
                    </TableCell>
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
                <p className="text-xs text-muted-foreground">Mostrando {filteredFollowUps.length} tareas de seguimiento.</p>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}


    