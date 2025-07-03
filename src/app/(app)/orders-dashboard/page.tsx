
"use client";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox"; 
import type { Order, OrderStatus, UserRole, TeamMember, AddressDetails, Account } from "@/types";
import { orderStatusesList } from "@/lib/data"; 
import { MoreHorizontal, Eye, Edit, Trash2, Filter, CalendarDays, ChevronDown, Download, ShoppingCart, Loader2, MapPin, User as UserIcon, XCircle } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays, parseISO, isValid } from "date-fns";
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import EditOrderDialog from "@/components/app/edit-order-dialog";
import type { EditOrderFormValues } from "@/components/app/edit-order-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import StatusBadge from "@/components/app/status-badge";
import { getOrdersFS, updateOrderFS, deleteOrderFS, initializeMockOrdersInFirestore } from "@/services/order-service";
import { getAccountByIdFS, updateAccountFS as updateAccountInFirestore, getAccountsFS } from "@/services/account-service";
import { getTeamMembersFS } from "@/services/team-member-service";
import Link from "next/link";


export default function OrdersDashboardPage() {
  const { toast } = useToast();
  const { userRole: currentUserRole, refreshDataSignature } = useAuth();
  
  const [allOrders, setAllOrders] = React.useState<Order[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [allTeamMembers, setAllTeamMembers] = React.useState<TeamMember[]>([]);
  const [allAccounts, setAllAccounts] = React.useState<Account[]>([]);

  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<OrderStatus | "Todos">("Todos");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const [cityFilter, setCityFilter] = React.useState("");
  const [selectedOrderIds, setSelectedOrderIds] = React.useState<string[]>([]);

  const [editingOrder, setEditingOrder] = React.useState<Order | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [orderToModify, setOrderToModify] = React.useState<Order | null>(null);

  React.useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      try {
        const [firestoreOrders, firestoreAccounts] = await Promise.all([
          getOrdersFS(),
          getAccountsFS()
        ]);
        
        // This is the core logic fix: Define which statuses are tasks and exclude them.
        const taskStatuses: OrderStatus[] = ['Programada', 'Seguimiento', 'Fallido', 'Completado'];
        setAllOrders(firestoreOrders.filter(order => !taskStatuses.includes(order.status)));
        
        setAllAccounts(firestoreAccounts);

        if (currentUserRole === 'Admin') {
          const members = await getTeamMembersFS(['SalesRep', 'Admin']);
          setAllTeamMembers(members);
        }

      } catch (error) {
        console.error("Error fetching orders or team members:", error);
        toast({ title: "Error al Cargar Datos", description: "No se pudieron cargar los pedidos o miembros del equipo.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, [toast, refreshDataSignature, currentUserRole]);


  const uniqueStatusesForFilter = ["Todos", ...orderStatusesList.filter(s => !['Programada', 'Seguimiento', 'Fallido', 'Completado'].includes(s))] as (OrderStatus | "Todos")[];

  const accountsMapById = React.useMemo(() => new Map(allAccounts.map(acc => [acc.id, acc])), [allAccounts]);
  const accountsMapByName = React.useMemo(() => {
    const map = new Map<string, Account>();
    allAccounts.forEach(acc => {
      if (acc.nombre && !map.has(acc.nombre.toLowerCase().trim())) {
        map.set(acc.nombre.toLowerCase().trim(), acc);
      }
    });
    return map;
  }, [allAccounts]);

  const filteredOrders = React.useMemo(() => {
    return allOrders
    .filter(order =>
      (order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
       (order.salesRep && order.salesRep.toLowerCase().includes(searchTerm.toLowerCase())))
    )
    .filter(order => statusFilter === "Todos" || order.status === statusFilter)
    .filter(order => {
      if (!dateRange?.from) return true; 
      const orderDate = parseISO(order.visitDate); 
      if(!isValid(orderDate)) return false;
      const fromDate = dateRange.from;
      const toDate = dateRange.to ? addDays(dateRange.to, 1) : new Date(8640000000000000) ; 
      return orderDate >= fromDate && orderDate < toDate;
    })
    .filter(order => {
      if (!cityFilter) return true;
      const account = order.accountId ? accountsMapById.get(order.accountId) : accountsMapByName.get(order.clientName.toLowerCase().trim());
      if (!account) return false;
      
      const cityLower = cityFilter.toLowerCase();
      const deliveryAddress = account.addressShipping;
      const billingAddress = account.addressBilling;

      const deliveryProvince = deliveryAddress?.province?.toLowerCase();
      const deliveryCity = deliveryAddress?.city?.toLowerCase();
      const billingProvince = billingAddress?.province?.toLowerCase();
      const billingCity = billingAddress?.city?.toLowerCase();

      return (deliveryProvince && deliveryProvince.includes(cityLower)) ||
             (deliveryCity && deliveryCity.includes(cityLower)) ||
             (billingProvince && billingProvince.includes(cityLower)) || 
             (billingCity && billingCity.includes(cityLower));
    });
  }, [allOrders, accountsMapById, accountsMapByName, searchTerm, statusFilter, dateRange, cityFilter]);

  const handleViewOrEditClick = (order: Order) => {
    setEditingOrder(order);
    setIsEditDialogOpen(true);
  };

  const handleUpdateOrder = async (updatedData: EditOrderFormValues, orderId: string) => {
    setIsLoading(true);
    try {
      const orderToUpdate = allOrders.find(o => o.id === orderId);
      if (!orderToUpdate) {
        toast({ title: "Error", description: "Pedido no encontrado.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const isAdmin = currentUserRole === 'Admin';
      const isDistributor = currentUserRole === 'Distributor';
      const canEditFullOrderDetails = isAdmin;
      const canEditStatusAndNotes = isAdmin || isDistributor;

      const fullUpdatedOrderData: Partial<Order> = {
        clientName: canEditFullOrderDetails && updatedData.clientName ? updatedData.clientName : orderToUpdate.clientName,
        products: canEditFullOrderDetails && updatedData.products ? updatedData.products.split(/[,;\n]+/).map(p => p.trim()).filter(p => p.length > 0) : orderToUpdate.products,
        value: canEditFullOrderDetails && updatedData.value !== undefined ? updatedData.value : orderToUpdate.value,
        salesRep: canEditFullOrderDetails && updatedData.salesRep ? updatedData.salesRep : orderToUpdate.salesRep,
        clavadistaId: canEditFullOrderDetails ? (updatedData.clavadistaId === '##NONE##' ? null : updatedData.clavadistaId) : orderToUpdate.clavadistaId,
        paymentMethod: canEditFullOrderDetails ? updatedData.paymentMethod : orderToUpdate.paymentMethod,
        invoiceUrl: canEditFullOrderDetails ? updatedData.invoiceUrl : orderToUpdate.invoiceUrl,
        invoiceFileName: canEditFullOrderDetails ? updatedData.invoiceFileName : orderToUpdate.invoiceFileName,
        assignedMaterials: canEditFullOrderDetails ? updatedData.assignedMaterials : orderToUpdate.assignedMaterials,
        clientType: canEditFullOrderDetails ? updatedData.clientType : orderToUpdate.clientType,
        numberOfUnits: canEditFullOrderDetails && updatedData.numberOfUnits !== undefined ? updatedData.numberOfUnits : orderToUpdate.numberOfUnits,
        unitPrice: canEditFullOrderDetails && updatedData.unitPrice !== undefined ? updatedData.unitPrice : orderToUpdate.unitPrice,
        
        status: canEditStatusAndNotes ? updatedData.status : orderToUpdate.status,
        notes: canEditStatusAndNotes ? updatedData.notes : orderToUpdate.notes,
        
        lastUpdated: format(new Date(), "yyyy-MM-dd"), 
        accountId: orderToUpdate.accountId, 
        visitDate: orderToUpdate.visitDate, 
        createdAt: orderToUpdate.createdAt, 
        clientStatus: orderToUpdate.clientStatus,
        nextActionType: orderToUpdate.nextActionType,
        nextActionCustom: orderToUpdate.nextActionCustom,
        nextActionDate: orderToUpdate.nextActionDate,
        failureReasonType: orderToUpdate.failureReasonType,
        failureReasonCustom: orderToUpdate.failureReasonCustom,
        canalOrigenColocacion: canEditFullOrderDetails ? updatedData.canalOrigenColocacion : orderToUpdate.canalOrigenColocacion,
      };
      
      await updateOrderFS(orderId, fullUpdatedOrderData as Order); 
      
      setAllOrders(prevOrders => prevOrders.map(o => o.id === orderId ? { ...o, ...fullUpdatedOrderData } as Order : o));
      
      toast({ title: "¡Pedido Actualizado!", description: `Pedido ${orderId} actualizado exitosamente.`, variant: "default"});
      
      if (isAdmin && orderToUpdate.accountId && fullUpdatedOrderData.salesRep && fullUpdatedOrderData.salesRep !== orderToUpdate.salesRep) {
        const newSalesRepName = fullUpdatedOrderData.salesRep;
        const newSalesRepMember = allTeamMembers.find(m => m.name === newSalesRepName);

        if (newSalesRepMember && newSalesRepMember.role === 'SalesRep') {
          const accountToUpdate = await getAccountByIdFS(orderToUpdate.accountId);
          if (accountToUpdate && accountToUpdate.salesRepId !== newSalesRepMember.id) {
            try {
              await updateAccountInFirestore(orderToUpdate.accountId, { salesRepId: newSalesRepMember.id });
              toast({ title: "Cuenta Actualizada", description: `Comercial de la cuenta ${accountToUpdate.name} actualizado a ${newSalesRepMember.name}.`, variant: "default" });
            } catch (accountUpdateError) {
              console.error("Error updating account's salesRepId:", accountUpdateError);
              toast({ title: "Error al Actualizar Cuenta", description: "No se pudo actualizar el comercial de la cuenta asociada.", variant: "destructive" });
            }
          }
        } else if (newSalesRepMember && newSalesRepMember.role !== 'SalesRep') {
           console.log(`El nuevo comercial ${newSalesRepMember.name} no es SalesRep. No se actualiza el comercial de la cuenta ${orderToUpdate.accountId}.`);
        }
      }
      refreshDataSignature();

    } catch (error) {
      console.error("Error updating order:", error);
      toast({ title: "Error al Actualizar", description: "No se pudo actualizar el pedido en Firestore.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      if (isEditDialogOpen) setIsEditDialogOpen(false);
      setEditingOrder(null);
    }
  };
  
  const handleCancelOrderClick = (order: Order) => {
    if (!canCancelOrder) return;
    setOrderToModify(order);
  };

  const confirmCancelOrder = async () => {
    if (!canCancelOrder || !orderToModify) return;
    setIsLoading(true);
    try {
      await updateOrderFS(orderToModify.id, { status: 'Cancelado' });
      toast({ title: "¡Pedido Cancelado!", description: `El pedido "${orderToModify.id}" ha sido cancelado.`, variant: "default" });
      refreshDataSignature();
    } catch (error) {
      console.error("Error canceling order:", error);
      toast({ title: "Error al Cancelar", description: "No se pudo cancelar el pedido.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setOrderToModify(null);
    }
  };

  const handleChangeOrderStatus = async (order: Order, newStatus: OrderStatus) => {
     if (!canEditOrderStatus) {
        toast({ title: "Permiso Denegado", description: "No tienes permiso para cambiar el estado del pedido.", variant: "destructive" });
        return;
    }
    setIsLoading(true);
    try {
        const updatePayload: Partial<Order> = { status: newStatus, lastUpdated: format(new Date(), "yyyy-MM-dd") };
        await updateOrderFS(order.id, updatePayload);
        setAllOrders(prevOrders => prevOrders.map(o => o.id === order.id ? { ...o, ...updatePayload } as Order : o));
        toast({ title: "Estado Actualizado", description: `El estado del pedido ${order.id} es ahora ${newStatus}.` });
        refreshDataSignature();
    } catch (error) {
        console.error("Error updating order status:", error);
        toast({ title: "Error al Cambiar Estado", description: "No se pudo actualizar el estado del pedido.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }

  const handleSelectAllChange = (checked: boolean | 'indeterminate') => {
    if (checked === true) { 
      setSelectedOrderIds(filteredOrders.map(order => order.id));
    } else { 
      setSelectedOrderIds([]);
    }
  };

  const handleRowSelectChange = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(prev => [...prev, orderId]);
    } else {
      setSelectedOrderIds(prev => prev.filter(id => id !== orderId));
    }
  };
  
  const headerCheckboxState: boolean | 'indeterminate' = React.useMemo(() => {
    if (filteredOrders.length === 0) return false;
    const isAllFilteredSelected = selectedOrderIds.length === filteredOrders.length && filteredOrders.every(fo => selectedOrderIds.includes(fo.id));
    if (isAllFilteredSelected) return true;
    const isSomeFilteredSelected = selectedOrderIds.length > 0 && !isAllFilteredSelected && filteredOrders.some(fo => selectedOrderIds.includes(fo.id));
    if (isSomeFilteredSelected) return 'indeterminate' as const;
    return false;
  }, [selectedOrderIds, filteredOrders]);


  const escapeCsvCell = (cellData: any): string => {
    if (cellData === null || cellData === undefined) {
      return "";
    }
    const stringData = String(cellData);
    if (stringData.includes(',') || stringData.includes('\n') || stringData.includes('"')) {
      return `"${stringData.replace(/"/g, '""')}"`;
    }
    return stringData;
  };

  const formatAddressDetails = (address?: AddressDetails) => {
    if (!address) return "";
    return `${address.street || ''}${address.number ? `, ${address.number}` : ''}, ${address.city || ''}, ${address.province || ''}, ${address.postalCode || ''}${address.country ? `, ${address.country}` : ''}`;
  };
  
  const handleDownloadCsv = () => {
    if (selectedOrderIds.length === 0) {
      toast({ title: "No hay pedidos seleccionados", description: "Por favor, seleccione al menos un pedido para descargar.", variant: "destructive" });
      return;
    }
  
    const accountsMap = new Map(allAccounts.map(acc => [acc.id, acc]));
    const ordersToExport = allOrders.filter(order => selectedOrderIds.includes(order.id));
  
    const headers = [
      "ID Pedido", "Fecha Pedido", "Cliente", "Nombre Fiscal", "CIF",
      "Dirección Entrega", "Dirección Fiscal", "Contacto Nombre", "Contacto Email", "Contacto Teléfono",
      "Tipo Cliente", "Productos (Lista)", "Nº Unidades", "Precio Unitario (€ sin IVA)",
      "Valor Total Pedido (€ IVA incl.)", "Estado Pedido", "Forma de Pago", "URL Factura", "Nombre Archivo Factura", 
      "Comercial Asignado", "Notas Pedido"
    ];
  
    const csvRows = [
      headers.join(','),
      ...ordersToExport.map(order => {
        const account = order.accountId ? accountsMap.get(order.accountId) : null;
        return [
          escapeCsvCell(order.id),
          escapeCsvCell(order.visitDate ? format(parseISO(order.visitDate), "dd/MM/yyyy") : ''),
          escapeCsvCell(order.clientName),
          escapeCsvCell(account?.legalName),
          escapeCsvCell(account?.cif),
          escapeCsvCell(formatAddressDetails(account?.addressShipping)),
          escapeCsvCell(formatAddressDetails(account?.addressBilling)),
          escapeCsvCell(account?.mainContactName),
          escapeCsvCell(account?.mainContactEmail),
          escapeCsvCell(account?.mainContactPhone),
          escapeCsvCell(order.clientType),
          escapeCsvCell(order.products?.join('; ')), 
          escapeCsvCell(order.numberOfUnits),
          escapeCsvCell(order.unitPrice), 
          escapeCsvCell(order.value), 
          escapeCsvCell(order.status),
          escapeCsvCell(order.paymentMethod),
          escapeCsvCell(order.invoiceUrl),
          escapeCsvCell(order.invoiceFileName),
          escapeCsvCell(order.salesRep),
          escapeCsvCell(order.notes)
        ].join(',')
      })
    ];
  
    const csvString = csvRows.join('\n');
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' }); 
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `pedidos_santabrisa_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    toast({ title: "Descarga Iniciada", description: `${ordersToExport.length} pedidos se están descargando como CSV.` });
    setSelectedOrderIds([]); 
  };


  const canEditOrderDetails = currentUserRole === 'Admin';
  const canEditOrderStatus = currentUserRole === 'Admin' || currentUserRole === 'Distributor';
  const canCancelOrder = currentUserRole === 'Admin';
  const canDownloadCsv = currentUserRole === 'Admin' || currentUserRole === 'Distributor';

  return (
    <div className="space-y-6">
      <header className="flex items-center space-x-2">
        <ShoppingCart className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-headline font-semibold">Gestión Integral de Pedidos</h1>
      </header>

      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Gestionar Pedidos</CardTitle>
          <CardDescription>Visualiza, filtra y administra todos los pedidos de clientes. Los administradores y distribuidores pueden cambiar estados y descargar información relevante.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <Input
              placeholder="Buscar pedidos (Cliente, Rep)..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:max-w-xs"
            />
            <Input
              placeholder="Filtrar por ciudad/provincia..."
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full sm:max-w-xs"
            />
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  <Filter className="mr-2 h-4 w-4" />
                  Estado: {statusFilter} <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuCheckboxItem
                    key="Todos"
                    checked={statusFilter === "Todos"}
                    onCheckedChange={() => setStatusFilter("Todos")}
                  >
                    Todos
                  </DropdownMenuCheckboxItem>
                {uniqueStatusesForFilter.filter(s => s !== "Todos").map(status => (
                   <DropdownMenuCheckboxItem
                    key={status}
                    checked={statusFilter === status}
                    onCheckedChange={() => setStatusFilter(status as OrderStatus)}
                  >
                    {status}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full sm:w-auto justify-start text-left font-normal",
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
                    <span>Seleccione un rango de fechas</span>
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
            {canDownloadCsv && (
              <Button 
                onClick={handleDownloadCsv} 
                disabled={selectedOrderIds.length === 0 || isLoading}
                className="w-full sm:w-auto"
              >
                <Download className="mr-2 h-4 w-4" />
                Descargar CSV ({selectedOrderIds.length})
              </Button>
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
                    {canDownloadCsv && (
                      <TableHead className="w-[5%] px-2">
                        <Checkbox
                          checked={headerCheckboxState}
                          onCheckedChange={(checkedState) => handleSelectAllChange(checkedState)}
                          aria-label="Seleccionar todos los pedidos filtrados"
                        />
                      </TableHead>
                    )}
                    <TableHead className="w-[20%]">Cliente</TableHead>
                    <TableHead className="w-[10%]">Fecha</TableHead>
                    <TableHead className="w-[15%]">Ubicación (Prov/Ciudad)</TableHead>
                    <TableHead className="w-[15%]">Comercial Asignado</TableHead>
                    <TableHead className="text-right w-[10%]">Nº Bot.</TableHead>
                    <TableHead className="text-right w-[10%]">Valor</TableHead>
                    <TableHead className="text-center w-[10%]">Estado</TableHead>
                    <TableHead className="text-right w-[10%]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length > 0 ? filteredOrders.map((order: Order) => {
                    const account = order.accountId ? accountsMapById.get(order.accountId) : accountsMapByName.get(order.clientName.toLowerCase().trim());
                    const locationDisplay = account?.addressShipping?.city || account?.addressBilling?.city || 'N/D';
                    
                    return (
                    <TableRow 
                      key={order.id}
                      data-state={selectedOrderIds.includes(order.id) ? "selected" : ""}
                    >
                      {canDownloadCsv && (
                          <TableCell className="px-2">
                            <Checkbox
                              checked={selectedOrderIds.includes(order.id)}
                              onCheckedChange={(checked) => handleRowSelectChange(order.id, Boolean(checked))}
                              aria-label={`Seleccionar pedido ${order.id}`}
                            />
                          </TableCell>
                        )}
                      <TableCell className="font-medium">
                        {account ? (
                            <Link href={`/accounts/${account.id}`} className="hover:underline text-primary">
                                {order.clientName}
                            </Link>
                        ) : (
                            order.clientName
                        )}
                      </TableCell>
                      <TableCell>{order.visitDate ? format(parseISO(order.visitDate), "dd/MM/yy", { locale: es }) : "N/D"}</TableCell>
                      <TableCell className="text-xs truncate max-w-[150px]" title={locationDisplay}>
                         <MapPin className="inline-block h-3 w-3 mr-1 text-muted-foreground" />
                         {locationDisplay}
                      </TableCell>
                      <TableCell>
                        <UserIcon className="inline-block h-3 w-3 mr-1 text-muted-foreground" />
                        {order.salesRep || 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <FormattedNumericValue value={order.numberOfUnits} locale="es-ES" placeholder="N/D" />
                      </TableCell>
                      <TableCell className="text-right">
                        <FormattedNumericValue value={order.value} locale="es-ES" options={{ style: 'currency', currency: 'EUR' }} placeholder="—" />
                      </TableCell>
                      <TableCell className="text-center">
                        {canEditOrderStatus ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="p-0 h-auto">
                                <StatusBadge type="order" status={order.status} className="cursor-pointer" />
                                <ChevronDown className="ml-1 h-3 w-3 opacity-70" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuRadioGroup 
                                  value={order.status} 
                                  onValueChange={(newStatus) => handleChangeOrderStatus(order, newStatus as OrderStatus)}
                              >
                                {orderStatusesList.filter(s => !['Programada', 'Seguimiento', 'Fallido', 'Completado'].includes(s)).map((statusVal) => (
                                  <DropdownMenuRadioItem key={statusVal} value={statusVal}>
                                    {statusVal}
                                  </DropdownMenuRadioItem>
                                ))}
                              </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <StatusBadge type="order" status={order.status} />
                        )}
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
                            <DropdownMenuItem onSelect={() => handleViewOrEditClick(order)}>
                              <Eye className="mr-2 h-4 w-4" /> Ver Detalles
                            </DropdownMenuItem>
                            {(canEditOrderDetails || canEditOrderStatus) && ( 
                              <DropdownMenuItem onSelect={() => handleViewOrEditClick(order)} disabled={!canEditOrderDetails && !canEditOrderStatus}>
                                <Edit className="mr-2 h-4 w-4" /> Editar
                              </DropdownMenuItem>
                            )}
                            {canCancelOrder && (
                              <>
                                <DropdownMenuSeparator />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem 
                                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                      onSelect={(e) => { e.preventDefault(); handleCancelOrderClick(order); }}
                                      disabled={!canCancelOrder || order.status === 'Cancelado'}
                                      >
                                      <XCircle className="mr-2 h-4 w-4" /> Cancelar Pedido
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  {orderToModify && orderToModify.id === order.id && (
                                      <AlertDialogContent>
                                          <AlertDialogHeader>
                                          <AlertDialogTitle>¿Cancelar este pedido?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                              Esta acción no se puede deshacer. El estado del pedido para 
                                              <strong className="mx-1">"{orderToModify.clientName}"</strong> 
                                              se cambiará a "Cancelado". El registro no se eliminará del historial.
                                          </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                          <AlertDialogCancel onClick={() => setOrderToModify(null)}>Cerrar</AlertDialogCancel>
                                          <AlertDialogAction onClick={confirmCancelOrder} variant="destructive">Sí, cancelar pedido</AlertDialogAction>
                                          </AlertDialogFooter>
                                      </AlertDialogContent>
                                  )}
                                </AlertDialog>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );}) : (
                    <TableRow>
                      <TableCell colSpan={canDownloadCsv ? 9 : 8} className="h-24 text-center">
                        No se encontraron pedidos que coincidan con los filtros seleccionados.
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
                <p className="text-xs text-muted-foreground">Mostrando {filteredOrders.length} pedidos de {allOrders.length} que cumplen los criterios.</p>
            </CardFooter>
        )}
      </Card>
      {editingOrder && currentUserRole && (
        <EditOrderDialog
          order={editingOrder}
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSave={handleUpdateOrder}
          currentUserRole={currentUserRole}
          allAccounts={allAccounts}
        />
      )}
    </div>
  );
}
