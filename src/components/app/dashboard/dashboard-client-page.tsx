
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Order, Account, TeamMember, Kpi, StrategicObjective, StickyNote, DirectSale } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { parseISO, isSameYear, isSameMonth, isValid, subDays, addDays } from 'date-fns';
import { Loader2, PlusCircle, SendHorizonal, FileText, Target, AlertTriangle, Briefcase, ShoppingCart, Award, TrendingUp, DollarSign, Truck, Users, Activity, Banknote, ChevronDown, Filter, CalendarDays, Eye } from "lucide-react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import {
  kpiDataLaunch as initialKpiDataLaunch,
  mockStrategicObjectives,
} from "@/lib/seeds";
import { VALID_SALE_STATUSES, ALL_VISIT_STATUSES } from '@/lib/constants';
import { KpiGrid } from "@/components/app/dashboard/kpi-grid";
import { MonthlyProgress } from "@/components/app/dashboard/monthly-progress";
import { StrategicObjectivesList } from "@/components/app/dashboard/strategic-objectives-list";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import StatusBadge from "@/components/app/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import EditOrderDialog, { type EditOrderFormValues } from "@/components/app/edit-order-dialog";
import { getDashboardDataAction, updateDistributorOrderStatusAction } from "@/services/server/dashboard-actions";
import { RolUsuario, EstadoPedido, ESTADOS_PEDIDO } from "@ssot";

