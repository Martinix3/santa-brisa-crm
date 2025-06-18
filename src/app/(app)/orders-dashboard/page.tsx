
"use client";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { Order, OrderStatus, UserRole } from "@/types";
import { mockOrders, orderStatusesList, mockTeamMembers } from "@/lib/data";
import { kpiDataLaunch } from "@/lib/launch-dashboard-data";
import { MoreHorizontal, Eye, Edit, Trash2, Filter, CalendarDays, ChevronDown, Check } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays, parseISO } from "date-fns";
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import EditOrderDialog from "@/components/app/edit-order-dialog";
import type { EditOrderFormValues } from "@/components/app/edit-order-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import FormattedNumericValue from "@/components/lib/formatted-numeric-value";
import StatusBadge from "@/components/app/status-badge";


export default function OrdersDashboardPage() {
  const { toast } = useToast();
  const { userRole: currentUserRole } = useAuth();
  const [orders, setOrders] = React.useState<Order[]>(mockOrders);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<OrderStatus | "Todos">("Todos");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);

  const [editingOrder, setEditingOrder] = React.useState<Order | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [orderToDelete, setOrderToDelete] = React.useState<Order | null>(null);

  const uniqueStatuses = ["Todos", ...Array.from(new Set(mockOrders.map(order => order.status).filter(Boolean)))] as (OrderStatus | "Todos")[];


  const filteredOrders = orders
    .filter(order =>
      (order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
       order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
       order.salesRep.toLowerCase().includes(searchTerm.toLowerCase())) // Keep salesRep for search
    )
    .filter(order => statusFilter === "Todos" || order.status === statusFilter)
    .filter(order => {
      if (!dateRange?.from) return true; // No date filter if 'from' is not set
      const orderDate = parseISO(order.visitDate); 
      const fromDate = dateRange.from;
      // If 'to' is not set, filter up to a very distant future date (effectively no upper bound for 'from' only range)
      const toDate = dateRange.to ? addDays(dateRange.to, 1) : new Date(8640000000000000) ; 
      return orderDate >= fromDate && orderDate < toDate;
    });

  const handleViewOrEditClick = (order: Order) => {
    setEditingOrder(order);
    setIsEditDialogOpen(true);
  };

  const handleUpdateOrder = (updatedData: EditOrderFormValues, orderId: string) => {
    const orderIndex = mockOrders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) {
      toast({ title: "Error", description: "No se pudo encontrar el pedido para actualizar.", variant: "destructive" });
      return;
    }

    const originalOrder = { ...mockOrders[orderIndex] }; 
    const updatedOrderDataInMock: Order = {
      ...originalOrder,
      clientName: updatedData.clientName,
      products: updatedData.products ? updatedData.products.split(/[,;\n]+/).map(p => p.trim()).filter(p => p.length > 0) : originalOrder.products,
      value: updatedData.value !== undefined ? updatedData.value : originalOrder.value,
      status: updatedData.status,
      salesRep: updatedData.salesRep,
      lastUpdated: format(new Date(), "yyyy-MM-dd"),
      clientType: updatedData.clientType || originalOrder.clientType,
      numberOfUnits: updatedData.numberOfUnits !== undefined ? updatedData.numberOfUnits : originalOrder.numberOfUnits,
      unitPrice: updatedData.unitPrice !== undefined ? updatedData.unitPrice : originalOrder.unitPrice,
      nombreFiscal: updatedData.nombreFiscal || originalOrder.nombreFiscal,
      cif: updatedData.cif || originalOrder.cif,
      direccionFiscal: updatedData.direccionFiscal || originalOrder.direccionFiscal,
      direccionEntrega: updatedData.direccionEntrega || originalOrder.direccionEntrega,
      contactoNombre: updatedData.contactoNombre || originalOrder.contactoNombre,
      contactoCorreo: updatedData.contactoCorreo || originalOrder.contactoCorreo,
      contactoTelefono: updatedData.contactoTelefono || originalOrder.contactoTelefono,
      observacionesAlta: updatedData.observacionesAlta || originalOrder.observacionesAlta,
      notes: updatedData.notes || originalOrder.notes,
      nextActionType: updatedData.nextActionType || originalOrder.nextActionType,
      nextActionCustom: updatedData.nextActionCustom || originalOrder.nextActionCustom,
      nextActionDate: updatedData.nextActionDate ? format(updatedData.nextActionDate, "yyyy-MM-dd", {locale: es}) : originalOrder.nextActionDate,
      failureReasonType: updatedData.failureReasonType || originalOrder.failureReasonType,
      failureReasonCustom: updatedData.failureReasonCustom || originalOrder.failureReasonCustom,
    };
    
    const contributesToMetrics = (status: OrderStatus) => ['Confirmado', 'Procesando', 'Enviado', 'Entregado'].includes(status);
    
    const originalOrderContributed = contributesToMetrics(originalOrder.status);
    const updatedOrderContributed = contributesToMetrics(updatedOrderDataInMock.status);

    const originalUnits = originalOrder.numberOfUnits || 0;
    const updatedUnits = updatedOrderDataInMock.numberOfUnits || 0;

    // 1. Adjust KPIs globales
    const kpiVentasTotales = kpiDataLaunch.find(k => k.id === 'kpi1');
    const kpiVentasEquipo = kpiDataLaunch.find(k => k.id === 'kpi2');

    if (kpiVentasTotales) {
      if (originalOrderContributed) kpiVentasTotales.currentValue -= originalUnits;
      if (updatedOrderContributed) kpiVentasTotales.currentValue += updatedUnits;
    }
    if (kpiVentasEquipo) {
       if (originalOrderContributed) kpiVentasEquipo.currentValue -= originalUnits;
       if (updatedOrderContributed) kpiVentasEquipo.currentValue += updatedUnits;
    }
    
    // 2. Adjust mockTeamMembers for sales rep changes or contribution changes
    const originalSalesRepMember = mockTeamMembers.find(m => m.name === originalOrder.salesRep && (m.role === 'SalesRep' || m.role === 'Admin'));
    if (originalSalesRepMember) {
        if (originalOrderContributed && originalOrder.salesRep !== updatedOrderDataInMock.salesRep) { // If rep changed
            originalSalesRepMember.bottlesSold = (originalSalesRepMember.bottlesSold || 0) - originalUnits;
            originalSalesRepMember.orders = (originalSalesRepMember.orders || 0) - 1;
        } else if (originalOrderContributed && !updatedOrderContributed) { // If rep same, but status no longer contributes
            originalSalesRepMember.bottlesSold = (originalSalesRepMember.bottlesSold || 0) - originalUnits;
            originalSalesRepMember.orders = (originalSalesRepMember.orders || 0) - 1;
        } else if (!originalOrderContributed && updatedOrderContributed && originalOrder.salesRep === updatedOrderDataInMock.salesRep) { // If rep same, but status NOW contributes
             // This case is handled by the new sales rep logic below if rep is same.
        } else if (originalOrderContributed && updatedOrderContributed && originalOrder.salesRep === updatedOrderDataInMock.salesRep && originalUnits !== updatedUnits) { // rep same, status same, units changed
            originalSalesRepMember.bottlesSold = (originalSalesRepMember.bottlesSold || 0) - originalUnits + updatedUnits;
        }
    }

    const newSalesRepMember = mockTeamMembers.find(m => m.name === updatedOrderDataInMock.salesRep && (m.role === 'SalesRep' || m.role === 'Admin'));
    if (newSalesRepMember) {
        if (updatedOrderContributed && originalOrder.salesRep !== updatedOrderDataInMock.salesRep) { // If rep changed and new status contributes
            newSalesRepMember.bottlesSold = (newSalesRepMember.bottlesSold || 0) + updatedUnits;
            newSalesRepMember.orders = (newSalesRepMember.orders || 0) + 1;
        } else if (updatedOrderContributed && !originalOrderContributed && originalOrder.salesRep === updatedOrderDataInMock.salesRep) { // rep same, but status NOW contributes
            newSalesRepMember.bottlesSold = (newSalesRepMember.bottlesSold || 0) + updatedUnits;
            newSalesRepMember.orders = (newSalesRepMember.orders || 0) + 1;
        }
    }
        
    mockOrders[orderIndex] = updatedOrderDataInMock;
    setOrders([...mockOrders]); 
    
    if (isEditDialogOpen) setIsEditDialogOpen(false);
    setEditingOrder(null);

    toast({
      title: "¡Pedido Actualizado!",
      description: (
        <div className="flex items-start">
          <Check className="h-5 w-5 text-green-500 mr-2 mt-1" />
          <p>Pedido {updatedOrderDataInMock.id} actualizado exitosamente.</p>
        </div>
      ),
      variant: "default",
    });
  };
  
  const handleDeleteOrder = (order: Order) => {
    if (!canDeleteOrder) return;
    setOrderToDelete(order);
  };

  const confirmDeleteOrder = () => {
    if (!canDeleteOrder || !orderToDelete) return;
    
    const orderBeingDeleted = { ...orderToDelete }; 
    const orderContributed = ['Confirmado', 'Procesando', 'Enviado', 'Entregado'].includes(orderBeingDeleted.status);

    if (orderContributed) {
        const unitsToDelete = orderBeingDeleted.numberOfUnits || 0;

        const kpiVentasTotales = kpiDataLaunch.find(k => k.id === 'kpi1');
        if (kpiVentasTotales) kpiVentasTotales.currentValue -= unitsToDelete;
        
        const kpiVentasEquipo = kpiDataLaunch.find(k => k.id === 'kpi2');
        if (kpiVentasEquipo) kpiVentasEquipo.currentValue -= unitsToDelete;

        const salesRepMember = mockTeamMembers.find(m => m.name === orderBeingDeleted.salesRep && (m.role === 'SalesRep' || m.role === 'Admin'));
        if (salesRepMember) {
            salesRepMember.bottlesSold = (salesRepMember.bottlesSold || 0) - unitsToDelete;
            salesRepMember.orders = (salesRepMember.orders || 0) - 1;
        }
    }

    const updatedOrdersState = orders.filter(o => o.id !== orderToDelete.id);
    setOrders(updatedOrdersState);

    const mockIndex = mockOrders.findIndex(o => o.id === orderToDelete.id);
    if (mockIndex !== -1) {
      mockOrders.splice(mockIndex, 1);
    }
    toast({ 
      title: "¡Pedido Eliminado!", 
      description: `El pedido "${orderToDelete.id}" ha sido eliminado. Las métricas asociadas han sido ajustadas.`, 
      variant: "destructive" 
    });
    setOrderToDelete(null);
  };

  const handleChangeOrderStatus = (order: Order, newStatus: OrderStatus) => {
     if (!canEditOrderStatus) {
        toast({ title: "Permiso Denegado", description: "No tienes permiso para cambiar el estado del pedido.", variant: "destructive" });
        return;
    }
    const updatedFormValues: EditOrderFormValues = {
        clientName: order.clientName,
        products: order.products?.join(", "),
        value: order.value,
        status: newStatus,
        salesRep: order.salesRep,
        clientType: order.clientType,
        numberOfUnits: order.numberOfUnits,
        unitPrice: order.unitPrice,
        nombreFiscal: order.nombreFiscal,
        cif: order.cif,
        direccionFiscal: order.direccionFiscal,
        direccionEntrega: order.direccionEntrega,
        contactoNombre: order.contactoNombre,
        contactoCorreo: order.contactoCorreo,
        contactoTelefono: order.contactoTelefono,
        observacionesAlta: order.observacionesAlta,
        notes: order.notes,
        nextActionType: order.nextActionType,
        nextActionCustom: order.nextActionCustom,
        nextActionDate: order.nextActionDate ? parseISO(order.nextActionDate) : undefined,
        failureReasonType: order.failureReasonType,
        failureReasonCustom: order.failureReasonCustom,
    };
    handleUpdateOrder(updatedFormValues, order.id);
  }


  const canEditOrderDetails = currentUserRole === 'Admin';
  const canEditOrderStatus = currentUserRole === 'Admin' || currentUserRole === 'Distributor';
  const canDeleteOrder = currentUserRole === 'Admin';


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-semibold">Panel de Pedidos</h1>

      <Card className="shadow-subtle hover:shadow-md transition-shadow duration-300">
        <CardHeader>
          <CardTitle>Gestionar Pedidos</CardTitle>
          <CardDescription>Ver, filtrar y gestionar todos los pedidos de clientes registrados.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <Input
              placeholder="Buscar pedidos (ID, Cliente, Rep)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
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
                {uniqueStatuses.map(status => (
                   <DropdownMenuCheckboxItem
                    key={status}
                    checked={statusFilter === status}
                    onCheckedChange={() => setStatusFilter(status)}
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
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Nº Botellas</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order: Order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>{order.clientName}</TableCell>
                    <TableCell>{order.visitDate ? format(parseISO(order.visitDate), "MMM dd, yyyy", { locale: es }) : "N/D"}</TableCell>
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
                              {orderStatusesList.map((statusVal) => (
                                <DropdownMenuRadioItem key={statusVal} value={statusVal} disabled={!orderStatusesList.includes(statusVal as OrderStatus)}>
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
                          {(canEditOrderDetails || canEditOrderStatus) && ( // Admin can edit all, Distributor only status (handled in dialog)
                            <DropdownMenuItem onSelect={() => handleViewOrEditClick(order)}>
                              <Edit className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                          )}
                          {canDeleteOrder && (
                            <>
                              <DropdownMenuSeparator />
                               <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem 
                                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                    onSelect={(e) => { e.preventDefault(); handleDeleteOrder(order); }}
                                    >
                                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar Pedido
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                {orderToDelete && orderToDelete.id === order.id && (
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta acción no se puede deshacer. Esto eliminará permanentemente el pedido:
                                            <br />
                                            <strong className="mt-2 block">{orderToDelete.id} - {orderToDelete.clientName}</strong>
                                            <br/> <br/>
                                            Las métricas asociadas a este pedido (KPIs, rendimiento del comercial) serán ajustadas.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel onClick={() => setOrderToDelete(null)}>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={confirmDeleteOrder} variant="destructive">Sí, eliminar</AlertDialogAction>
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
                ))}
                 {filteredOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No se encontraron pedidos. Intente ajustar sus filtros.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {editingOrder && currentUserRole && (
        <EditOrderDialog
          order={editingOrder}
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSave={handleUpdateOrder}
          currentUserRole={currentUserRole}
        />
      )}
    </div>
  );
}

