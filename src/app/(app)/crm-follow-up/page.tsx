
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input"; 
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { Order, CrmEvent, TeamMember, UserRole, Account, SampleRequest } from "@/types";
import { Filter, CalendarDays, ClipboardList, ChevronDown, Send, Loader2, User, Info, AlertTriangle, ShoppingCart, MessageSquareQuestion, TestTube2, Building2 } from "lucide-react";
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
import { getOrdersFS } from "@/services/order-service";
import { getSampleRequestsFS } from "@/services/sample-request-service";
import { getTeamMembersFS } from "@/services/team-member-service"; 
import { getAccountsFS } from "@/services/account-service";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


interface ActivityItem {
  id: string;
  date: Date;
  type: 'order' | 'sampleRequest';
  data: Order | SampleRequest;
}

interface AccountActivityGroup {
  account: Account;
  activities: ActivityItem[];
  lastActivityDate: Date;
}


export default function CrmFollowUpPage() {
  const { userRole, teamMember, loading: authContextLoading, refreshDataSignature } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState(""); 
  const [selectedUserFilter, setSelectedUserFilter] = React.useState<string>("Todos");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState(true);
  const [allTeamMembers, setAllTeamMembers] = React.useState<TeamMember[]>([]);
  const [allAccounts, setAllAccounts] = React.useState<Account[]>([]);
  const [activityGroups, setActivityGroups] = React.useState<AccountActivityGroup[]>([]);
  
  React.useEffect(() => {
    async function loadInitialData() {
      if (authContextLoading) return;
      
      setIsLoading(true);
      try {
        const [fetchedOrders, fetchedSampleRequests, fetchedAccounts, fetchedTeamMembers] = await Promise.all([
          getOrdersFS(),
          getSampleRequestsFS(),
          getAccountsFS(),
          getTeamMembersFS(['SalesRep', 'Admin', 'Clavadista'])
        ]);
        
        setAllAccounts(fetchedAccounts);
        setAllTeamMembers(fetchedTeamMembers);

        const activitiesByAccountId = new Map<string, ActivityItem[]>();
        const accountIdByName = new Map<string, string>();
        fetchedAccounts.forEach(acc => {
          if (!accountIdByName.has(acc.name.toLowerCase().trim())) {
            accountIdByName.set(acc.name.toLowerCase().trim(), acc.id);
          }
        });

        // Process Orders
        for (const order of fetchedOrders) {
          const accountId = order.accountId || accountIdByName.get(order.clientName.toLowerCase().trim());
          if (accountId) {
            if (!activitiesByAccountId.has(accountId)) activitiesByAccountId.set(accountId, []);
            activitiesByAccountId.get(accountId)!.push({
              id: order.id,
              date: parseISO(order.createdAt || order.visitDate),
              type: 'order',
              data: order
            });
          }
        }
        
        // Process Sample Requests
        for (const sample of fetchedSampleRequests) {
            const accountId = sample.accountId || accountIdByName.get(sample.clientName.toLowerCase().trim());
            if (accountId) {
                if (!activitiesByAccountId.has(accountId)) activitiesByAccountId.set(accountId, []);
                activitiesByAccountId.get(accountId)!.push({
                    id: sample.id,
                    date: parseISO(sample.requestDate),
                    type: 'sampleRequest',
                    data: sample
                });
            }
        }
        
        const groups: AccountActivityGroup[] = [];
        for (const [accountId, activities] of activitiesByAccountId.entries()) {
            const account = fetchedAccounts.find(acc => acc.id === accountId);
            if (account) {
                activities.sort((a, b) => b.date.getTime() - a.date.getTime());
                groups.push({
                    account,
                    activities,
                    lastActivityDate: activities[0]?.date || new Date(0)
                });
            }
        }
        
        setActivityGroups(groups.sort((a,b) => b.lastActivityDate.getTime() - a.lastActivityDate.getTime()));

      } catch (error) {
        console.error("Error loading activity data:", error);
        toast({ title: "Error al Cargar Datos", description: "No se pudieron cargar las actividades.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, [toast, authContextLoading, refreshDataSignature]);


  const filteredActivityGroups = React.useMemo(() => {
    return activityGroups
      .filter(group => 
        group.account.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(group => {
        if (userRole === 'Admin') {
            if (selectedUserFilter === 'Todos') return true;
            return group.activities.some(activity => {
                if (activity.type === 'order') {
                    const order = activity.data as Order;
                    const member = allTeamMembers.find(m => m.id === selectedUserFilter);
                    if (!member) return false;
                    return (member.role === 'Clavadista' && order.clavadistaId === member.id) || (member.name === order.salesRep);
                }
                if (activity.type === 'sampleRequest') {
                    const sample = activity.data as SampleRequest;
                    return sample.requesterId === selectedUserFilter;
                }
                return false;
            });
        }
        if ((userRole === 'SalesRep' || userRole === 'Clavadista') && teamMember) {
             return group.activities.some(activity => {
                if (activity.type === 'order') {
                    const order = activity.data as Order;
                    return (userRole === 'SalesRep' && order.salesRep === teamMember.name) ||
                           (userRole === 'Clavadista' && order.clavadistaId === teamMember.id);
                }
                if (activity.type === 'sampleRequest') {
                    const sample = activity.data as SampleRequest;
                    return sample.requesterId === teamMember.id;
                }
                return false;
            });
        }
        return false;
      })
      .map(group => {
        if (!dateRange?.from) return group;
        const filteredActivities = group.activities.filter(activity => {
            if (!isValid(activity.date)) return false;
            const from = dateRange.from!;
            const to = dateRange.to ? addDays(dateRange.to, 1) : addDays(new Date(), 10000);
            return activity.date >= from && activity.date < to;
        });
        return { ...group, activities: filteredActivities };
      })
      .filter(group => group.activities.length > 0);
  }, [activityGroups, searchTerm, userRole, teamMember, selectedUserFilter, allTeamMembers, dateRange]);


  if (authContextLoading) {
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
  
  const pageDescription = "Consulta y gestiona todo el historial de interacciones con cada cliente, incluyendo pedidos, seguimientos, visitas y solicitudes de muestras.";

  const today = startOfDay(new Date());
  const canFilterByUserForAdmin = userRole === 'Admin';
  
  const getActivityIcon = (activity: ActivityItem) => {
    if (activity.type === 'sampleRequest') {
        return <TestTube2 className="h-5 w-5 text-purple-600" />;
    }
    const order = activity.data as Order;
    switch(order.status) {
        case 'Confirmado':
        case 'Procesando':
        case 'Enviado':
        case 'Entregado':
        case 'Facturado': return <ShoppingCart className="h-5 w-5 text-green-600" />;
        case 'Seguimiento': return <ClipboardList className="h-5 w-5 text-blue-600" />;
        case 'Programada': return <CalendarDays className="h-5 w-5 text-sky-600" />;
        case 'Fallido':
        case 'Cancelado':
        case 'Completado': return <MessageSquareQuestion className="h-5 w-5 text-gray-500" />;
        default: return <Info className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getResponsibleUser = (activity: ActivityItem): TeamMember | undefined => {
    if (activity.type === 'order') {
      const order = activity.data as Order;
      return allTeamMembers.find(m => m.name === order.salesRep || m.id === order.clavadistaId);
    }
    if (activity.type === 'sampleRequest') {
        const sample = activity.data as SampleRequest;
        return allTeamMembers.find(m => m.id === sample.requesterId);
    }
    return undefined;
  };


  return (
    <>
      <div className="space-y-6">
        <header className="flex items-center space-x-2">
          <Building2 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-headline font-semibold">Panel de Actividad por Cliente</h1>
        </header>

        <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
          <CardHeader>
            <CardTitle>Historial de Actividad</CardTitle>
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
              {canFilterByUserForAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto" disabled={isLoading || allTeamMembers.length === 0}>
                      <Filter className="mr-2 h-4 w-4" />
                      Usuario: {allTeamMembers.find(rep => rep.id === selectedUserFilter)?.name || selectedUserFilter} <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuCheckboxItem key="Todos" checked={selectedUserFilter === "Todos"} onCheckedChange={() => setSelectedUserFilter("Todos")}>Todos</DropdownMenuCheckboxItem>
                    {allTeamMembers.map(rep => (
                      <DropdownMenuCheckboxItem key={rep.id} checked={selectedUserFilter === rep.id} onCheckedChange={() => setSelectedUserFilter(rep.id)}>
                        {rep.name} ({rep.role === 'SalesRep' ? 'Rep. Ventas' : rep.role})
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-full sm:w-[280px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y", { locale: es })} - {format(dateRange.to, "LLL dd, y", { locale: es })}</>) : (format(dateRange.from, "LLL dd, y", { locale: es }))) : (<span>Filtrar por fecha...</span>)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es} />
                </PopoverContent>
              </Popover>
            </div>
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Cargando actividades...</p>
              </div>
            ) : (
                <Accordion type="multiple" className="w-full space-y-2">
                    {filteredActivityGroups.length > 0 ? filteredActivityGroups.map(group => (
                        <AccordionItem key={group.account.id} value={group.account.id} className="border-b-0 rounded-lg bg-card border shadow-sm">
                            <AccordionTrigger className="px-4 py-3 hover:no-underline rounded-lg">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-semibold text-primary">{group.account.name}</h3>
                                    <div className="text-sm text-muted-foreground">({group.account.addressShipping?.city || group.account.addressBilling?.city || 'Ubicación N/D'})</div>
                                    <Badge variant="secondary">{group.activities.length} Interacciones</Badge>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                                <div className="space-y-4 pt-2 border-t">
                                    {group.activities.map(activity => {
                                      const responsibleUser = getResponsibleUser(activity);
                                      const isOverdue = activity.type === 'order' && 
                                        ['Programada', 'Seguimiento'].includes((activity.data as Order).status) &&
                                        isValid(activity.date) && isBefore(activity.date, today);

                                      return (
                                        <div key={activity.id} className={cn("p-3 rounded-md bg-background border flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4", isOverdue && "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20")}>
                                            <div className="flex items-start gap-4">
                                                {getActivityIcon(activity)}
                                                <div className="space-y-1">
                                                    <p className="font-semibold">
                                                        {activity.type === 'order' ? `Interacción: ${(activity.data as Order).status}` : `Solicitud de Muestras`}
                                                        {isOverdue && <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 inline-block ml-2" />}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">{format(activity.date, "PPP 'a las' HH:mm", {locale: es})}</p>
                                                    {activity.type === 'order' && (activity.data as Order).value && <p className="text-sm font-medium">Valor: <FormattedNumericValue value={(activity.data as Order).value} options={{style: 'currency', currency: 'EUR'}} /></p>}
                                                    {responsibleUser && (
                                                      <div className="flex items-center gap-2 pt-1">
                                                          <Avatar className="h-6 w-6"><AvatarImage src={responsibleUser.avatarUrl} /><AvatarFallback>{responsibleUser.name.substring(0,1)}</AvatarFallback></Avatar>
                                                          <span className="text-xs text-muted-foreground">{responsibleUser.name}</span>
                                                      </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex-shrink-0 self-center sm:self-end">
                                               {(activity.type === 'order' && ['Programada', 'Seguimiento', 'Fallido'].includes((activity.data as Order).status)) ? (
                                                  <Button asChild variant="default" size="sm">
                                                    <Link href={`/order-form?originatingTaskId=${activity.id}`}>
                                                      <Send className="mr-2 h-4 w-4" /> Registrar Resultado
                                                    </Link>
                                                  </Button>
                                               ) : null }
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    )) : (
                        <div className="text-center py-16">
                            <p className="text-muted-foreground">No se encontraron actividades que coincidan con los filtros seleccionados.</p>
                        </div>
                    )}
                </Accordion>
            )}
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">Mostrando {filteredActivityGroups.length} cuentas con actividad relevante.</p>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}