// --- Distributor Portal Component ---
function DistributorPortal({ teamMember, dataSignature, refreshDataSignature, initialOrders, initialDirectSales, initialAccounts, initialTeamMembers }: { teamMember: TeamMember, dataSignature: number, refreshDataSignature: () => void, initialOrders: Order[], initialDirectSales: DirectSale[], initialAccounts: Account[], initialTeamMembers: TeamMember[] }) {
  const { toast } = useToast();
  
  // State
  const [isLoading, setIsLoading] = useState(false);
  const [allManagedOrders, setAllManagedOrders] = useState<Order[]>(initialOrders);
  const [allInvoices, setAllInvoices] = useState<DirectSale[]>(initialDirectSales);
  const [allAccounts, setAllAccounts] = useState<Account[]>(initialAccounts);
  const [allTeamMembers, setAllTeamMembers] = useState<TeamMember[]>(initialTeamMembers);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<EstadoPedido | "Todos">("Todos");
  const [cityFilter, setCityFilter] = useState<string>("Todos");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 90), to: new Date() });
  
  const placementOrderStatuses: EstadoPedido[] = ['Confirmado', 'Procesando', 'Enviado', 'Entregado', 'Facturado', 'Pagado', 'Cancelado'];

  useEffect(() => {
    const managedAccountIds = new Set(allAccounts.filter(acc => acc.distributorId === teamMember.accountId).map(acc => acc.id));
    const managedOrders = initialOrders.filter(o => {
        const isPlacementOrder = VALID_SALE_STATUSES.includes(o.status) || o.status === 'Pagado' || o.status === 'Cancelado';
        return o.accountId && managedAccountIds.has(o.accountId) && isPlacementOrder;
    });
    setAllManagedOrders(managedOrders);
    setAllInvoices(initialDirectSales.filter(s => s.customerId === teamMember.accountId));
  }, [teamMember, initialOrders, initialDirectSales, initialAccounts, allAccounts]);
  
  const kpis = useMemo(() => {
    const pendingToServe = allManagedOrders.filter(o => ['Confirmado', 'Procesando'].includes(o.status)).length;
    const deliveredNotBilled = allManagedOrders.filter(o => o.status === 'Entregado').length;
    const inTransit = allManagedOrders.filter(o => o.status === 'Enviado').length;

    return { pendingToServe, deliveredNotBilled, inTransit };
  }, [allManagedOrders]);

  const cityOptions = React.useMemo(() => {
    const cities = new Set<string>();
    const managedAccountIds = new Set(allAccounts.filter(acc => acc.distributorId === teamMember?.accountId).map(acc => acc.id));
    allAccounts.forEach(acc => {
      if (managedAccountIds.has(acc.id)) {
        if (acc.addressShipping?.city) cities.add(acc.addressShipping.city);
        else if (acc.addressBilling?.city) cities.add(acc.addressBilling.city);
      }
    });
    return ["Todos", ...Array.from(cities).sort()];
  }, [allAccounts, teamMember?.accountId]);

  const filteredOrders = useMemo(() => {
      return allManagedOrders.filter(order => {
        const orderDate = order.createdAt ? parseISO(order.createdAt) : null;
        if (!orderDate || !isValid(orderDate)) return false;

        const matchesDate = dateRange?.from && dateRange.to ? (orderDate >= dateRange.from && orderDate <= addDays(dateRange.to, 1)) : true;
        const matchesStatus = statusFilter === "Todos" || order.status === statusFilter;
        
        const account = allAccounts.find(acc => acc.id === order.accountId);
        const accountCity = account?.addressShipping?.city || account?.addressBilling?.city;
        const matchesCity = cityFilter === "Todos" || (accountCity && accountCity === cityFilter);

        return matchesDate && matchesStatus && matchesCity;
      });
  }, [allManagedOrders, statusFilter, dateRange, cityFilter, allAccounts]);

  const handleEditOrderSave = async (data: EditOrderFormValues, orderId: string) => {
    if (!teamMember) return;
    try {
      const orderUpdateData: Partial<Order> = { 
        status: data.status,
        notes: data.notes,
        invoiceUrl: data.invoiceUrl,
        invoiceFileName: data.invoiceFileName
      };
      await updateDistributorOrderStatusAction(orderId, orderUpdateData);
      refreshDataSignature();
      toast({ title: "¡Pedido Actualizado!", description: "Los detalles del pedido han sido guardados." });
    } catch (error) {
        console.error("Error updating order:", error);
        toast({ title: "Error", description: "No se pudo actualizar el pedido.", variant: "destructive" });
    } finally {
        setEditingOrder(null);
    }
  };

  if (isLoading) {
      return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-semibold">Portal de Distribuidor: {teamMember?.name}</h1>
      <div className="grid gap-6 md:grid-cols-3">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Nuevos Pedidos por Procesar</CardTitle><ShoppingCart className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold"><FormattedNumericValue value={kpis.pendingToServe}/></div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Pedidos en Tránsito</CardTitle><Truck className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold"><FormattedNumericValue value={kpis.inTransit} /></div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Entregados (Pend. Facturar)</CardTitle><FileText className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold"><FormattedNumericValue value={kpis.deliveredNotBilled} /></div></CardContent></Card>
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Pedidos de Clientes a Servir</CardTitle>
            <CardDescription>Gestiona los pedidos de colocación que te han sido asignados.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <Popover>
                  <PopoverTrigger asChild><Button id="date" variant={"outline"} className="w-full sm:w-[260px] justify-start text-left font-normal"><CalendarDays className="mr-2 h-4 w-4" />{dateRange?.from ? (dateRange.to ? <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</> : format(dateRange.from, "LLL dd, y")) : <span>Seleccione rango</span>}</Button></PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es}/></PopoverContent>
              </Popover>
              <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="outline" className="w-full sm:w-auto"><Filter className="mr-2 h-4 w-4"/>Estado: {statusFilter}<ChevronDown className="ml-2 h-4 w-4"/></Button></DropdownMenuTrigger>
                  <DropdownMenuContent><DropdownMenuCheckboxItem checked={statusFilter === "Todos"} onCheckedChange={() => setStatusFilter("Todos")}>Todos</DropdownMenuCheckboxItem>{placementOrderStatuses.map(s => <DropdownMenuCheckboxItem key={s} checked={statusFilter === s} onCheckedChange={() => setStatusFilter(s)}>{s}</DropdownMenuCheckboxItem>)}</DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="outline" className="w-full sm:w-auto"><Filter className="mr-2 h-4 w-4"/>Ciudad: {cityFilter}<ChevronDown className="ml-2 h-4 w-4"/></Button></DropdownMenuTrigger>
                  <DropdownMenuContent>{cityOptions.map(c => <DropdownMenuCheckboxItem key={c} checked={cityFilter === c} onCheckedChange={() => setCityFilter(c)}>{c}</DropdownMenuCheckboxItem>)}</DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Fecha</TableHead><TableHead>Unidades</TableHead><TableHead className="text-right">Valor PVP</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredOrders.length > 0 ? filteredOrders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.clientName}</TableCell>
                    <TableCell>{order.createdAt && isValid(parseISO(order.createdAt)) ? format(parseISO(order.createdAt), 'dd/MM/yyyy', { locale: es }) : 'N/A'}</TableCell>
                    <TableCell><FormattedNumericValue value={order.numberOfUnits} /></TableCell>
                    <TableCell className="text-right"><FormattedNumericValue value={order.value} options={{ style: 'currency', currency: 'EUR' }} /></TableCell>
                    <TableCell>
                       <StatusBadge type="order" status={order.status} />
                    </TableCell>
                     <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setEditingOrder(order)}>
                          <Eye className="mr-2 h-4 w-4"/> Ver/Gestionar
                        </Button>
                      </TableCell>
                  </TableRow>
                )) : <TableRow><TableCell colSpan={6} className="text-center h-24">No hay pedidos que coincidan con los filtros.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      {editingOrder && teamMember && (
        <EditOrderDialog 
            order={editingOrder}
            isOpen={!!editingOrder}
            onOpenChange={() => setEditingOrder(null)}
            onSave={handleEditOrderSave}
            currentUserRole={teamMember.role}
            allAccounts={allAccounts}
            allTeamMembers={allTeamMembers}
        />
      )}
    </div>
  );
}

