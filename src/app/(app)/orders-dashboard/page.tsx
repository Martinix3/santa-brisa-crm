
"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { Order, OrderStatus, UserRole, TeamMember, AddressDetails, Account } from "@/types";
import { orderStatusesList } from "@/lib/data";
import { MoreHorizontal, Eye, Edit, Trash2, Filter, CalendarDays, ChevronDown, Download, ShoppingCart, Loader2, MapPin, User as UserIcon, XCircle, Truck } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays, parseISO, isValid, subDays } from "date-fns";
import { es } from 'date-fns/locale';
import EditOrderDialog, { type EditOrderFormValues } from "@/components/app/edit-order-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import { getOrdersFS, updateFullOrderFS, deleteOrderFS } from "@/services/order-service";
import { getAccountByIdFS, updateAccountFS as updateAccountInFirestore, getAccountsFS } from "@/services/account-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import Link from "next/link";
import StatusBadge from "@/components/app/status-badge";
import { VALID_SALE_STATUSES } from '@/lib/constants';


export default function OrdersDashboardPage() {
  const { toast } = useToast();
  const { userRole: currentUserRole, teamMember: currentTeamMember, dataSignature, refreshDataSignature } = useAuth();
  
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [allAccounts, setAllAccounts] = React.useState<Account[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [editingOrder, setEditingOrder] = React.useState<Order | null>(null);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = React.useState(false);
  const [orderToDelete, setOrderToDelete] = React.useState<Order | null>(null);

  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<OrderStatus | "Todos">("Todos");
  const [cityFilter, setCityFilter] = React.useState<string>("Todos");
  const [distributorFilter, setDistributorFilter] = React.useState<string>("Todos");
  
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: subDays(new Date(), 90),
    to: new Date(),
  });
  
  const isAdmin = currentUserRole === 'Admin';
  const isDistributor = currentUserRole === 'Distributor';

  React.useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      try {
        const [fetchedOrders, fetchedAccounts] = await Promise.all([
          getOrdersFS(),
          getAccountsFS()
        ]);
        
        let relevantOrders = fetchedOrders.filter(order => VALID_SALE_STATUSES.includes(order.status) || order.status === 'Pagado' || order.status === 'Cancelado');

        setOrders(relevantOrders);
        setAllAccounts(fetchedAccounts);

      } catch (error) {
        console.error("Failed to load orders:", error);
        toast({ title: "Error", description: "No se pudieron cargar los pedidos.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, [toast, currentUserRole, dataSignature, currentTeamMember, isDistributor]);
  
  const handleEditClick = (order: Order) => {
    setEditingOrder(order);
    setIsOrderDialogOpen(true);
  };
  
  const handleEditOrderSave = async (data: EditOrderFormValues, orderId: string) => {
    try {
      if (isAdmin && data.clientName && data.clientName !== editingOrder?.clientName && editingOrder?.accountId) {
         await updateAccountInFirestore(editingOrder.accountId, { name: data.clientName } as any);
      }

      const orderUpdateData: Partial<Order> = { ...data };
      if (data.clavadistaId === '##NONE##') {
        orderUpdateData.clavadistaId = undefined;
      }
      
      await updateFullOrderFS(orderId, orderUpdateData);
      refreshDataSignature();
      toast({ title: "¡Pedido Actualizado!", description: "Los detalles del pedido han sido guardados." });
    } catch (error) {
        console.error("Error updating order:", error);
        toast({ title: "Error", description: "No se pudo actualizar el pedido.", variant: "destructive" });
    } finally {
        setIsOrderDialogOpen(false);
        setEditingOrder(null);
    }
  };

  const handleDeleteOrder = async () => {
    if (!orderToDelete || !isAdmin) return;
    try {
      await deleteOrderFS(orderToDelete.id);
      refreshDataSignature();
      toast({ title: "¡Pedido Eliminado!", description: `El pedido para ${orderToDelete.clientName} ha sido eliminado.` });
    } catch (error) {
       console.error("Error deleting order:", error);
       toast({ title: "Error", description: "No se pudo eliminar el pedido.", variant: "destructive" });
    } finally {
      setOrderToDelete(null);
    }
  };

  const accountsMap = React.useMemo(() => new Map(allAccounts.map(acc => [acc.id, acc])), [allAccounts]);
  const accountNameMap = React.useMemo(() => new Map(allAccounts.map(acc => [acc.nombre.toLowerCase().trim(), acc])), [allAccounts]);


  const cityOptions = React.useMemo(() => {
    const cities = new Set<string>();
    allAccounts.forEach(acc => {
        if (acc.addressShipping?.city) cities.add(acc.addressShipping.city);
        else if (acc.addressBilling?.city) cities.add(acc.addressBilling.city);
    });
    return ["Todos", ...Array.from(cities).sort()];
  }, [allAccounts]);
  
  const distributorAccounts = React.useMemo(() => {
    return allAccounts.filter(acc => acc.type === 'Distribuidor' || acc.type === 'Importador');
  }, [allAccounts]);

  const filteredOrders = React.useMemo(() => {
    let baseOrders = orders;
    
    return baseOrders.map(order => {
        const account = order.accountId 
            ? accountsMap.get(order.accountId) 
            : accountNameMap.get(order.clientName.toLowerCase().trim());

        const distributor = account?.distributorId ? accountsMap.get(account.distributorId) : undefined;
        return { 
            ...order, 
            account,
            distributorName: distributor?.nombre || "Venta Directa" 
        };
    }).filter(order => {
      const orderDate = order.visitDate ? parseISO(order.visitDate) : (order.createdAt ? parseISO(order.createdAt) : null);
      if (!orderDate || !isValid(orderDate)) return false;

      const matchesDate = dateRange?.from && dateRange.to ? (orderDate >= dateRange.from && orderDate <= addDays(dateRange.to, 1)) : true;
      const matchesSearch = searchTerm === "" || order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || order.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "Todos" || order.status === statusFilter;
      
      const accountCity = order.account?.addressShipping?.city || order.account?.addressBilling?.city;
      const matchesCity = cityFilter === "Todos" || (accountCity && accountCity === cityFilter);
      
      const distributorToFilter = distributorFilter === '##DIRECT##' ? undefined : distributorFilter;
      const matchesDistributor = distributorFilter === "Todos" || order.account?.distributorId === distributorToFilter;

      return matchesDate && matchesSearch && matchesStatus && matchesCity && matchesDistributor;
    });
  }, [orders, allAccounts, accountsMap, accountNameMap, searchTerm, statusFilter, dateRange, cityFilter, distributorFilter]);

  if (currentUserRole && !isAdmin && !isDistributor && currentUserRole !== 'SalesRep' && currentUserRole !== 'Clavadista' && currentUserRole !== 'Líder Clavadista') {
    return (
      <Card className="shadow-subtle">
        <CardHeader><CardTitle className="flex items-center">Acceso Denegado</CardTitle></CardHeader>
        <CardContent><p>No tienes permisos para acceder a esta sección.</p></CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
            <ShoppingCart className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-headline font-semibold">Panel de Pedidos de Colocación</h1>
        </div>
      </header>

      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Listado de Pedidos</CardTitle>
          <CardDescription>Aquí puedes ver y gestionar todos los pedidos generados por el equipo comercial y los clavadistas que deben ser gestionados por el distribuidor/importador.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <Input
              placeholder="Buscar por cliente o ID de pedido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <Popover>
                  <PopoverTrigger asChild>
                    <Button id="date" variant={"outline"} className="w-[300px] justify-start text-left font-normal">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Seleccione rango de fechas</span>
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
               <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" className="h-9"><Filter className="mr-2 h-4 w-4" />Estado: {statusFilter} <ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuCheckboxItem checked={statusFilter === 'Todos'} onCheckedChange={() => setStatusFilter('Todos')}>Todos</DropdownMenuCheckboxItem>
                        {orderStatusesList.map(s => <DropdownMenuCheckboxItem key={s} checked={statusFilter === s} onCheckedChange={() => setStatusFilter(s)}>{s}</DropdownMenuCheckboxItem>)}
                    </DropdownMenuContent>
                </DropdownMenu>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" className="h-9"><Filter className="mr-2 h-4 w-4" />Ciudad: {cityFilter} <ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                        {cityOptions.map(city => <DropdownMenuCheckboxItem key={city} checked={cityFilter === city} onCheckedChange={() => setCityFilter(city)}>{city}</DropdownMenuCheckboxItem>)}
                    </DropdownMenuContent>
                </DropdownMenu>
                {isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" className="h-9"><Filter className="mr-2 h-4 w-4" />Distribuidor: {distributorFilter === 'Todos' ? 'Todos' : distributorFilter === '##DIRECT##' ? 'Venta Directa' : distributorAccounts.find(d => d.id === distributorFilter)?.nombre || 'Todos'} <ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuCheckboxItem checked={distributorFilter === 'Todos'} onCheckedChange={() => setDistributorFilter('Todos')}>Todos</DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem onSelect={() => setDistributorFilter("##DIRECT##")}>Venta Directa</DropdownMenuCheckboxItem>
                        {distributorAccounts.map(d => <DropdownMenuCheckboxItem key={d.id} checked={distributorFilter === d.id} onCheckedChange={() => setDistributorFilter(d.id)}>{d.nombre}</DropdownMenuCheckboxItem>)}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
            </div>
          </div>
          {isLoading ? (
             <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4 text-muted-foreground">Cargando pedidos...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="table-header-std w-[10%]">Fecha Pedido</TableHead>
                    <TableHead className="table-header-std w-[15%]">Cliente</TableHead>
                    <TableHead className="table-header-std w-[15%]">Distribuidor</TableHead>
                    <TableHead className="table-header-std w-[15%]">Comercial</TableHead>
                    <TableHead className="table-header-std text-right w-[10%]">Valor Estimado</TableHead>
                    <TableHead className="table-header-std text-center w-[15%]">Estado</TableHead>
                    <TableHead className="table-header-std text-right w-[10%]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length > 0 ? filteredOrders.map(({ account, distributorName, ...order}) => (
                    <TableRow key={order.id}>
                        <TableCell className="table-cell-std">{order.visitDate ? format(parseISO(order.visitDate), "dd MMM, yyyy", { locale: es }) : "N/D"}</TableCell>
                        <TableCell className="table-cell-std table-cell-main-text">
                            {account ? (
                                <Link href={`/accounts/${account.id}`} className="hover:underline text-primary">{order.clientName}</Link>
                            ) : (
                                order.clientName
                            )}
                        </TableCell>
                         <TableCell className="table-cell-std text-xs">
                           <div className="flex items-center gap-1">
                             <Truck className="h-4 w-4 text-muted-foreground"/>
                             <span>{distributorName}</span>
                           </div>
                        </TableCell>
                         <TableCell className="table-cell-std text-xs">
                           <div className="flex items-center gap-1">
                             <UserIcon className="h-4 w-4 text-muted-foreground"/>
                             <span>{order.salesRep}</span>
                           </div>
                        </TableCell>
                        <TableCell className="table-cell-std text-right font-medium">
                            <FormattedNumericValue value={order.value} options={{style: 'currency', currency: 'EUR'}} placeholder="—" />
                        </TableCell>
                        <TableCell className="table-cell-std text-center"><StatusBadge type="order" status={order.status} /></TableCell>
                        <TableCell className="table-cell-std text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => handleEditClick(order)}><Eye className="mr-2 h-4 w-4" /> Ver / Editar Pedido</DropdownMenuItem>
                                {isAdmin && <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setOrderToDelete(order)}><Trash2 className="mr-2 h-4 w-4" /> Eliminar Pedido</DropdownMenuItem>
                                </>}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-24">
                        No se encontraron pedidos que coincidan con los filtros.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {!isLoading && filteredOrders.length > 0 && (
            <CardFooter>
                <p className="text-xs text-muted-foreground">Total de pedidos mostrados: {filteredOrders.length}</p>
            </CardFooter>
        )}
      </Card>
      
      {editingOrder && (
          <EditOrderDialog
            order={editingOrder}
            isOpen={isOrderDialogOpen}
            onOpenChange={setIsOrderDialogOpen}
            onSave={handleEditOrderSave}
            currentUserRole={currentUserRole!}
            allAccounts={allAccounts}
          />
      )}

      {orderToDelete && (
        <AlertDialog open={!!orderToDelete} onOpenChange={() => setOrderToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                    <AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará permanentemente el pedido para {orderToDelete.clientName}.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteOrder} variant="destructive">Sí, eliminar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

    </div>
  );
}
