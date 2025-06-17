
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input"; // Though not used for search yet, good to have for consistency
import type { Order, NextActionType, TeamMember, UserRole } from "@/types";
import { mockOrders, nextActionTypeList, mockTeamMembers } from "@/lib/data";
import { Filter, CalendarDays, ClipboardList, ChevronDown } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, addDays } from "date-fns";
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

const getStatusBadgeColor = (status: Order['status']): string => {
  switch (status) {
    case 'Seguimiento': return 'bg-blue-500 hover:bg-blue-600 text-white';
    case 'Fallido': return 'bg-orange-500 hover:bg-orange-600 text-white';
    default: return 'bg-gray-400 hover:bg-gray-500';
  }
};

export default function CrmFollowUpPage() {
  const { userRole } = useAuth();
  const [searchTerm, setSearchTerm] = React.useState(""); // For future client name search
  const [salesRepFilter, setSalesRepFilter] = React.useState<string>("Todos");
  const [actionTypeFilter, setActionTypeFilter] = React.useState<NextActionType | "Todos">("Todos");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);

  const initialFollowUps = React.useMemo(() => {
    return mockOrders.filter(order => 
      (order.status === 'Seguimiento' || order.status === 'Fallido') && order.nextActionType
    );
  }, []);

  const salesRepsForFilter = React.useMemo(() => {
    const reps = new Set(mockTeamMembers
        .filter(m => m.role === 'SalesRep' || m.role === 'Admin')
        .map(m => m.name)
    );
    return ["Todos", ...Array.from(reps)];
  }, []);
  
  const uniqueActionTypes = ["Todos", ...nextActionTypeList] as (NextActionType | "Todos")[];

  const filteredFollowUps = React.useMemo(() => {
    return initialFollowUps
      .filter(followUp => 
        salesRepFilter === "Todos" || followUp.salesRep === salesRepFilter
      )
      .filter(followUp =>
        actionTypeFilter === "Todos" || followUp.nextActionType === actionTypeFilter
      )
      .filter(followUp => {
        if (!dateRange?.from || !followUp.nextActionDate) return true; // No date filter or no next action date
        const nextActionDate = parseISO(followUp.nextActionDate);
        const fromDate = dateRange.from;
        const toDate = dateRange.to ? addDays(dateRange.to, 1) : addDays(new Date(), 10000) ; // Ensure 'to' covers the whole day
        return nextActionDate >= fromDate && nextActionDate < toDate;
      })
      .filter(followUp => // Basic client name search
        followUp.clientName.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [initialFollowUps, salesRepFilter, actionTypeFilter, dateRange, searchTerm]);

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
        <ClipboardList className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline font-semibold">Panel de Seguimiento CRM</h1>
      </header>

      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Actividades de Seguimiento</CardTitle>
          <CardDescription>Visitas que requieren una próxima acción o que fueron fallidas pero tienen seguimiento planificado.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <Input
              placeholder="Buscar por cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
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
                    "w-full sm:w-[280px] justify-start text-left font-normal", // Adjusted width for date range picker
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
                  <TableHead className="w-[15%]">Comercial</TableHead>
                  <TableHead className="w-[25%]">Próxima Acción</TableHead>
                  <TableHead className="w-[10%]">Fecha Próx. Acción</TableHead>
                  <TableHead className="w-[10%] text-center">Estado Original</TableHead>
                  <TableHead className="w-[10%]">Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFollowUps.length > 0 ? filteredFollowUps.map((item: Order) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.clientName}</TableCell>
                    <TableCell>{format(parseISO(item.visitDate), "dd/MM/yy", { locale: es })}</TableCell>
                    <TableCell>{item.salesRep}</TableCell>
                    <TableCell>
                        {item.nextActionType}
                        {item.nextActionType === "Opción personalizada" && item.nextActionCustom && (
                            <span className="text-xs text-muted-foreground block ml-2">- {item.nextActionCustom}</span>
                        )}
                    </TableCell>
                    <TableCell>
                        {item.nextActionDate ? format(parseISO(item.nextActionDate), "dd/MM/yy", { locale: es }) : 'N/D'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn("text-xs", getStatusBadgeColor(item.status))}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs truncate max-w-[150px]" title={item.notes}>
                        {item.notes || 'N/D'}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No hay actividades de seguimiento que coincidan con los filtros.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
         {filteredFollowUps.length > 0 && (
            <CardFooter>
                <p className="text-xs text-muted-foreground">Mostrando {filteredFollowUps.length} actividades de seguimiento.</p>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