interface DashboardClientPageProps {
    pageType: 'dashboard' | 'orders';
    initialOrders: Order[];
    initialAccounts: Account[];
    initialTeamMembers: TeamMember[];
    initialDirectSales: DirectSale[];
}

export function DashboardClientPage({ pageType, initialOrders, initialAccounts, initialTeamMembers, initialDirectSales }: DashboardClientPageProps) {
  const { dataSignature, userRole, teamMember, refreshDataSignature } = useAuth();
  
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [salesReps, setSalesReps] = useState<TeamMember[]>(initialTeamMembers.filter(m => m.role === 'Ventas'));
  const [directSales, setDirectSales] = useState<DirectSale[]>(initialDirectSales);
  
  const dashboardData = useMemo(() => {
    if (!teamMember) {
        return null;
    }

    const successfulPlacementOrders = orders
      .filter(o => VALID_SALE_STATUSES.includes(o.status) && (o.createdAt || o.visitDate))
      .map(o => ({ ...o, relevantDate: parseISO((o.visitDate || o.createdAt)!) }))
      .filter(o => isValid(o.relevantDate));

    if (userRole === 'Clavadista' || userRole === 'Líder Clavadista') {
        const clavadistaOrders = orders.filter(o => o.embajadorId === teamMember.id);
        const clavadistaAccounts = accounts.filter(acc => acc.embajadorId === teamMember.id);

        const totalPedidos = clavadistaOrders.filter(o => VALID_SALE_STATUSES.includes(o.status)).length;
        
        return {
            isClavadista: true,
            totalCuentas: clavadistaAccounts.length,
            totalPedidos,
            totalComisiones: teamMember.total_comisiones || 0,
            totalBonus: teamMember.total_bonus || 0,
            totalSales: 0,
            objectives: mockStrategicObjectives,
        };
    }

    const salesRepNamesSet = new Set(salesReps.map(m => m.name));
    salesRepNamesSet.add("Federica");
    const currentDate = new Date();

    const accountNameMap = new Map<string, string>();
    accounts.forEach(account => {
        if (account.nombre) accountNameMap.set(account.nombre.toLowerCase().trim(), account.id);
    });

    const successfulOrdersWithAccountId = successfulPlacementOrders
        .map(o => ({ ...o, accountId: o.accountId || accountNameMap.get(o.clientName.toLowerCase().trim())}))
        .filter(o => o.accountId);
    
    const firstSuccessfulOrderByAccount = new Map<string, typeof successfulOrdersWithAccountId[0]>();
    for (const order of successfulOrdersWithAccountId.sort((a,b) => a.relevantDate.getTime() - b.relevantDate.getTime())) {
        if (!firstSuccessfulOrderByAccount.has(order.accountId!)) {
            firstSuccessfulOrderByAccount.set(order.accountId!, order);
        }
    }
    
    const teamFirstSuccessfulOrders = Array.from(firstSuccessfulOrderByAccount.values())
        .filter(o => o.salesRep && salesRepNamesSet.has(o.salesRep));
    
    const newAccountsThisYear = teamFirstSuccessfulOrders.filter(o => isSameYear(o.relevantDate, currentDate)).length;
    const newAccountsThisMonth = teamFirstSuccessfulOrders.filter(o => isSameMonth(o.relevantDate, currentDate)).length;
    
    const totalAccountsWithOrders = Array.from(firstSuccessfulOrderByAccount.keys()).length;
    let accountsWithRepurchase = 0;
    for (const accountId of firstSuccessfulOrderByAccount.keys()) {
        const ordersForAccount = successfulOrdersWithAccountId.filter(o => o.accountId === accountId);
        if (ordersForAccount.length > 1) accountsWithRepurchase++;
    }
    
    const repurchaseRate = totalAccountsWithOrders > 0 ? Math.round((accountsWithRepurchase / totalAccountsWithOrders) * 100) : 0;
    
    const totalBottlesSoldOverall = successfulPlacementOrders.reduce((sum, o) => sum + (o.numberOfUnits || 0), 0);
    const teamBottlesSoldOverall = successfulPlacementOrders.filter(o => o.salesRep && salesRepNamesSet.has(o.salesRep)).reduce((sum, o) => sum + (o.numberOfUnits || 0), 0);

    const calculatedKpis = initialKpiDataLaunch.map(kpi => {
      let currentValue = 0;
      switch(kpi.id) {
        case 'kpi1': currentValue = totalBottlesSoldOverall; break;
        case 'kpi2': currentValue = teamBottlesSoldOverall; break;
        case 'kpi3': currentValue = newAccountsThisYear; break; 
        case 'kpi4': currentValue = newAccountsThisMonth; break;
        case 'kpi5': currentValue = repurchaseRate; break;
      }
      return { ...kpi, currentValue };
    });

    let monthlyProgressMetrics: any[] = [];
    if(userRole === 'Ventas' && teamMember) {
      const monthlyAccounts = teamFirstSuccessfulOrders.filter(o => o.salesRep === teamMember.name && isSameMonth(o.relevantDate, currentDate)).length;
      const monthlyVisits = orders.filter(o => o.salesRep === teamMember.name && (o.createdAt || o.visitDate) && isValid(parseISO((o.createdAt || o.visitDate)!)) && isSameMonth(parseISO((o.createdAt || o.visitDate)!), currentDate) && ALL_VISIT_STATUSES.includes(o.status)).length;
      monthlyProgressMetrics = [
        { title: "Cuentas Nuevas", target: teamMember.monthlyTargetAccounts || 0, current: monthlyAccounts, unit: 'cuentas', colorClass: "[&>div]:bg-primary" },
        { title: "Visitas Realizadas", target: teamMember.monthlyTargetVisits || 0, current: monthlyVisits, unit: 'visitas', colorClass: "[&>div]:bg-primary" },
      ];
    } else if (userRole === 'Admin') {
       const teamMonthlyTargetAccounts = salesReps.reduce((sum, rep) => sum + (rep.monthlyTargetAccounts || 0), 0);
       const teamMonthlyTargetVisits = salesReps.reduce((sum, rep) => sum + (rep.monthlyTargetVisits || 0), 0);
       const teamMonthlyVisits = orders.filter(o => o.salesRep && salesRepNamesSet.has(o.salesRep) && (o.createdAt || o.visitDate) && isValid(parseISO((o.createdAt || o.visitDate)!)) && isSameMonth(parseISO((o.createdAt || o.visitDate)!), currentDate) && ALL_VISIT_STATUSES.includes(o.status)).length;
      monthlyProgressMetrics = [
        { title: "Cuentas Nuevas del Equipo", target: teamMonthlyTargetAccounts, current: newAccountsThisMonth, unit: 'cuentas', colorClass: "[&>div]:bg-[hsl(var(--brand-turquoise-hsl))]" },
        { title: "Visitas del Equipo", target: teamMonthlyTargetVisits, current: teamMonthlyVisits, unit: 'visitas', colorClass: "[&>div]:bg-[hsl(var(--brand-turquoise-hsl))]" },
      ];
    }
    
    const teamPlacementSalesValue = successfulPlacementOrders.reduce((sum, o) => sum + ((o.numberOfUnits || 0) * 8), 0);

    const inConsignmentValue = directSales
        .filter(s => s.type === 'deposito' && s.status === 'en depósito')
        .reduce((sum, s) => {
             const item = s.items[0];
            if(!item) return sum;
            const remainingQty = s.qtyRemainingInConsignment?.[item.productId] ?? item.quantity;
            return sum + (remainingQty * item.netUnitPrice);
        }, 0);

    const directSalesValue = directSales
        .filter(s => s.type === 'directa' && ['confirmado', 'facturado', 'pagado', 'entregado'].includes(s.status))
        .reduce((sum, s) => sum + s.totalAmount, 0);


    return {
      isClavadista: false,
      kpis: calculatedKpis,
      monthlyProgressTitle: userRole === 'Admin' ? "Progreso Mensual del Equipo" : "Tu Progreso Mensual",
      showMonthlyProgress: userRole === 'Admin' || userRole === 'Ventas',
      monthlyProgressMetrics,
      teamPlacementSalesValue,
      inConsignmentValue,
      directSalesValue,
      objectives: mockStrategicObjectives,
    };
  }, [orders, accounts, salesReps, userRole, teamMember, directSales]);
  
  if (pageType === 'orders') {
     const { toast } = useToast();
     const [searchTerm, setSearchTerm] = React.useState("");
     const [statusFilter, setStatusFilter] = React.useState<EstadoPedido | "Todos">("Todos");
     const [cityFilter, setCityFilter] = React.useState<string>("Todos");
     const [editingOrder, setEditingOrder] = React.useState<Order | null>(null);

     const cityOptions = React.useMemo(() => {
        const cities = new Set<string>();
        const accountIdsInOrders = new Set(orders.map(o => o.accountId));
        accounts.forEach(acc => {
          if (accountIdsInOrders.has(acc.id)) {
            if (acc.addressShipping?.city) cities.add(acc.addressShipping.city);
            else if (acc.addressBilling?.city) cities.add(acc.addressBilling.city);
          }
        });
        return ["Todos", ...Array.from(cities).sort()];
      }, [accounts, orders]);

      const filteredOrders = React.useMemo(() => {
        const accountsMap = new Map(accounts.map(acc => [acc.id, acc]));

        return orders
          .filter(order => {
            const matchesSearch = !searchTerm || order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || (order.id && order.id.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesStatus = statusFilter === "Todos" || order.status === statusFilter;
            
            const account = order.accountId ? accountsMap.get(order.accountId) : undefined;
            const accountCity = account?.addressShipping?.city || account?.addressBilling?.city;
            const matchesCity = cityFilter === "Todos" || (accountCity && accountCity === cityFilter);

            return matchesSearch && matchesStatus && matchesCity;
          });
      }, [orders, accounts, searchTerm, statusFilter, cityFilter]);

      const handleSaveOrder = async (data: EditOrderFormValues, orderId: string) => {
        if (!userRole) return;
        try {
          await updateDistributorOrderStatusAction(orderId, data);
          refreshDataSignature();
          toast({ title: "¡Pedido Actualizado!", description: "Los detalles del pedido han sido guardados." });
        } catch (error) {
            console.error("Error updating order:", error);
            toast({ title: "Error", description: "No se pudo actualizar el pedido.", variant: "destructive" });
        } finally {
            setEditingOrder(null);
        }
      };
     return (
       <div className="space-y-6">
          <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-headline font-semibold">Panel de Pedidos</h1>
              <p className="text-muted-foreground">Consulta el estado y los detalles de todos los pedidos de colocación.</p>
            </div>
            {(userRole === 'Admin' || userRole === 'Ventas' || userRole === 'Clavadista') && (
                <Button asChild>
                    <Link href="/order-form"><PlusCircle className="mr-2 h-4 w-4"/> Registrar Interacción/Pedido</Link>
                </Button>
            )}
          </header>
          <Card className="shadow-subtle">
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-center gap-4 flex-wrap">
                  <div className="relative flex-grow w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por cliente o ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-full sm:max-w-xs"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as EstadoPedido | 'Todos')}>
                      <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Estado..." /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="Todos">Todos los Estados</SelectItem>
                          {ESTADOS_PEDIDO.filter(s => s !== 'borrador' && s !== 'cancelado').map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                  </Select>
                  <Select value={cityFilter} onValueChange={(v) => setCityFilter(v)}>
                      <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Ciudad..." /></SelectTrigger>
                      <SelectContent>
                          {cityOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                  </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Responsable</TableHead>
                            <TableHead>Unidades</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead className="text-center">Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredOrders.length > 0 ? filteredOrders.map(order => (
                            <TableRow key={order.id}>
                                <TableCell className="font-medium">{order.clientName}</TableCell>
                                <TableCell>{order.createdAt && isValid(parseISO(order.createdAt)) ? format(parseISO(order.createdAt), "dd/MM/yyyy") : 'N/D'}</TableCell>
                                <TableCell>{order.salesRep}</TableCell>
                                <TableCell><FormattedNumericValue value={order.numberOfUnits} placeholder="N/A" /></TableCell>
                                <TableCell className="text-right"><FormattedNumericValue value={order.value} options={{style: 'currency', currency: 'EUR'}} placeholder="N/A" /></TableCell>
                                <TableCell className="text-center"><StatusBadge type="order" status={order.status} /></TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" variant="outline" onClick={() => setEditingOrder(order)}>
                                        <Eye className="mr-2 h-4 w-4"/> Ver
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )) : (
                           <TableRow>
                                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                    No se encontraron pedidos con los filtros actuales.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          
          {editingOrder && (
            <EditOrderDialog
                order={editingOrder}
                isOpen={!!editingOrder}
                onOpenChange={() => setEditingOrder(null)}
                onSave={handleSaveOrder}
                currentUserRole={userRole!}
                allAccounts={accounts}
                allTeamMembers={teamMembers}
            />
          )}
        </div>
     )
  }

  if (!dashboardData) {
    return (
        <div className="flex flex-col items-center justify-center h-full p-8" role="status" aria-live="polite">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <p className="mt-4 text-destructive">No se pudieron cargar los datos del dashboard. Puede ser un problema de permisos o de conexión.</p>
        </div>
    );
  }
  
  const showActionButtons = userRole === 'Admin' || userRole === 'Ventas' || userRole === 'Clavadista' || userRole === 'Líder Clavadista';
  
  if (userRole === 'Distributor' && teamMember) {
    return <DistributorPortal 
        teamMember={teamMember} 
        dataSignature={dataSignature} 
        refreshDataSignature={refreshDataSignature} 
        initialOrders={orders}
        initialDirectSales={directSales}
        initialAccounts={accounts}
        initialTeamMembers={salesReps}
    />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-semibold">
        Hola, {teamMember?.name || "Santa Brisa"}
      </h1>

      <Alert className="bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-100">
        <AlertTriangle className="h-4 w-4 !text-amber-600 dark:!text-amber-400" />
        <AlertTitle className="font-bold text-amber-900 dark:text-amber-200">¡Atención! Entorno de Pruebas con Datos Reales</AlertTitle>
        <AlertDescription className="text-amber-800 dark:text-amber-300">
          Este es un entorno de pruebas activo, pero toda la información que introduzcas (clientes, pedidos, interacciones) <strong>se está guardando en la base de datos real.</strong>
          <br />
          Tu feedback es crucial. Si encuentras algún fallo, tienes alguna duda o una sugerencia para mejorar la herramienta, por favor, <strong>comunícalo directamente al administrador.</strong> ¡Gracias por tu colaboración!
        </AlertDescription>
      </Alert>
      
      {showActionButtons && (
        <div className="grid grid-cols-2 gap-4">
            <>
              <Button asChild className="h-20 text-base flex-col gap-1 bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href="/order-form">
                  <PlusCircle className="h-6 w-6 mb-1" /> Añadir Visita
                </Link>
              </Button>
              <Button asChild className="h-20 text-base flex-col gap-1 bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href="/request-sample">
                  <SendHorizonal className="h-6 w-6 mb-1" /> Solicitar Muestras
                </Link>
              </Button>
            </>
        </div>
      )}

      {dashboardData.isClavadista ? (
          <>
            <h2 className="text-2xl font-headline font-semibold pt-4 border-t">Panel de Clavadista</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="shadow-subtle"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Cuentas Nuevas Creadas</CardTitle><Briefcase className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold"><FormattedNumericValue value={dashboardData.totalCuentas}/></div></CardContent></Card>
                <Card className="shadow-subtle"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Pedidos Totales Registrados</CardTitle><ShoppingCart className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold"><FormattedNumericValue value={dashboardData.totalPedidos}/></div></CardContent></Card>
                <Card className="shadow-subtle"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Bonus Totales</CardTitle><Award className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold"><FormattedNumericValue value={dashboardData.totalBonus} options={{style: 'currency', currency: 'EUR'}}/></div><p className="text-xs text-muted-foreground">Fees de apertura y consolidación.</p></CardContent></Card>
                <Card className="shadow-subtle"><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Comisiones Totales</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground"/></CardHeader><CardContent><div className="text-2xl font-bold"><FormattedNumericValue value={dashboardData.totalComisiones} options={{style: 'currency', currency: 'EUR'}}/></div><p className="text-xs text-muted-foreground">Comisiones generadas por ventas.</p></CardContent></Card>
            </div>
          </>
      ) : (
        <>
            {userRole === 'Admin' && (
              <div className="grid gap-6 md:grid-cols-3">
                  <Card className="shadow-subtle">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ventas Equipo Colocación</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader>
                      <CardContent><div className="text-2xl font-bold"><FormattedNumericValue value={dashboardData.teamPlacementSalesValue} options={{ style: 'currency', currency: 'EUR' }} /></div></CardContent>
                  </Card>
                   <Card className="shadow-subtle">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ventas en Depósito</CardTitle><Truck className="h-4 w-4 text-muted-foreground" /></CardHeader>
                      <CardContent><div className="text-2xl font-bold"><FormattedNumericValue value={dashboardData.inConsignmentValue} options={{ style: 'currency', currency: 'EUR' }} /></div></CardContent>
                  </Card>
                   <Card className="shadow-subtle">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ventas Directas</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader>
                      <CardContent><div className="text-2xl font-bold"><FormattedNumericValue value={dashboardData.directSalesValue} options={{ style: 'currency', currency: 'EUR' }} /></div></CardContent>
                  </Card>
              </div>
            )}

            {dashboardData.showMonthlyProgress && dashboardData.monthlyProgressMetrics.length > 0 && (
                <Card className="shadow-subtle">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Target className="mr-2 h-5 w-5 text-primary" />
                      {dashboardData.monthlyProgressTitle}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {dashboardData.monthlyProgressMetrics.map((metric: any) => {
                      const progress = metric.target > 0 ? Math.min((metric.current / metric.target) * 100, 100) : (metric.current > 0 ? 100 : 0);
                      const isTargetAchieved = metric.target > 0 && metric.current >= metric.target;
                      return (
                        <div key={metric.title}>
                          <div className="flex justify-between items-baseline mb-1">
                            <span className="text-sm font-medium">{metric.title}</span>
                            <span className="text-sm text-muted-foreground">
                              <FormattedNumericValue value={metric.current} /> / <FormattedNumericValue value={metric.target} />
                            </span>
                          </div>
                          <Progress value={progress} className={cn("h-2", isTargetAchieved ? "[&>div]:bg-green-500" : metric.colorClass)} />
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              <h2 className="text-2xl font-headline font-semibold pt-4 border-t">Panel de Lanzamiento</h2>
              
              <KpiGrid kpis={dashboardData.kpis} />

              <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="md:col-span-2 lg:col-span-2 space-y-6">
                    <StrategicObjectivesList objectives={dashboardData.objectives} />
                </div>
              </section>
        </>
      )}
    </div>
  );
}
